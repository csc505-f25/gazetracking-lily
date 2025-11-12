export const SAMPLE_TEXT = `
Reading is a complex cognitive process that involves decoding symbols to derive meaning.
This brief passage is used purely for testing font readability and basic comprehension.
Try to read at a natural pace without skimming, and focus on understanding the content.
`;

export type QuizQ = {
	id: string;
	prompt: string;
	choices: string[];
	answer: number; // index into choices
};

export const QUIZ: QuizQ[] = [
	{
		id: 'q1',
		prompt: 'What is the purpose of this passage?',
		choices: [
			'To teach advanced speed-reading',
			'To test font readability and comprehension',
			'To explain eye-tracking algorithms',
			'To measure typing accuracy'
		],
		answer: 1
	},
	{
		id: 'q2',
		prompt: 'How should you read the passage?',
		choices: [
			'As quickly as possible without understanding',
			'Only the first sentence',
			'At a natural pace focusing on understanding',
			'Backwards to test attention'
		],
		answer: 2
	}
];
