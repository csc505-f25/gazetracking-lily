/**
 * Font pool and utilities for font readability comparison
 */

export type FontName =
	| 'georgia'
	| 'times-new-roman'
	| 'merriweather'
	| 'inter'
	| 'open-sans'
	| 'roboto';

export interface FontInfo {
	name: FontName;
	displayName: string;
	family: string;
	category: 'serif' | 'sans-serif';
}

/**
 * Pool of 6 popular reading fonts
 */
export const FONT_POOL: FontInfo[] = [
	{
		name: 'georgia',
		displayName: 'Georgia',
		family: 'Georgia, serif',
		category: 'serif'
	},
	{
		name: 'times-new-roman',
		displayName: 'Times New Roman',
		family: '"Times New Roman", Times, serif',
		category: 'serif'
	},
	{
		name: 'merriweather',
		displayName: 'Merriweather',
		family: '"Merriweather", Georgia, serif',
		category: 'serif'
	},
	{
		name: 'inter',
		displayName: 'Inter',
		family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
		category: 'sans-serif'
	},
	{
		name: 'open-sans',
		displayName: 'Open Sans',
		family: '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif',
		category: 'sans-serif'
	},
	{
		name: 'roboto',
		displayName: 'Roboto',
		family: '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
		category: 'sans-serif'
	}
];

/**
 * Get font info by name
 */
export function getFontInfo(name: FontName): FontInfo {
	const font = FONT_POOL.find((f) => f.name === name);
	if (!font) {
		throw new Error(`Font ${name} not found in pool`);
	}
	return font;
}

/**
 * Get CSS font-family string for a font
 */
export function getFontFamily(name: FontName): string {
	return getFontInfo(name).family;
}

/**
 * Font comparison structure
 */
export interface FontComparison {
	id: string;
	round: number;
	bracket: 'winners' | 'losers';
	fontA: FontName | null;
	fontB: FontName | null;
	preferred: FontName | null; // Preferred font (was "winner")
	notPreferred: FontName | null; // Not preferred font (was "loser")
	completed: boolean;
}

/**
 * Font comparison state
 */
export interface FontComparisonState {
	fonts: FontName[];
	comparisons: FontComparison[];
	currentComparisonIndex: number;
	eliminated: FontName[];
	finalPreferred: FontName | null; // Final preferred font (was "finalWinner")
}

/**
 * Initialize font comparisons with 6 fonts
 */
export function initializeComparisons(
	fonts: FontName[] = FONT_POOL.map((f) => f.name)
): FontComparisonState {
	if (fonts.length !== 6) {
		throw new Error('Font comparison requires exactly 6 fonts');
	}

	// Round 1: 3 comparisons in winners bracket
	const comparisons: FontComparison[] = [];

	// Winners bracket round 1
	comparisons.push(
		{
			id: 'winners_round1_comparison1',
			round: 1,
			bracket: 'winners',
			fontA: fonts[0],
			fontB: fonts[1],
			preferred: null,
			notPreferred: null,
			completed: false
		},
		{
			id: 'winners_round1_comparison2',
			round: 1,
			bracket: 'winners',
			fontA: fonts[2],
			fontB: fonts[3],
			preferred: null,
			notPreferred: null,
			completed: false
		},
		{
			id: 'winners_round1_comparison3',
			round: 1,
			bracket: 'winners',
			fontA: fonts[4],
			fontB: fonts[5],
			preferred: null,
			notPreferred: null,
			completed: false
		}
	);

	return {
		fonts,
		comparisons,
		currentComparisonIndex: 0,
		eliminated: [],
		finalPreferred: null
	};
}

/**
 * Record font preference and generate next comparisons
 */
export function recordComparisonResult(
	state: FontComparisonState,
	comparisonId: string,
	preferred: FontName
): FontComparisonState {
	const comparisonIndex = state.comparisons.findIndex((c) => c.id === comparisonId);
	if (comparisonIndex === -1) {
		throw new Error(`Comparison ${comparisonId} not found`);
	}

	const comparison = state.comparisons[comparisonIndex];
	if (comparison.completed) {
		throw new Error(`Comparison ${comparisonId} already completed`);
	}

	if (comparison.fontA !== preferred && comparison.fontB !== preferred) {
		throw new Error(`Font ${preferred} is not in this comparison`);
	}

	const notPreferred = preferred === comparison.fontA ? comparison.fontB! : comparison.fontA!;

	// Update comparison
	const updatedComparisons = [...state.comparisons];
	updatedComparisons[comparisonIndex] = {
		...comparison,
		preferred,
		notPreferred,
		completed: true
	};

	// Generate next comparisons based on progress
	const newComparisons = generateNextComparisons(updatedComparisons, notPreferred);
	const allComparisons = [...updatedComparisons, ...newComparisons];

	// Check for elimination
	const eliminated = checkEliminations(allComparisons, state.fonts);

	// Check if comparison is complete
	const finalPreferred = checkComparisonComplete(allComparisons, state.fonts);

	// Find next comparison index
	const nextComparisonIndex = allComparisons.findIndex((c) => !c.completed);

	return {
		...state,
		comparisons: allComparisons,
		currentComparisonIndex:
			nextComparisonIndex >= 0 ? nextComparisonIndex : state.currentComparisonIndex,
		eliminated,
		finalPreferred
	};
}

/**
 * Generate next comparisons based on comparison structure
 */
function generateNextComparisons(
	comparisons: FontComparison[],
	justNotPreferred: FontName
): FontComparison[] {
	const newComparisons: FontComparison[] = [];
	const completedComparisons = comparisons.filter((c) => c.completed);

	// Helper to check if a comparison already exists
	const comparisonExists = (id: string) => comparisons.some((c) => c.id === id);

	// Helper to check if a font is eliminated (has 2+ not preferred results)
	const isEliminated = (font: FontName): boolean => {
		const notPreferredCount = completedComparisons.filter((c) => c.notPreferred === font).length;
		return notPreferredCount >= 2;
	};

	// Helper to filter out eliminated fonts from an array
	const filterEliminated = (fonts: FontName[]): FontName[] => {
		return fonts.filter((f) => !isEliminated(f));
	};

	// Count completed comparisons by bracket and round
	const winnersRound1Complete = completedComparisons.filter(
		(c) => c.bracket === 'winners' && c.round === 1
	);
	const winnersRound2Complete = completedComparisons.filter(
		(c) => c.bracket === 'winners' && c.round === 2
	);
	const winnersRound3Complete = completedComparisons.filter(
		(c) => c.bracket === 'winners' && c.round === 3
	);
	const losersRound1Complete = completedComparisons.filter(
		(c) => c.bracket === 'losers' && c.round === 1
	);
	const losersRound2Complete = completedComparisons.filter(
		(c) => c.bracket === 'losers' && c.round === 2
	);
	const losersRound3Complete = completedComparisons.filter(
		(c) => c.bracket === 'losers' && c.round === 3
	);

	// ====== WINNERS BRACKET ======

	// Winners Round 1 → Create Winners Round 2 AND Losers Round 1
	if (winnersRound1Complete.length === 3) {
		const preferred = filterEliminated(winnersRound1Complete.map((c) => c.preferred!));
		const notPreferred = filterEliminated(winnersRound1Complete.map((c) => c.notPreferred!));

		// Winners Round 2: 2 of the 3 preferred fonts compared, 1 gets bye
		// Only create if we have at least 2 non-eliminated preferred fonts
		if (!comparisonExists('winners_round2_comparison1') && preferred.length >= 2) {
			newComparisons.push({
				id: 'winners_round2_comparison1',
				round: 2,
				bracket: 'winners',
				fontA: preferred[0],
				fontB: preferred[1],
				preferred: null,
				notPreferred: null,
				completed: false
			});
		}

		// Losers Round 1: 2 of the 3 not preferred fonts compared, 1 gets bye
		// Only create if we have at least 2 non-eliminated not preferred fonts
		if (!comparisonExists('losers_round1_comparison1') && notPreferred.length >= 2) {
			newComparisons.push({
				id: 'losers_round1_comparison1',
				round: 1,
				bracket: 'losers',
				fontA: notPreferred[0],
				fontB: notPreferred[1],
				preferred: null,
				notPreferred: null,
				completed: false
			});
		}
	}

	// Winners Round 2 → Create Winners Round 3 (Final) AND Losers Round 2
	if (winnersRound2Complete.length === 1 && winnersRound1Complete.length === 3) {
		const winnersRound2Comparison = winnersRound2Complete[0];
		const winnersRound1Bye = winnersRound1Complete
			.map((c) => c.preferred!)
			.find((p) => p !== winnersRound2Comparison.fontA && p !== winnersRound2Comparison.fontB);

		// Only proceed if both fonts are not eliminated
		if (
			winnersRound2Comparison.preferred &&
			!isEliminated(winnersRound2Comparison.preferred) &&
			winnersRound1Bye &&
			!isEliminated(winnersRound1Bye)
		) {
			// Winners Round 3 (Winners Bracket Final)
			if (!comparisonExists('winners_round3_final')) {
				newComparisons.push({
					id: 'winners_round3_final',
					round: 3,
					bracket: 'winners',
					fontA: winnersRound2Comparison.preferred,
					fontB: winnersRound1Bye,
					preferred: null,
					notPreferred: null,
					completed: false
				});
			}
		}

		// Losers Round 2 Comparison 1: Not preferred from Winners R2 vs Preferred from Losers R1
		if (losersRound1Complete.length === 1 && !comparisonExists('losers_round2_comparison1')) {
			const losersRound1Preferred = losersRound1Complete[0].preferred!;
			const winnersRound2NotPreferred = winnersRound2Comparison.notPreferred!;

			// Only create comparison if both fonts are not eliminated
			if (!isEliminated(losersRound1Preferred) && !isEliminated(winnersRound2NotPreferred)) {
				newComparisons.push({
					id: 'losers_round2_comparison1',
					round: 2,
					bracket: 'losers',
					fontA: winnersRound2NotPreferred,
					fontB: losersRound1Preferred,
					preferred: null,
					notPreferred: null,
					completed: false
				});
			}
		}
	}

	// Losers Round 2 Comparison 1 → Create Losers Round 2 Comparison 2
	if (losersRound2Complete.length >= 1 && !comparisonExists('losers_round2_comparison2')) {
		const losersRound2Comparison1 = completedComparisons.find(
			(c) => c.id === 'losers_round2_comparison1'
		);

		if (
			losersRound2Comparison1 &&
			winnersRound1Complete.length === 3 &&
			losersRound1Complete.length === 1
		) {
			// Find the bye from Losers Round 1 (the not preferred font that didn't compete)
			const losersRound1Comparison = losersRound1Complete[0];
			const losersRound1Bye = winnersRound1Complete
				.map((c) => c.notPreferred!)
				.find((np) => np !== losersRound1Comparison.fontA && np !== losersRound1Comparison.fontB);

			// Only create comparison if both fonts are not eliminated
			if (
				losersRound2Comparison1.preferred &&
				!isEliminated(losersRound2Comparison1.preferred) &&
				losersRound1Bye &&
				!isEliminated(losersRound1Bye)
			) {
				newComparisons.push({
					id: 'losers_round2_comparison2',
					round: 2,
					bracket: 'losers',
					fontA: losersRound2Comparison1.preferred,
					fontB: losersRound1Bye,
					preferred: null,
					notPreferred: null,
					completed: false
				});
			}
		}
	}

	// Winners Round 3 + Losers Round 2 Comparison 2 → Create Losers Round 3 (Final)
	if (winnersRound3Complete.length === 1 && losersRound2Complete.length === 2) {
		const winnersFinal = winnersRound3Complete[0];
		const losersRound2Final = completedComparisons.find(
			(c) => c.id === 'losers_round2_comparison2'
		);

		if (losersRound2Final && !comparisonExists('losers_round3_final')) {
			const winnersFinalNotPreferred = winnersFinal.notPreferred!;
			const losersRound2Preferred = losersRound2Final.preferred!;

			// Only create comparison if both fonts are not eliminated
			if (!isEliminated(winnersFinalNotPreferred) && !isEliminated(losersRound2Preferred)) {
				newComparisons.push({
					id: 'losers_round3_final',
					round: 3,
					bracket: 'losers',
					fontA: winnersFinalNotPreferred,
					fontB: losersRound2Preferred,
					preferred: null,
					notPreferred: null,
					completed: false
				});
			}
		}
	}

	// ====== GRAND FINALS ======

	// Both bracket finals complete → Create Grand Final
	if (winnersRound3Complete.length === 1 && losersRound3Complete.length === 1) {
		const winnersChampion = winnersRound3Complete[0].preferred!;
		const losersChampion = losersRound3Complete[0].preferred!;

		// Only create grand final if both champions are not eliminated (shouldn't happen, but safety check)
		if (
			!isEliminated(winnersChampion) &&
			!isEliminated(losersChampion) &&
			!comparisonExists('grand_final_comparison1')
		) {
			newComparisons.push({
				id: 'grand_final_comparison1',
				round: 4,
				bracket: 'winners',
				fontA: winnersChampion,
				fontB: losersChampion,
				preferred: null,
				notPreferred: null,
				completed: false
			});
		}
	}

	// Grand Final 1 complete → Check if need Grand Final 2
	const grandFinal1 = completedComparisons.find((c) => c.id === 'grand_final_comparison1');
	if (grandFinal1 && !comparisonExists('grand_final_comparison2')) {
		// If losers bracket champion was preferred, they need to be preferred twice (bracket reset)
		if (grandFinal1.preferred === grandFinal1.fontB) {
			newComparisons.push({
				id: 'grand_final_comparison2',
				round: 4,
				bracket: 'winners',
				fontA: grandFinal1.fontA!, // Winners bracket champion
				fontB: grandFinal1.fontB!, // Losers bracket champion
				preferred: null,
				notPreferred: null,
				completed: false
			});
		}
	}

	return newComparisons;
}

/**
 * Check which fonts are eliminated
 */
function checkEliminations(comparisons: FontComparison[], allFonts: FontName[]): FontName[] {
	const eliminated: FontName[] = [];

	// A font is eliminated if it has 2 not preferred results
	for (const font of allFonts) {
		const notPreferredCount = comparisons.filter(
			(c) => c.completed && c.notPreferred === font
		).length;

		if (notPreferredCount >= 2) {
			eliminated.push(font);
		}
	}

	return eliminated;
}

/**
 * Check if font comparison is complete
 */
function checkComparisonComplete(
	comparisons: FontComparison[],
	allFonts: FontName[]
): FontName | null {
	const grandFinal2 = comparisons.find((c) => c.id === 'grand_final_comparison2' && c.completed);
	if (grandFinal2) {
		// Second grand final completed - preferred font is the final choice
		return grandFinal2.preferred;
	}

	const grandFinal1 = comparisons.find((c) => c.id === 'grand_final_comparison1' && c.completed);
	if (grandFinal1) {
		if (grandFinal1.preferred === grandFinal1.fontA) {
			// Winners bracket champion was preferred in first grand final - comparison complete
			return grandFinal1.preferred;
		}
		// Losers bracket was preferred in first grand final - need second comparison
		// Check if second comparison exists and is completed
		const grandFinal2Exists = comparisons.some((c) => c.id === 'grand_final_comparison2');
		if (!grandFinal2Exists) {
			// Second comparison not yet created - comparison not complete
			return null;
		}
	}

	return null;
}

/**
 * Get current comparison
 */
export function getCurrentComparison(state: FontComparisonState): FontComparison | null {
	if (state.currentComparisonIndex >= state.comparisons.length) {
		return null;
	}
	return state.comparisons[state.currentComparisonIndex];
}

/**
 * Get font comparison progress info
 */
export function getComparisonProgress(state: FontComparisonState): {
	totalComparisons: number;
	completedComparisons: number;
	currentRound: number | null;
	remainingFonts: number;
} {
	const currentComparison = getCurrentComparison(state);
	const completed = state.comparisons.filter((c) => c.completed).length;

	return {
		totalComparisons: state.comparisons.length,
		completedComparisons: completed,
		currentRound: currentComparison?.round || null,
		remainingFonts: state.fonts.length - state.eliminated.length
	};
}
