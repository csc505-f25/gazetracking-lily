/**
 * Font pool and utilities for the double elimination tournament
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
 * Tournament match structure
 */
export interface Match {
	id: string;
	round: number;
	bracket: 'winners' | 'losers';
	fontA: FontName | null;
	fontB: FontName | null;
	winner: FontName | null;
	loser: FontName | null;
	completed: boolean;
}

/**
 * Tournament state
 */
export interface TournamentState {
	fonts: FontName[];
	matches: Match[];
	currentMatchIndex: number;
	eliminated: FontName[];
	finalWinner: FontName | null;
}

/**
 * Initialize tournament with 6 fonts
 */
export function initializeTournament(
	fonts: FontName[] = FONT_POOL.map((f) => f.name)
): TournamentState {
	if (fonts.length !== 6) {
		throw new Error('Tournament requires exactly 6 fonts');
	}

	// Round 1: 3 matches in winners bracket
	const matches: Match[] = [];

	// Winners bracket round 1
	matches.push(
		{
			id: 'winners_round1_match1',
			round: 1,
			bracket: 'winners',
			fontA: fonts[0],
			fontB: fonts[1],
			winner: null,
			loser: null,
			completed: false
		},
		{
			id: 'winners_round1_match2',
			round: 1,
			bracket: 'winners',
			fontA: fonts[2],
			fontB: fonts[3],
			winner: null,
			loser: null,
			completed: false
		},
		{
			id: 'winners_round1_match3',
			round: 1,
			bracket: 'winners',
			fontA: fonts[4],
			fontB: fonts[5],
			winner: null,
			loser: null,
			completed: false
		}
	);

	return {
		fonts,
		matches,
		currentMatchIndex: 0,
		eliminated: [],
		finalWinner: null
	};
}

/**
 * Record match result and generate next matches
 */
export function recordMatchResult(
	state: TournamentState,
	matchId: string,
	winner: FontName
): TournamentState {
	const matchIndex = state.matches.findIndex((m) => m.id === matchId);
	if (matchIndex === -1) {
		throw new Error(`Match ${matchId} not found`);
	}

	const match = state.matches[matchIndex];
	if (match.completed) {
		throw new Error(`Match ${matchId} already completed`);
	}

	if (match.fontA !== winner && match.fontB !== winner) {
		throw new Error(`Font ${winner} is not in this match`);
	}

	const loser = winner === match.fontA ? match.fontB! : match.fontA!;

	// Update match
	const updatedMatches = [...state.matches];
	updatedMatches[matchIndex] = {
		...match,
		winner,
		loser,
		completed: true
	};

	// Generate next matches based on tournament progress
	const newMatches = generateNextMatches(updatedMatches, loser);
	const allMatches = [...updatedMatches, ...newMatches];

	// Check for elimination
	const eliminated = checkEliminations(allMatches, state.fonts);

	// Check for tournament completion
	const finalWinner = checkTournamentComplete(allMatches, state.fonts);

	// Find next match index
	const nextMatchIndex = allMatches.findIndex((m) => !m.completed);

	return {
		...state,
		matches: allMatches,
		currentMatchIndex: nextMatchIndex >= 0 ? nextMatchIndex : state.currentMatchIndex,
		eliminated,
		finalWinner
	};
}

/**
 * Generate next matches based on tournament structure
 */
function generateNextMatches(matches: Match[], justLost: FontName): Match[] {
	const newMatches: Match[] = [];
	const completedMatches = matches.filter((m) => m.completed);

	// Helper to check if a match already exists
	const matchExists = (id: string) => matches.some((m) => m.id === id);

	// Count completed matches by bracket and round
	const winnersRound1Complete = completedMatches.filter(
		(m) => m.bracket === 'winners' && m.round === 1
	);
	const winnersRound2Complete = completedMatches.filter(
		(m) => m.bracket === 'winners' && m.round === 2
	);
	const winnersRound3Complete = completedMatches.filter(
		(m) => m.bracket === 'winners' && m.round === 3
	);
	const losersRound1Complete = completedMatches.filter(
		(m) => m.bracket === 'losers' && m.round === 1
	);
	const losersRound2Complete = completedMatches.filter(
		(m) => m.bracket === 'losers' && m.round === 2
	);
	const losersRound3Complete = completedMatches.filter(
		(m) => m.bracket === 'losers' && m.round === 3
	);

	// ====== WINNERS BRACKET ======

	// Winners Round 1 → Create Winners Round 2 AND Losers Round 1
	if (winnersRound1Complete.length === 3) {
		const winners = winnersRound1Complete.map((m) => m.winner!);
		const losers = winnersRound1Complete.map((m) => m.loser!);

		// Winners Round 2: 2 of the 3 winners compete, 1 gets bye
		if (!matchExists('winners_round2_match1')) {
			newMatches.push({
				id: 'winners_round2_match1',
				round: 2,
				bracket: 'winners',
				fontA: winners[0],
				fontB: winners[1],
				winner: null,
				loser: null,
				completed: false
			});
		}

		// Losers Round 1: 2 of the 3 losers compete, 1 gets bye
		if (!matchExists('losers_round1_match1')) {
			newMatches.push({
				id: 'losers_round1_match1',
				round: 1,
				bracket: 'losers',
				fontA: losers[0],
				fontB: losers[1],
				winner: null,
				loser: null,
				completed: false
			});
		}
	}

	// Winners Round 2 → Create Winners Round 3 (Final) AND Losers Round 2
	if (winnersRound2Complete.length === 1 && winnersRound1Complete.length === 3) {
		const winnersRound2Match = winnersRound2Complete[0];
		const winnersRound1Bye = winnersRound1Complete
			.map((m) => m.winner!)
			.find((w) => w !== winnersRound2Match.fontA && w !== winnersRound2Match.fontB)!;

		// Winners Round 3 (Winners Bracket Final)
		if (!matchExists('winners_round3_final')) {
			newMatches.push({
				id: 'winners_round3_final',
				round: 3,
				bracket: 'winners',
				fontA: winnersRound2Match.winner!,
				fontB: winnersRound1Bye,
				winner: null,
				loser: null,
				completed: false
			});
		}

		// Losers Round 2 Match 1: Loser from Winners R2 vs Winner from Losers R1
		if (losersRound1Complete.length === 1 && !matchExists('losers_round2_match1')) {
			const losersRound1Winner = losersRound1Complete[0].winner!;
			const winnersRound2Loser = winnersRound2Match.loser!;

			newMatches.push({
				id: 'losers_round2_match1',
				round: 2,
				bracket: 'losers',
				fontA: winnersRound2Loser,
				fontB: losersRound1Winner,
				winner: null,
				loser: null,
				completed: false
			});
		}
	}

	// Losers Round 2 Match 1 → Create Losers Round 2 Match 2
	if (losersRound2Complete.length >= 1 && !matchExists('losers_round2_match2')) {
		const losersRound2Match1 = completedMatches.find((m) => m.id === 'losers_round2_match1');

		if (
			losersRound2Match1 &&
			winnersRound1Complete.length === 3 &&
			losersRound1Complete.length === 1
		) {
			// Find the bye from Losers Round 1 (the loser who didn't compete)
			const losersRound1Match = losersRound1Complete[0];
			const losersRound1Bye = winnersRound1Complete
				.map((m) => m.loser!)
				.find((l) => l !== losersRound1Match.fontA && l !== losersRound1Match.fontB)!;

			newMatches.push({
				id: 'losers_round2_match2',
				round: 2,
				bracket: 'losers',
				fontA: losersRound2Match1.winner!,
				fontB: losersRound1Bye,
				winner: null,
				loser: null,
				completed: false
			});
		}
	}

	// Winners Round 3 + Losers Round 2 Match 2 → Create Losers Round 3 (Final)
	if (winnersRound3Complete.length === 1 && losersRound2Complete.length === 2) {
		const winnersFinal = winnersRound3Complete[0];
		const losersRound2Final = completedMatches.find((m) => m.id === 'losers_round2_match2')!;

		if (!matchExists('losers_round3_final')) {
			newMatches.push({
				id: 'losers_round3_final',
				round: 3,
				bracket: 'losers',
				fontA: winnersFinal.loser!,
				fontB: losersRound2Final.winner!,
				winner: null,
				loser: null,
				completed: false
			});
		}
	}

	// ====== GRAND FINALS ======

	// Both bracket finals complete → Create Grand Final
	if (winnersRound3Complete.length === 1 && losersRound3Complete.length === 1) {
		const winnersChampion = winnersRound3Complete[0].winner!;
		const losersChampion = losersRound3Complete[0].winner!;

		if (!matchExists('grand_final_match1')) {
			newMatches.push({
				id: 'grand_final_match1',
				round: 4,
				bracket: 'winners',
				fontA: winnersChampion,
				fontB: losersChampion,
				winner: null,
				loser: null,
				completed: false
			});
		}
	}

	// Grand Final 1 complete → Check if need Grand Final 2
	const grandFinal1 = completedMatches.find((m) => m.id === 'grand_final_match1');
	if (grandFinal1 && !matchExists('grand_final_match2')) {
		// If losers bracket champion won, they need to win twice (bracket reset)
		if (grandFinal1.winner === grandFinal1.fontB) {
			newMatches.push({
				id: 'grand_final_match2',
				round: 4,
				bracket: 'winners',
				fontA: grandFinal1.fontA!, // Winners bracket champion
				fontB: grandFinal1.fontB!, // Losers bracket champion
				winner: null,
				loser: null,
				completed: false
			});
		}
	}

	return newMatches;
}

/**
 * Check which fonts are eliminated
 */
function checkEliminations(matches: Match[], allFonts: FontName[]): FontName[] {
	const eliminated: FontName[] = [];

	// A font is eliminated if it has 2 losses
	for (const font of allFonts) {
		const losses = matches.filter((m) => m.completed && m.loser === font).length;

		if (losses >= 2) {
			eliminated.push(font);
		}
	}

	return eliminated;
}

/**
 * Check if tournament is complete
 */
function checkTournamentComplete(matches: Match[], allFonts: FontName[]): FontName | null {
	const grandFinal2 = matches.find((m) => m.id === 'grand_final_match2' && m.completed);
	if (grandFinal2) {
		// Second grand final completed - winner is champion
		return grandFinal2.winner;
	}

	const grandFinal1 = matches.find((m) => m.id === 'grand_final_match1' && m.completed);
	if (grandFinal1) {
		if (grandFinal1.winner === grandFinal1.fontA) {
			// Winners bracket champion won first grand final - tournament complete
			return grandFinal1.winner;
		}
		// Losers bracket won first grand final - need second match
		// Check if second match exists and is completed
		const grandFinal2Exists = matches.some((m) => m.id === 'grand_final_match2');
		if (!grandFinal2Exists) {
			// Second match not yet created - tournament not complete
			return null;
		}
	}

	return null;
}

/**
 * Get current match
 */
export function getCurrentMatch(state: TournamentState): Match | null {
	if (state.currentMatchIndex >= state.matches.length) {
		return null;
	}
	return state.matches[state.currentMatchIndex];
}

/**
 * Get tournament progress info
 */
export function getTournamentProgress(state: TournamentState): {
	totalMatches: number;
	completedMatches: number;
	currentRound: number | null;
	remainingFonts: number;
} {
	const currentMatch = getCurrentMatch(state);
	const completed = state.matches.filter((m) => m.completed).length;

	return {
		totalMatches: state.matches.length,
		completedMatches: completed,
		currentRound: currentMatch?.round || null,
		remainingFonts: state.fonts.length - state.eliminated.length
	};
}
