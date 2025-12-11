/**
 * API client for Readability Study Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface Passage {
	id: number;
	study_text_id: number;
	order: number;
	content: string;
	title?: string;
	font_left?: string;
	font_right?: string;
}

export interface StudyTextResponse {
	id: number;
	version: string;
	content?: string;
	passages?: Passage[];
	font_left?: string;
	font_right?: string;
}

export interface QuizQuestionResponse {
	id: string;
	prompt: string;
	choices: string[];
	answer: number;
}

export interface StudySessionData {
	participant_id?: number;
	session_id?: string;
	calibration_points?: number;
	font_left?: string;
	font_right?: string;
	time_left_ms?: number;
	time_right_ms?: number;
	time_a_ms?: number;
	time_b_ms?: number;
	font_preference?: string;
	preferred_font_type?: string;
	quiz_responses_json?: string;
	user_agent?: string;
	screen_width?: number;
	screen_height?: number;
}

export interface QuizResponseData {
	session_id: number;
	question_id: string;
	answer_index: number;
	is_correct?: boolean;
	response_time?: number;
}

export interface ApiResponse {
	success: boolean;
	session_id?: string;
	id?: number;
	error?: string;
}

/**
 * Create or get a participant
 */
export async function createParticipant(source: string = 'web'): Promise<number> {
	// Check if participant ID already exists in sessionStorage
	const existingId = sessionStorage.getItem('participant_id');
	if (existingId) {
		return parseInt(existingId, 10);
	}

	try {
		const response = await fetch(`${API_BASE_URL}/api/participant`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ source })
		});

		if (!response.ok) {
			throw new Error(`Failed to create participant: ${response.statusText}`);
		}

		const data = await response.json();
		const participantId = data.id;

		// Store in sessionStorage for reuse
		sessionStorage.setItem('participant_id', String(participantId));

		return participantId;
	} catch (error) {
		console.error('Error creating participant:', error);
		// Return a temporary ID if API fails
		const tempId = Date.now();
		sessionStorage.setItem('participant_id', String(tempId));
		return tempId;
	}
}

/**
 * Submit a study session to the backend
 */
export async function submitStudySession(data: StudySessionData): Promise<ApiResponse> {
	try {
		// Ensure participant_id exists
		if (!data.participant_id) {
			data.participant_id = await createParticipant();
		}

		// Add metadata if not provided
		if (!data.user_agent) {
			data.user_agent = navigator.userAgent;
		}
		if (!data.screen_width) {
			data.screen_width = window.screen.width;
		}
		if (!data.screen_height) {
			data.screen_height = window.screen.height;
		}

		const response = await fetch(`${API_BASE_URL}/api/session`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to submit session: ${errorText}`);
		}

		const result = await response.json();

		// Store session ID for later use
		if (result.session_id) {
			sessionStorage.setItem('session_id', result.session_id);
		}
		if (result.id) {
			sessionStorage.setItem('session_db_id', String(result.id));
		}

		return result;
	} catch (error) {
		console.error('Error submitting study session:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Submit individual quiz responses
 */
export async function submitQuizResponse(data: QuizResponseData): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/quiz-response`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Failed to submit quiz response: ${response.status} ${errorText}`, data);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error submitting quiz response:', error, data);
		return false;
	}
}

/**
 * Submit calibration data point
 */
export async function submitCalibrationData(data: {
	session_id: number;
	point_index: number;
	click_number: number;
	x: number;
	y: number;
}): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/calibration`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		return response.ok;
	} catch (error) {
		console.error('Error submitting calibration data:', error);
		return false;
	}
}

/**
 * Submit accuracy measurement
 */
export async function submitAccuracyMeasurement(data: {
	session_id: number;
	accuracy: number;
	duration: number;
	passed: boolean;
}): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/accuracy`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		return response.ok;
	} catch (error) {
		console.error('Error submitting accuracy measurement:', error);
		return false;
	}
}

/**
 * Submit gaze point
 */
export async function submitGazePoint(data: {
	session_id: number;
	x: number;
	y: number;
	panel?: string;
	phase?: string;
}): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/gaze-point`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		return response.ok;
	} catch (error) {
		console.error('Error submitting gaze point:', error);
		return false;
	}
}

/**
 * Submit reading event
 */
export async function submitReadingEvent(data: {
	session_id: number;
	event_type: string;
	panel: string;
	duration?: number;
}): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/reading-event`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		return response.ok;
	} catch (error) {
		console.error('Error submitting reading event:', error);
		return false;
	}
}

/**
 * Fetch study text from backend
 */
export async function fetchStudyText(version?: string): Promise<StudyTextResponse | null> {
	try {
		const url = version
			? `${API_BASE_URL}/api/study-text?version=${version}`
			: `${API_BASE_URL}/api/study-text`;

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch study text: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error fetching study text:', error);
		return null;
	}
}

/**
 * Fetch quiz questions from backend
 * @param studyTextId - Optional study text ID
 * @param passageId - Optional passage ID (if provided, fetches questions specific to that passage)
 */
export async function fetchQuizQuestions(
	studyTextId?: number,
	passageId?: number
): Promise<QuizQuestionResponse[]> {
	try {
		let url = `${API_BASE_URL}/api/quiz-questions`;
		const params = new URLSearchParams();

		// If passage_id is provided, use it (most specific)
		if (passageId) {
			params.append('passage_id', String(passageId));
		} else if (studyTextId) {
			// Otherwise, use study_text_id (gets questions not linked to specific passages)
			params.append('study_text_id', String(studyTextId));
		}
		// If neither provided, backend will use active study text

		if (params.toString()) {
			url += `?${params.toString()}`;
		}

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch quiz questions: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error fetching quiz questions:', error);
		return [];
	}
}

// ============================================================================
// Admin API Functions
// ============================================================================

export interface AdminStudyText {
	id: number;
	version: string;
	content: string;
	font_left?: string;
	font_right?: string;
	active: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface AdminPassage {
	id: number;
	study_text_id: number;
	order: number;
	content: string;
	title?: string;
	font_left?: string;
	font_right?: string;
}

export interface AdminQuizQuestion {
	id: number;
	study_text_id: number;
	passage_id?: number;
	question_id: string;
	prompt: string;
	choices: string[];
	answer: number;
	order: number;
}

export interface AdminApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Admin: List all study texts
 */
export async function adminListStudyTexts(): Promise<AdminStudyText[]> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/study-text`);
		if (!response.ok) {
			throw new Error(`Failed to fetch study texts: ${response.statusText}`);
		}
		const result: AdminApiResponse<AdminStudyText[]> = await response.json();
		if (result.success && result.data) {
			return result.data;
		}
		throw new Error(result.error || 'Failed to fetch study texts');
	} catch (error) {
		console.error('Error fetching study texts:', error);
		throw error;
	}
}

/**
 * Admin: Create a new study text
 */
export async function adminCreateStudyText(data: {
	version?: string;
	content: string;
	font_left?: string;
	font_right?: string;
	active?: boolean;
}): Promise<AdminStudyText> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/study-text`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to create study text: ${errorText}`);
		}
		const result: any = await response.json();
		if (result.success) {
			// Backend returns {success: true, id: ...}, so fetch the created item
			if (result.id) {
				const studyTexts = await adminListStudyTexts();
				const created = studyTexts.find((st) => st.id === result.id);
				if (created) return created;
			}
			// Fallback: reload all and return the most recent
			const studyTexts = await adminListStudyTexts();
			return studyTexts[0];
		}
		throw new Error(result.error || 'Failed to create study text');
	} catch (error) {
		console.error('Error creating study text:', error);
		throw error;
	}
}

/**
 * Admin: Update a study text
 */
export async function adminUpdateStudyText(data: {
	id: number;
	version?: string;
	content?: string;
	font_left?: string;
	font_right?: string;
	active?: boolean;
}): Promise<AdminStudyText> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/study-text`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to update study text: ${errorText}`);
		}
		const result: any = await response.json();
		if (result.success) {
			// Backend returns {success: true, id: ...}, so fetch the updated item
			const studyTexts = await adminListStudyTexts();
			const updated = studyTexts.find((st) => st.id === data.id);
			if (updated) return updated;
			throw new Error('Updated study text not found after update');
		}
		throw new Error(result.error || 'Failed to update study text');
	} catch (error) {
		console.error('Error updating study text:', error);
		throw error;
	}
}

/**
 * Admin: List passages for a study text
 */
export async function adminListPassages(studyTextId?: number): Promise<AdminPassage[]> {
	try {
		let url = `${API_BASE_URL}/api/admin/passage`;
		if (studyTextId) {
			url += `?study_text_id=${studyTextId}`;
		}
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch passages: ${response.statusText}`);
		}
		const result: AdminApiResponse<AdminPassage[]> = await response.json();
		if (result.success && result.data) {
			return result.data;
		}
		return [];
	} catch (error) {
		console.error('Error fetching passages:', error);
		throw error;
	}
}

/**
 * Admin: Get a single passage by ID
 */
export async function adminGetPassage(id: number): Promise<AdminPassage | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/passage?id=${id}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch passage: ${response.statusText}`);
		}
		const result: AdminApiResponse<AdminPassage> = await response.json();
		if (result.success && result.data) {
			return result.data;
		}
		return null;
	} catch (error) {
		console.error('Error fetching passage:', error);
		throw error;
	}
}

/**
 * Admin: Create a new passage
 */
export async function adminCreatePassage(data: {
	study_text_id: number;
	order?: number;
	title?: string;
	content: string;
	font_left?: string;
	font_right?: string;
}): Promise<AdminPassage> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/passage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to create passage: ${errorText}`);
		}
		const result: any = await response.json();
		if (result.success) {
			// Backend returns {success: true, id: ...}, so fetch the created item
			if (result.id) {
				const created = await adminGetPassage(result.id);
				if (created) return created;
			}
			throw new Error('Created passage not found after creation');
		}
		throw new Error(result.error || 'Failed to create passage');
	} catch (error) {
		console.error('Error creating passage:', error);
		throw error;
	}
}

/**
 * Admin: Update a passage
 */
export async function adminUpdatePassage(data: {
	id: number;
	title?: string;
	content?: string;
	order?: number;
	font_left?: string;
	font_right?: string;
}): Promise<AdminPassage> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/passage`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to update passage: ${errorText}`);
		}
		const result: any = await response.json();
		if (result.success) {
			// Backend returns {success: true, id: ...}, so fetch the updated item
			const updated = await adminGetPassage(data.id);
			if (updated) return updated;
			throw new Error('Updated passage not found after update');
		}
		throw new Error(result.error || 'Failed to update passage');
	} catch (error) {
		console.error('Error updating passage:', error);
		throw error;
	}
}

/**
 * Admin: Delete a passage
 */
export async function adminDeletePassage(id: number): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/passage?id=${id}`, {
			method: 'DELETE'
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to delete passage: ${errorText}`);
		}
		const result: AdminApiResponse = await response.json();
		return result.success || false;
	} catch (error) {
		console.error('Error deleting passage:', error);
		throw error;
	}
}

/**
 * Admin: List quiz questions
 */
export async function adminListQuizQuestions(
	studyTextId?: number,
	passageId?: number
): Promise<AdminQuizQuestion[]> {
	try {
		let url = `${API_BASE_URL}/api/admin/quiz-question`;
		const params = new URLSearchParams();
		if (passageId) {
			params.append('passage_id', String(passageId));
		} else if (studyTextId) {
			params.append('study_text_id', String(studyTextId));
		}
		if (params.toString()) {
			url += `?${params.toString()}`;
		}
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch quiz questions: ${response.statusText}`);
		}
		const result: AdminApiResponse<AdminQuizQuestion[]> = await response.json();
		if (result.success && result.data) {
			return Array.isArray(result.data) ? result.data : [result.data];
		}
		return [];
	} catch (error) {
		console.error('Error fetching quiz questions:', error);
		throw error;
	}
}

/**
 * Admin: Get a single quiz question by ID
 */
export async function adminGetQuizQuestion(id: number): Promise<AdminQuizQuestion | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/quiz-question?id=${id}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch quiz question: ${response.statusText}`);
		}
		const result: AdminApiResponse<AdminQuizQuestion> = await response.json();
		if (result.success && result.data) {
			return result.data;
		}
		return null;
	} catch (error) {
		console.error('Error fetching quiz question:', error);
		throw error;
	}
}

/**
 * Admin: Create a new quiz question
 */
export async function adminCreateQuizQuestion(data: {
	study_text_id: number;
	passage_id?: number;
	question_id: string;
	prompt: string;
	choices: string[];
	answer: number;
	order?: number;
}): Promise<AdminQuizQuestion> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/quiz-question`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to create quiz question: ${errorText}`);
		}
		const result: any = await response.json();
		if (result.success) {
			// Backend returns {success: true, id: ...}, so fetch the created item
			if (result.id) {
				const created = await adminGetQuizQuestion(result.id);
				if (created) return created;
			}
			throw new Error('Created quiz question not found after creation');
		}
		throw new Error(result.error || 'Failed to create quiz question');
	} catch (error) {
		console.error('Error creating quiz question:', error);
		throw error;
	}
}

/**
 * Admin: Update a quiz question
 */
export async function adminUpdateQuizQuestion(data: {
	id: number;
	passage_id?: number | null;
	question_id?: string;
	prompt?: string;
	choices?: string[];
	answer?: number;
	order?: number;
}): Promise<AdminQuizQuestion> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/quiz-question`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to update quiz question: ${errorText}`);
		}
		const result: any = await response.json();
		if (result.success) {
			// Backend returns {success: true, id: ...}, so fetch the updated item
			const updated = await adminGetQuizQuestion(data.id);
			if (updated) return updated;
			throw new Error('Updated quiz question not found after update');
		}
		throw new Error(result.error || 'Failed to update quiz question');
	} catch (error) {
		console.error('Error updating quiz question:', error);
		throw error;
	}
}

/**
 * Admin: Delete a quiz question
 */
export async function adminDeleteQuizQuestion(id: number): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/admin/quiz-question?id=${id}`, {
			method: 'DELETE'
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to delete quiz question: ${errorText}`);
		}
		const result: AdminApiResponse = await response.json();
		return result.success || false;
	} catch (error) {
		console.error('Error deleting quiz question:', error);
		throw error;
	}
}

/**
 * Collect all session data from sessionStorage and submit
 */
export async function submitCompleteSession(quizAnswers: Record<string, number>): Promise<boolean> {
	try {
		// Collect data from sessionStorage
		const sessionData: StudySessionData = {
			participant_id: parseInt(sessionStorage.getItem('participant_id') || '0', 10) || undefined,
			calibration_points:
				parseInt(sessionStorage.getItem('calibration_points') || '0', 10) || undefined,
			font_left: sessionStorage.getItem('font_left') || undefined,
			font_right: sessionStorage.getItem('font_right') || undefined,
			time_left_ms: parseInt(sessionStorage.getItem('time_left_ms') || '0', 10) || undefined,
			time_right_ms: parseInt(sessionStorage.getItem('time_right_ms') || '0', 10) || undefined,
			time_a_ms: parseInt(sessionStorage.getItem('timeA_ms') || '0', 10) || undefined,
			time_b_ms: parseInt(sessionStorage.getItem('timeB_ms') || '0', 10) || undefined,
			font_preference: sessionStorage.getItem('font_preference') || undefined,
			preferred_font_type: sessionStorage.getItem('font_preferred_type') || undefined
		};

		// Convert quiz answers to JSON
		const quizResponses = Object.entries(quizAnswers).map(([questionId, answerIndex]) => ({
			question_id: questionId,
			answer: answerIndex
		}));
		sessionData.quiz_responses_json = JSON.stringify(quizResponses);

		// Submit to backend
		const result = await submitStudySession(sessionData);

		if (result.success && result.id) {
			// Also submit individual quiz responses to the quiz_responses table
			const sessionDbId = result.id;

			// Fetch quiz questions from API to get correct answers
			// Use passage-specific questions if available, otherwise use study text questions
			const studyTextId = sessionStorage.getItem('study_text_id');
			const passageId = sessionStorage.getItem('current_passage_id');
			const quizQuestions = await fetchQuizQuestions(
				studyTextId ? parseInt(studyTextId, 10) : undefined,
				passageId ? parseInt(passageId, 10) : undefined
			);

			// Submit each quiz response individually
			const quizSubmissionPromises = [];
			for (const [questionId, answerIndex] of Object.entries(quizAnswers)) {
				const question = quizQuestions.find((q) => q.id === questionId);
				const isCorrect = question ? answerIndex === question.answer : undefined;

				quizSubmissionPromises.push(
					submitQuizResponse({
						session_id: sessionDbId,
						question_id: questionId,
						answer_index: answerIndex,
						is_correct: isCorrect
					}).catch((error) => {
						console.error(`Failed to submit quiz response for ${questionId}:`, error);
						return false;
					})
				);
			}

			// Wait for all quiz responses to be submitted (but don't fail if some fail)
			const results = await Promise.all(quizSubmissionPromises);
			const successCount = results.filter((r) => r === true).length;
			console.log(
				`Submitted ${successCount}/${quizSubmissionPromises.length} quiz responses individually`
			);

			return true;
		}

		return false;
	} catch (error) {
		console.error('Error submitting complete session:', error);
		return false;
	}
}
