<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import {
		adminListStudyTexts,
		adminListPassages,
		adminGetPassage,
		adminCreatePassage,
		adminUpdatePassage,
		adminDeletePassage,
		adminListQuizQuestions,
		adminGetQuizQuestion,
		adminCreateQuizQuestion,
		adminUpdateQuizQuestion,
		adminDeleteQuizQuestion,
		adminGetStatistics,
		type AdminStudyText,
		type AdminPassage,
		type AdminQuizQuestion,
		type Statistics
	} from '$lib/api';

	type Tab = 'passages' | 'quiz-questions' | 'analytics';

	let activeTab: Tab = 'passages';
	let loading = false;
	let error: string | null = null;
	let successMessage: string | null = null;
	let statistics: Statistics | null = null;

	// Study Texts (needed for passages and quiz questions)
	let studyTexts: AdminStudyText[] = [];

	// Passages
	let passages: AdminPassage[] = [];
	let showPassageForm = false;
	let editingPassage: AdminPassage | null = null;
	let passageForm = {
		study_text_id: 0,
		order: 0,
		title: '',
		content: '',
		font_left: '',
		font_right: ''
	};

	// Quiz Questions
	let quizQuestions: AdminQuizQuestion[] = [];
	let showQuizForm = false;
	let editingQuiz: AdminQuizQuestion | null = null;
	let quizForm = {
		study_text_id: 0,
		passage_id: undefined as number | undefined,
		question_id: '',
		prompt: '',
		choices: ['', '', '', ''],
		answer: 0,
		order: 0
	};

	function clearMessages() {
		setTimeout(() => {
			error = null;
			successMessage = null;
		}, 5000);
	}

	function showError(msg: string) {
		error = msg;
		clearMessages();
	}

	function showSuccess(msg: string) {
		successMessage = msg;
		clearMessages();
	}

	// Study Text Functions
	async function loadStudyTexts() {
		loading = true;
		error = null;
		try {
			studyTexts = await adminListStudyTexts();
		} catch (e) {
			showError(e instanceof Error ? e.message : 'Failed to load study texts');
		} finally {
			loading = false;
		}
	}

	// Passage Functions
	async function loadPassages() {
		loading = true;
		error = null;
		try {
			// Load all passages grouped by study text
			const allPassages: AdminPassage[] = [];
			for (const text of studyTexts) {
				const textPassages = await adminListPassages(text.id);
				allPassages.push(...textPassages);
			}
			passages = allPassages;
		} catch (e) {
			showError(e instanceof Error ? e.message : 'Failed to load passages');
		} finally {
			loading = false;
		}
	}

	function openPassageForm(passage?: AdminPassage) {
		if (passage) {
			editingPassage = passage;
			passageForm = {
				study_text_id: passage.study_text_id,
				order: passage.order,
				title: passage.title || '',
				content: passage.content,
				font_left: passage.font_left || '',
				font_right: passage.font_right || ''
			};
		} else {
			editingPassage = null;
			passageForm = {
				study_text_id: studyTexts[0]?.id || 0,
				order: 0,
				title: '',
				content: '',
				font_left: '',
				font_right: ''
			};
		}
		showPassageForm = true;
	}

	async function savePassage() {
		if (!passageForm.content.trim()) {
			showError('Content is required');
			return;
		}
		if (!passageForm.study_text_id) {
			showError('Study text is required');
			return;
		}

		loading = true;
		error = null;
		try {
			const data: any = {
				study_text_id: passageForm.study_text_id,
				content: passageForm.content,
				order: passageForm.order || 0
			};
			if (passageForm.title) data.title = passageForm.title;
			if (passageForm.font_left) data.font_left = passageForm.font_left;
			if (passageForm.font_right) data.font_right = passageForm.font_right;

			if (editingPassage) {
				await adminUpdatePassage({
					id: editingPassage.id,
					...data
				});
				showSuccess('Passage updated successfully');
			} else {
				await adminCreatePassage(data);
				showSuccess('Passage created successfully');
			}
			showPassageForm = false;
			await loadPassages();
		} catch (e) {
			showError(e instanceof Error ? e.message : 'Failed to save passage');
		} finally {
			loading = false;
		}
	}

	async function deletePassageConfirm(passage: AdminPassage) {
		if (!confirm(`Are you sure you want to delete passage "${passage.title || 'Untitled'}"?`)) {
			return;
		}

		loading = true;
		error = null;
		try {
			await adminDeletePassage(passage.id);
			showSuccess('Passage deleted successfully');
			await loadPassages();
		} catch (e) {
			showError(e instanceof Error ? e.message : 'Failed to delete passage');
		} finally {
			loading = false;
		}
	}

	// Quiz Question Functions
	async function loadQuizQuestions() {
		loading = true;
		error = null;
		try {
			// Load all quiz questions grouped by study text
			const allQuestions: AdminQuizQuestion[] = [];
			for (const text of studyTexts) {
				const textQuestions = await adminListQuizQuestions(text.id);
				allQuestions.push(...textQuestions);
			}
			quizQuestions = allQuestions;
		} catch (e) {
			showError(e instanceof Error ? e.message : 'Failed to load quiz questions');
		} finally {
			loading = false;
		}
	}

	// Group quiz questions by passage
	$: groupedQuizQuestions = (() => {
		const grouped: Map<number | 'none', AdminQuizQuestion[]> = new Map();
		
		for (const question of quizQuestions) {
			const key = question.passage_id ?? 'none';
			if (!grouped.has(key)) {
				grouped.set(key, []);
			}
			grouped.get(key)!.push(question);
		}
		
		// Sort questions within each group by order
		for (const [key, questions] of grouped.entries()) {
			questions.sort((a, b) => a.order - b.order);
		}
		
		// Convert to array of [passageId, questions] tuples, sorted
		const entries = Array.from(grouped.entries());
		entries.sort(([a], [b]) => {
			if (a === 'none') return 1;
			if (b === 'none') return -1;
			return Number(a) - Number(b);
		});
		
		return entries;
	})();

	// Get passage title by ID
	function getPassageTitle(passageId: number | undefined): string {
		if (!passageId) return 'Study Text Questions';
		const passage = passages.find((p) => p.id === passageId);
		return passage?.title || `Passage ${passageId}`;
	}

	function openQuizForm(quiz?: AdminQuizQuestion) {
		if (quiz) {
			editingQuiz = quiz;
			quizForm = {
				study_text_id: quiz.study_text_id,
				passage_id: quiz.passage_id,
				question_id: quiz.question_id,
				prompt: quiz.prompt,
				choices: [...quiz.choices],
				answer: quiz.answer,
				order: quiz.order
			};
			// Ensure we have at least 4 choices
			while (quizForm.choices.length < 4) {
				quizForm.choices.push('');
			}
		} else {
			editingQuiz = null;
			quizForm = {
				study_text_id: studyTexts[0]?.id || 0,
				passage_id: undefined,
				question_id: '',
				prompt: '',
				choices: ['', '', '', ''],
				answer: 0,
				order: 0
			};
		}
		showQuizForm = true;
	}

	function addQuizChoice() {
		quizForm.choices.push('');
		// Force reactivity update
		quizForm = { ...quizForm, choices: [...quizForm.choices] };
	}

	function removeQuizChoice(index: number, event?: MouseEvent) {
		if (quizForm.choices.length > 2) {
			// Add visual feedback: briefly highlight the button
			if (event?.currentTarget) {
				const button = event.currentTarget as HTMLElement;
				button.classList.add('opacity-50', 'scale-95', 'transition-all', 'duration-200');
				setTimeout(() => {
					button.classList.remove('opacity-50', 'scale-95');
				}, 200);
			}
			
			// Clear the text immediately so the input field shows it's being removed
			quizForm.choices[index] = '';
			// Force reactivity update to clear the input field text immediately
			quizForm = { ...quizForm, choices: [...quizForm.choices] };
			
			// Remove the choice after a brief delay to allow the text to clear visually
			setTimeout(() => {
				quizForm.choices.splice(index, 1);
				// Update answer index if needed
				if (quizForm.answer >= quizForm.choices.length) {
					quizForm.answer = quizForm.choices.length - 1;
				}
				// Force reactivity update to reflect the removal
				quizForm = { ...quizForm, choices: [...quizForm.choices] };
			}, 100);
		}
	}

	async function saveQuizQuestion() {
		if (!quizForm.prompt.trim()) {
			showError('Prompt is required');
			return;
		}
		if (!quizForm.question_id.trim()) {
			showError('Question ID is required');
			return;
		}
		const validChoices = quizForm.choices.filter((c) => c.trim());
		if (validChoices.length < 2) {
			showError('At least 2 choices are required');
			return;
		}
		if (quizForm.answer < 0 || quizForm.answer >= validChoices.length) {
			showError('Answer index must be valid');
			return;
		}
		if (!quizForm.study_text_id) {
			showError('Study text is required');
			return;
		}

		loading = true;
		error = null;
		try {
			const data: any = {
				study_text_id: quizForm.study_text_id,
				question_id: quizForm.question_id,
				prompt: quizForm.prompt,
				choices: validChoices,
				answer: quizForm.answer,
				order: quizForm.order || 0
			};
			// Include passage_id if it's set, or explicitly set to null if it was cleared
			if (quizForm.passage_id !== undefined) {
				data.passage_id = quizForm.passage_id || null;
			}

			if (editingQuiz) {
				await adminUpdateQuizQuestion({
					id: editingQuiz.id,
					...data
				});
				showSuccess('Quiz question updated successfully');
			} else {
				await adminCreateQuizQuestion(data);
				showSuccess('Quiz question created successfully');
			}
			showQuizForm = false;
			await loadQuizQuestions();
		} catch (e) {
			showError(e instanceof Error ? e.message : 'Failed to save quiz question');
		} finally {
			loading = false;
		}
	}

	async function deleteQuizQuestionConfirm(quiz: AdminQuizQuestion) {
		if (!confirm(`Are you sure you want to delete question "${quiz.question_id}"?`)) {
			return;
		}

		loading = true;
		error = null;
		try {
			await adminDeleteQuizQuestion(quiz.id);
			showSuccess('Quiz question deleted successfully');
			await loadQuizQuestions();
		} catch (e) {
			showError(e instanceof Error ? e.message : 'Failed to delete quiz question');
		} finally {
			loading = false;
		}
	}

	async function loadStatistics() {
		loading = true;
		error = null;
		try {
			statistics = await adminGetStatistics();
		} catch (e) {
			showError(e instanceof Error ? e.message : 'Failed to load statistics');
		} finally {
			loading = false;
		}
	}

	async function switchTab(tab: Tab) {
		activeTab = tab;
		error = null;
		successMessage = null;

		// Load data when switching tabs
		if (tab === 'passages') {
			await loadStudyTexts(); // Need study texts for passage form
			await loadPassages();
		} else if (tab === 'quiz-questions') {
			await loadStudyTexts(); // Need study texts for quiz form
			await loadQuizQuestions();
		} else if (tab === 'analytics') {
			await loadStatistics();
		}
	}

	onMount(async () => {
		await loadStudyTexts();
	});
</script>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="bg-white shadow rounded-lg">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200">
				<h1 class="text-3xl font-bold text-gray-900">Admin Panel</h1>
				<p class="mt-1 text-sm text-gray-500">Manage passages and quiz questions</p>
			</div>

			<!-- Messages -->
			{#if error}
				<div class="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}
			{#if successMessage}
				<div class="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
					<p class="text-sm text-green-800">{successMessage}</p>
				</div>
			{/if}

			<!-- Tabs -->
			<div class="border-b border-gray-200">
				<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
					<button
						onclick={() => switchTab('passages')}
						class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'passages'
							? 'border-blue-500 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						Passages
					</button>
					<button
						onclick={() => switchTab('quiz-questions')}
						class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'quiz-questions'
							? 'border-blue-500 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						Quiz Questions
					</button>
					<button
						onclick={() => switchTab('analytics')}
						class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'analytics'
							? 'border-blue-500 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						Analytics
					</button>
				</nav>
			</div>

			<!-- Content -->
			<div class="p-6">
				{#if loading && studyTexts.length === 0 && passages.length === 0 && quizQuestions.length === 0}
					<div class="text-center py-12">
						<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						<p class="mt-2 text-sm text-gray-500">Loading...</p>
					</div>
				{:else if activeTab === 'passages'}
					<!-- Passages Tab -->
					<div class="mb-4 flex justify-between items-center">
						<h2 class="text-xl font-semibold text-gray-900">Passages</h2>
						<button
							onclick={() => openPassageForm()}
							disabled={studyTexts.length === 0}
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							+ New Passage
						</button>
					</div>

					{#if studyTexts.length === 0}
						<div class="text-center py-12 text-gray-500">
							Create a study text first before adding passages.
						</div>
					{:else}
						<div class="space-y-4">
							{#each passages as passage}
								<div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
									<div class="flex justify-between items-start">
										<div class="flex-1">
											<div class="flex items-center gap-2">
												<h3 class="text-lg font-medium text-gray-900">
													{passage.title || 'Untitled Passage'}
												</h3>
												<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
													Order: {passage.order}
												</span>
											</div>
											<p class="mt-1 text-sm text-gray-500">
												ID: {passage.id} | Study Text ID: {passage.study_text_id}
												{#if passage.font_left || passage.font_right}
													| Fonts: {passage.font_left || 'default'} / {passage.font_right ||
														'default'}
												{/if}
											</p>
											<p class="mt-2 text-sm text-gray-700 line-clamp-2">
												{passage.content.substring(0, 200)}
												{passage.content.length > 200 ? '...' : ''}
											</p>
										</div>
										<div class="ml-4 flex gap-2">
											<button
												onclick={() => openPassageForm(passage)}
												class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
											>
												Edit
											</button>
											<button
												onclick={() => deletePassageConfirm(passage)}
												class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 active:scale-95 active:bg-red-300 transition-all duration-150"
												type="button"
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							{:else}
								<div class="text-center py-12 text-gray-500">No passages found.</div>
							{/each}
						</div>
					{/if}

					<!-- Passage Form Modal -->
					{#if showPassageForm}
						<div
							class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
							role="button"
							tabindex="0"
							aria-label="Close modal"
							onclick={() => (showPassageForm = false)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
									showPassageForm = false;
								}
							}}
						>
							<div
								class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white"
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => e.stopPropagation()}
							>
								<h3 class="text-lg font-medium text-gray-900 mb-4">
									{editingPassage ? 'Edit Passage' : 'Create Passage'}
								</h3>
								<div class="space-y-4">
									<div>
										<label class="block text-sm font-medium text-gray-700">Study Text *</label>
										<select
											bind:value={passageForm.study_text_id}
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										>
											{#each studyTexts as text}
												<option value={text.id}>{text.version || `ID: ${text.id}`}</option>
											{/each}
										</select>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700">Order</label>
										<input
											type="number"
											bind:value={passageForm.order}
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700">Title (optional)</label>
										<input
											type="text"
											bind:value={passageForm.title}
											placeholder="Passage title"
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700">Content *</label>
										<textarea
											bind:value={passageForm.content}
											rows="10"
											placeholder="Enter passage content..."
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										></textarea>
									</div>
									<div class="grid grid-cols-2 gap-4">
										<div>
											<label class="block text-sm font-medium text-gray-700"
												>Left Font (optional)</label
											>
											<select
												bind:value={passageForm.font_left}
												class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
											>
												<option value="">Use study text default</option>
												<option value="serif">Serif</option>
												<option value="sans">Sans</option>
											</select>
										</div>
										<div>
											<label class="block text-sm font-medium text-gray-700"
												>Right Font (optional)</label
											>
											<select
												bind:value={passageForm.font_right}
												class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
											>
												<option value="">Use study text default</option>
												<option value="serif">Serif</option>
												<option value="sans">Sans</option>
											</select>
										</div>
									</div>
									<div class="flex justify-end gap-2">
										<button
											onclick={() => (showPassageForm = false)}
											class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
										>
											Cancel
										</button>
										<button
											onclick={savePassage}
											disabled={loading}
											class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
										>
											{loading ? 'Saving...' : 'Save'}
										</button>
									</div>
								</div>
							</div>
						</div>
					{/if}
				{:else if activeTab === 'quiz-questions'}
					<!-- Quiz Questions Tab -->
					<div class="mb-4 flex justify-between items-center">
						<h2 class="text-xl font-semibold text-gray-900">Quiz Questions</h2>
						<button
							onclick={() => openQuizForm()}
							disabled={studyTexts.length === 0}
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							+ New Question
						</button>
					</div>

					{#if studyTexts.length === 0}
						<div class="text-center py-12 text-gray-500">
							Create a study text first before adding quiz questions.
						</div>
					{:else}
						{#if quizQuestions.length === 0}
							<div class="text-center py-12 text-gray-500">No quiz questions found.</div>
						{:else}
							<div class="space-y-6">
								{#each groupedQuizQuestions as [passageId, questions]}
									<div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
										<div class="mb-4 pb-2 border-b border-gray-300">
											<h3 class="text-lg font-semibold text-gray-900">
												{passageId === 'none' ? 'Study Text Questions' : getPassageTitle(passageId)}
											</h3>
											{#if passageId !== 'none'}
												<p class="text-sm text-gray-500 mt-1">Passage ID: {passageId}</p>
											{/if}
											<p class="text-sm text-gray-500 mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
										</div>
										<div class="space-y-3">
											{#each questions as question}
												<div class="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50">
													<div class="flex justify-between items-start">
														<div class="flex-1">
															<div class="flex items-center gap-2">
																<h4 class="text-base font-medium text-gray-900">
																	{question.question_id}
																</h4>
																<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
																	Order: {question.order}
																</span>
															</div>
															<p class="mt-1 text-sm text-gray-500">
																ID: {question.id} | Study Text ID: {question.study_text_id}
															</p>
															<p class="mt-2 text-sm font-medium text-gray-900">{question.prompt}</p>
															<div class="mt-2 space-y-1">
																{#each question.choices as choice, index}
																	<p class="text-sm text-gray-700">
																		{index === question.answer ? '✓' : '○'} {choice}
																	</p>
																{/each}
															</div>
														</div>
														<div class="ml-4 flex gap-2">
															<button
																onclick={() => openQuizForm(question)}
																class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
															>
																Edit
															</button>
															<button
																onclick={() => deleteQuizQuestionConfirm(question)}
																class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 active:scale-95 active:bg-red-300 transition-all duration-150"
																type="button"
															>
																Delete
															</button>
														</div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{/if}

					<!-- Quiz Form Modal -->
					{#if showQuizForm}
						<div
							class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
							role="button"
							tabindex="0"
							aria-label="Close modal"
							onclick={() => (showQuizForm = false)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
									showQuizForm = false;
								}
							}}
						>
							<div
								class="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto"
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => e.stopPropagation()}
							>
								<h3 class="text-lg font-medium text-gray-900 mb-4">
									{editingQuiz ? 'Edit Quiz Question' : 'Create Quiz Question'}
								</h3>
								<div class="space-y-4">
									<div>
										<label class="block text-sm font-medium text-gray-700">Study Text *</label>
										<select
											bind:value={quizForm.study_text_id}
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										>
											{#each studyTexts as text}
												<option value={text.id}>{text.version || `ID: ${text.id}`}</option>
											{/each}
										</select>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700"
											>Passage ID (optional)</label
										>
										<input
											type="number"
											bind:value={quizForm.passage_id}
											placeholder="Leave empty for study text questions"
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label for="quiz-question-id" class="block text-sm font-medium text-gray-700">Question ID *</label>
										<input
											id="quiz-question-id"
											type="text"
											bind:value={quizForm.question_id}
											placeholder="e.g., q1, q2"
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label for="quiz-prompt" class="block text-sm font-medium text-gray-700">Prompt *</label>
										<textarea
											id="quiz-prompt"
											bind:value={quizForm.prompt}
											rows="3"
											placeholder="Enter question prompt..."
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										></textarea>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">Choices *</label>
										<div class="space-y-2">
											{#each quizForm.choices as choice, index (index)}
												<div class="flex gap-2" transition:fly={{ y: -10, duration: 200 }}>
													<input
														type="radio"
														bind:group={quizForm.answer}
														value={index}
														class="mt-1"
													/>
													<input
														type="text"
														bind:value={quizForm.choices[index]}
														placeholder="Choice {index + 1}"
														class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
													/>
													{#if quizForm.choices.length > 2}
														<button
															onclick={(e) => removeQuizChoice(index, e)}
															class="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all duration-200 active:scale-95"
															type="button"
														>
															Remove
														</button>
													{/if}
												</div>
											{/each}
											<button
												onclick={addQuizChoice}
												class="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 active:scale-95 transition-all duration-150"
												type="button"
											>
												+ Add Choice
											</button>
										</div>
									</div>
									<div>
										<label for="quiz-order" class="block text-sm font-medium text-gray-700">Order</label>
										<input
											id="quiz-order"
											type="number"
											bind:value={quizForm.order}
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
									<div class="flex justify-end gap-2">
										<button
											onclick={() => (showQuizForm = false)}
											class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
										>
											Cancel
										</button>
										<button
											onclick={saveQuizQuestion}
											disabled={loading}
											class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
										>
											{loading ? 'Saving...' : 'Save'}
										</button>
									</div>
								</div>
							</div>
						</div>
					{/if}
				{:else if activeTab === 'analytics'}
					<!-- Analytics Tab -->
					<div class="mb-4">
						<h2 class="text-xl font-semibold text-gray-900">Study Analytics</h2>
						<p class="mt-1 text-sm text-gray-500">Overview of study data and statistics</p>
					</div>

					{#if loading}
						<div class="text-center py-12">
							<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
							<p class="mt-2 text-sm text-gray-500">Loading statistics...</p>
						</div>
					{:else if statistics}
						<div class="space-y-6">
							<!-- Summary Cards -->
							<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
									<div class="text-sm font-medium text-blue-600">Participants</div>
									<div class="text-2xl font-bold text-blue-900 mt-1">{statistics.participants.total}</div>
								</div>
								<div class="bg-green-50 border border-green-200 rounded-lg p-4">
									<div class="text-sm font-medium text-green-600">Sessions</div>
									<div class="text-2xl font-bold text-green-900 mt-1">{statistics.sessions.total}</div>
								</div>
								<div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
									<div class="text-sm font-medium text-purple-600">Quiz Responses</div>
									<div class="text-2xl font-bold text-purple-900 mt-1">{statistics.quiz_performance.total_responses}</div>
								</div>
								<div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
									<div class="text-sm font-medium text-orange-600">Gaze Points</div>
									<div class="text-2xl font-bold text-orange-900 mt-1">{statistics.gaze_points.total.toLocaleString()}</div>
								</div>
							</div>

							<!-- Font Preferences -->
							<div class="bg-white border border-gray-200 rounded-lg p-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Font Preferences</h3>
								{#if statistics.font_preferences.total > 0}
									<div class="space-y-4">
										<div>
											<div class="flex justify-between text-sm mb-1">
												<span>Serif</span>
												<span class="font-medium">{statistics.font_preferences.serif} ({Math.round(statistics.font_preferences.serif / statistics.font_preferences.total * 100)}%)</span>
											</div>
											<div class="w-full bg-gray-200 rounded-full h-4">
												<div class="bg-blue-600 h-4 rounded-full" style="width: {statistics.font_preferences.serif / statistics.font_preferences.total * 100}%"></div>
											</div>
										</div>
										<div>
											<div class="flex justify-between text-sm mb-1">
												<span>Sans-Serif</span>
												<span class="font-medium">{statistics.font_preferences.sans} ({Math.round(statistics.font_preferences.sans / statistics.font_preferences.total * 100)}%)</span>
											</div>
											<div class="w-full bg-gray-200 rounded-full h-4">
												<div class="bg-green-600 h-4 rounded-full" style="width: {statistics.font_preferences.sans / statistics.font_preferences.total * 100}%"></div>
											</div>
										</div>
									</div>
								{:else}
									<p class="text-gray-500 text-sm">No font preference data available</p>
								{/if}
							</div>

							<!-- Quiz Performance -->
							<div class="bg-white border border-gray-200 rounded-lg p-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Quiz Performance</h3>
								{#if statistics.quiz_performance.total_responses > 0}
									<div class="space-y-4">
										<div class="flex items-center justify-between">
											<span class="text-sm text-gray-600">Average Accuracy</span>
											<span class="text-2xl font-bold text-gray-900">{statistics.quiz_performance.average_accuracy.toFixed(1)}%</span>
										</div>
										<div class="flex items-center justify-between">
											<span class="text-sm text-gray-600">Correct Answers</span>
											<span class="text-lg font-semibold text-green-600">{statistics.quiz_performance.correct_answers} / {statistics.quiz_performance.total_responses}</span>
										</div>
										{#if Object.keys(statistics.quiz_performance.by_question).length > 0}
											<div class="mt-4 pt-4 border-t border-gray-200">
												<h4 class="text-sm font-medium text-gray-700 mb-3">Performance by Question</h4>
												<div class="space-y-2">
													{#each Object.entries(statistics.quiz_performance.by_question) as [questionId, perf]}
														<div class="flex items-center justify-between text-sm">
															<span class="text-gray-600">{questionId}</span>
															<span class="font-medium">{perf.correct}/{perf.total} ({perf.accuracy.toFixed(1)}%)</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{:else}
									<p class="text-gray-500 text-sm">No quiz data available</p>
								{/if}
							</div>

							<!-- Reading Times -->
							<div class="bg-white border border-gray-200 rounded-lg p-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Average Reading Times</h3>
								{#if statistics.reading_times.total_sessions > 0}
									<div class="grid grid-cols-2 gap-4">
										<div>
											<div class="text-sm text-gray-600">Serif</div>
											<div class="text-2xl font-bold text-gray-900 mt-1">{(statistics.reading_times.average_serif_ms / 1000).toFixed(1)}s</div>
										</div>
										<div>
											<div class="text-sm text-gray-600">Sans-Serif</div>
											<div class="text-2xl font-bold text-gray-900 mt-1">{(statistics.reading_times.average_sans_ms / 1000).toFixed(1)}s</div>
										</div>
									</div>
								{:else}
									<p class="text-gray-500 text-sm">No reading time data available</p>
								{/if}
							</div>

							<!-- Accuracy Measurements -->
							<div class="bg-white border border-gray-200 rounded-lg p-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Calibration Accuracy</h3>
								{#if statistics.accuracy_measurements.total > 0}
									<div class="space-y-4">
										<div class="flex items-center justify-between">
											<span class="text-sm text-gray-600">Average Accuracy</span>
											<span class="text-2xl font-bold text-gray-900">{statistics.accuracy_measurements.average_accuracy.toFixed(1)}%</span>
										</div>
										<div class="grid grid-cols-2 gap-4">
											<div>
												<div class="text-sm text-gray-600">Passed</div>
												<div class="text-xl font-semibold text-green-600 mt-1">{statistics.accuracy_measurements.passed}</div>
											</div>
											<div>
												<div class="text-sm text-gray-600">Failed</div>
												<div class="text-xl font-semibold text-red-600 mt-1">{statistics.accuracy_measurements.failed}</div>
											</div>
										</div>
									</div>
								{:else}
									<p class="text-gray-500 text-sm">No accuracy data available</p>
								{/if}
							</div>

							<!-- Gaze Points Breakdown -->
							<div class="bg-white border border-gray-200 rounded-lg p-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Gaze Points</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<h4 class="text-sm font-medium text-gray-700 mb-3">By Phase</h4>
										<div class="space-y-2">
											{#each Object.entries(statistics.gaze_points.by_phase) as [phase, count]}
												<div class="flex justify-between text-sm">
													<span class="text-gray-600 capitalize">{phase}</span>
													<span class="font-medium">{count.toLocaleString()}</span>
												</div>
											{:else}
												<p class="text-gray-500 text-sm">No phase data</p>
											{/each}
										</div>
									</div>
									<div>
										<h4 class="text-sm font-medium text-gray-700 mb-3">By Panel</h4>
										<div class="space-y-2">
											{#each Object.entries(statistics.gaze_points.by_panel) as [panel, count]}
												<div class="flex justify-between text-sm">
													<span class="text-gray-600">{panel}</span>
													<span class="font-medium">{count.toLocaleString()}</span>
												</div>
											{:else}
												<p class="text-gray-500 text-sm">No panel data</p>
											{/each}
										</div>
									</div>
								</div>
							</div>

							<!-- Participants by Source -->
							{#if Object.keys(statistics.participants.by_source).length > 0}
								<div class="bg-white border border-gray-200 rounded-lg p-6">
									<h3 class="text-lg font-semibold text-gray-900 mb-4">Participants by Source</h3>
									<div class="space-y-2">
										{#each Object.entries(statistics.participants.by_source) as [source, count]}
											<div class="flex justify-between text-sm">
												<span class="text-gray-600">{source || 'Unknown'}</span>
												<span class="font-medium">{count}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<div class="text-center py-12 text-gray-500">No statistics available</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>

