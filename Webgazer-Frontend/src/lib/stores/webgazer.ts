import { writable } from 'svelte/store';

declare global {
	interface Window {
		webgazer: any;
	}
}

export interface GazePoint {
	x: number;
	y: number;
}

export interface WebGazerState {
	instance: any | null;
	isInitialized: boolean;
	isActive: boolean;
	currentGaze: GazePoint | null;
	hasGaze: boolean;
}

const initialState: WebGazerState = {
	instance: null,
	isInitialized: false,
	isActive: false,
	currentGaze: null,
	hasGaze: false
};

export const webgazerStore = writable<WebGazerState>(initialState);

export async function loadWebGazerScript(src?: string): Promise<void> {
	if (window.webgazer) {
		return Promise.resolve();
	}

	// Try local file first, then fallback to CDN
	const sources = src ? [src] : ['/webgazer.js', 'https://webgazer.cs.brown.edu/webgazer.js'];

	let lastError: Error | null = null;

	for (const scriptSrc of sources) {
		try {
			await new Promise<void>((resolve, reject) => {
				const el = document.createElement('script');
				el.src = scriptSrc;
				el.async = true;

				let resolved = false;
				let timeoutId: ReturnType<typeof setTimeout>;

				el.onload = () => {
					// Wait a bit for webgazer to be available on window
					const checkInterval = setInterval(() => {
						if (window.webgazer) {
							clearInterval(checkInterval);
							clearTimeout(timeoutId);
							if (!resolved) {
								resolved = true;
								resolve();
							}
						}
					}, 50);

					// Timeout after 5 seconds
					timeoutId = setTimeout(() => {
						clearInterval(checkInterval);
						if (!window.webgazer && !resolved) {
							resolved = true;
							reject(new Error('WebGazer failed to initialize after loading'));
						}
					}, 5000);
				};

				el.onerror = () => {
					if (!resolved) {
						resolved = true;
						reject(new Error(`Failed to load script from ${scriptSrc}`));
					}
				};

				document.head.appendChild(el);
			});
			return; // Success, exit the loop
		} catch (error) {
			lastError = error instanceof Error ? error : new Error('Unknown error');
			// Remove the failed script element
			const scripts = document.head.querySelectorAll(`script[src="${scriptSrc}"]`);
			scripts.forEach((s) => s.remove());
			// Try next source
			continue;
		}
	}

	// If we get here, all sources failed
	throw lastError || new Error('Failed to load WebGazer from all sources');
}

export async function initializeWebGazer(
	options: {
		showVideo?: boolean;
		showFaceOverlay?: boolean;
		showFaceFeedbackBox?: boolean;
		showPredictionPoints?: boolean;
		onGaze?: (data: GazePoint | null) => void;
	} = {}
): Promise<any> {
	const {
		showVideo = true,
		showFaceOverlay = true,
		showFaceFeedbackBox = true,
		showPredictionPoints = true,
		onGaze
	} = options;

	await loadWebGazerScript();

	const wg = window.webgazer;

	if (wg.detectCompatibility && !wg.detectCompatibility()) {
		throw new Error(
			'This browser is not compatible with WebGazer. Try Chrome/Edge/Firefox/Safari.'
		);
	}

	// CRITICAL: Configure WebGazer to request video stream
	// Set showVideo FIRST to ensure WebGazer knows it needs video
	wg.setTracker('clmtrackr')
		.setRegression('ridge')
		.applyKalmanFilter(true)
		.saveDataAcrossSessions(true)
		.showVideo(true) // Always request video initially, even if we hide it later
		.showFaceOverlay(showFaceOverlay)
		.showFaceFeedbackBox(showFaceFeedbackBox)
		.showPredictionPoints(showPredictionPoints);

	// Set camera constraints AFTER showVideo to ensure video is requested correctly
	// WebGazer needs to know video is required before constraints are set
	wg.setCameraConstraints({
		width: { ideal: 1280 },
		height: { ideal: 720 },
		facingMode: 'user'
	});

	// Patch WebGazer's getUserMedia to ensure video is always requested
	// Some versions of WebGazer may not properly include video in constraints
	const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
	navigator.mediaDevices.getUserMedia = function (constraints: MediaStreamConstraints) {
		// Ensure constraints object exists
		if (!constraints) {
			constraints = { video: true };
		}

		// Ensure video is always requested
		if (!constraints.video && !constraints.audio) {
			constraints.video = true;
		} else if (constraints.video === false && !constraints.audio) {
			// If video is explicitly false but no audio, force video to true
			constraints.video = true;
		} else if (typeof constraints.video === 'object' && constraints.video !== null) {
			// If video is an object (constraints), ensure it's truthy
			// (it already is, so no change needed)
		} else if (!constraints.video) {
			// If video is falsy but audio exists, still add video
			constraints.video = true;
		}
		return originalGetUserMedia(constraints);
	};

	// Now set the final video display state (after ensuring video is requested)
	if (!showVideo) {
		// Small delay to ensure video stream is established, then hide it
		setTimeout(() => {
			if (wg.showVideo) {
				wg.showVideo(false);
			}
		}, 100);
	}

	// Now begin - this will call getUserMedia with the constraints we set
	try {
		await wg.begin();
	} finally {
		// Restore original getUserMedia after begin() completes
		navigator.mediaDevices.getUserMedia = originalGetUserMedia;
	}

	if (onGaze) {
		wg.setGazeListener((data: { x: number; y: number } | null) => {
			if (data) {
				onGaze({ x: data.x, y: data.y });
			} else {
				onGaze(null);
			}
		});
	}

	webgazerStore.update((state) => ({
		...state,
		instance: wg,
		isInitialized: true,
		isActive: true
	}));

	return wg;
}

export async function endWebGazer(): Promise<void> {
	webgazerStore.update((state) => {
		if (state.instance) {
			state.instance.end().catch(() => {});
		}
		return {
			...state,
			instance: null,
			isActive: false,
			currentGaze: null,
			hasGaze: false
		};
	});
}

export function updateGaze(gaze: GazePoint | null): void {
	webgazerStore.update((state) => ({
		...state,
		currentGaze: gaze,
		hasGaze: gaze !== null
	}));
}
