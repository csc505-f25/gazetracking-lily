declare module 'webgazer' {
	interface WebGazer {
		setTracker(tracker: string): WebGazer;
		setRegression(regression: string): WebGazer;
		applyKalmanFilter(apply: boolean): WebGazer;
		saveDataAcrossSessions(save: boolean): WebGazer;
		showVideo(show: boolean): WebGazer;
		showFaceOverlay(show: boolean): WebGazer;
		showFaceFeedbackBox(show: boolean): WebGazer;
		showPredictionPoints(show: boolean): WebGazer;
		begin(): Promise<void>;
		end(): Promise<void>;
		setCameraConstraints(constraints: {
			width?: { ideal?: number };
			height?: { ideal?: number };
			facingMode?: string;
		}): void;
		recordScreenPosition(x: number, y: number, label: string): void;
		clearData(): void;
		detectCompatibility?(): boolean;
		setGazeListener?(listener: (data: any) => void): void;
		clearGazeListener?(): void;
		params?: {
			storingPoints?: boolean;
			storedPoints?: [number[], number[]];
			[key: string]: any;
		};
		getStoredPoints?(): [number[], number[]] | null;
	}

	const webgazer: WebGazer;
	export default webgazer;
}
