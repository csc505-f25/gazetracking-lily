<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fetchQuizQuestions, type QuizQuestionResponse, adminGetStatistics } from '$lib/api';
  import { QuizQuestion } from '$lib/components/quiz';
  import { submitCompleteSession } from '$lib/api';
  import { Modal } from '$lib/components';

  let answers: Record<string, number> = {};
  let submitted = false;
  let submitting = false;
  let submitError: string | null = null;
  let currentPage = 0;
  let quizQuestions: QuizQuestionResponse[] = [];
  let loading = true;
  let funStat: string | null = null;
  const questionsPerPage = 5;

  // Fetch quiz questions on mount
  onMount(async () => {
    // Ensure loading starts as true
    loading = true;
    
    // Add a minimum delay to ensure smooth transition and modal visibility
    const minDisplayTime = 800; // 800ms minimum for smoother transition
    const startTime = Date.now();
    
    try {
      const studyTextId = sessionStorage.getItem('study_text_id');
      const passageId = sessionStorage.getItem('current_passage_id');
      
      // Prefer passage-specific questions if available, otherwise use study text questions
      const questions = await fetchQuizQuestions(
        studyTextId ? parseInt(studyTextId, 10) : undefined,
        passageId ? parseInt(passageId, 10) : undefined
      );
      
      if (questions.length > 0) {
        // Remove duplicates based on question ID (keep first occurrence)
        const seen = new Set<string>();
        quizQuestions = questions.filter(q => {
          if (seen.has(q.id)) {
            console.warn(`Duplicate question ID found: ${q.id}, skipping duplicate`);
            return false;
          }
          seen.add(q.id);
          return true;
        });
      } else {
        submitError = 'Failed to load quiz questions. Please refresh the page.';
      }
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      submitError = 'Failed to load quiz questions. Please refresh the page.';
    } finally {
      // Ensure minimum display time for smooth transition
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);
      
      if (remainingTime > 0) {
        setTimeout(() => {
          loading = false;
        }, remainingTime);
      } else {
        loading = false;
      }
    }
  });

  $: totalPages = Math.ceil(quizQuestions.length / questionsPerPage);
  $: currentQuestions = quizQuestions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );

  function handleAnswerChange(questionId: string, answerIndex: number) {
    answers[questionId] = answerIndex;
    answers = { ...answers }; // trigger reactivity
  }

  function nextPage() {
    if (currentPage < totalPages - 1) {
      currentPage++;
    }
  }

  function previousPage() {
    if (currentPage > 0) {
      currentPage--;
    }
  }

  async function submit() {
    if (submitting) return;
    
    submitting = true;
    submitError = null;

    try {
      const success = await submitCompleteSession(answers);
      if (success) {
        // Check if there are more passages to read
        const currentPassageIndex = parseInt(sessionStorage.getItem('current_passage_index') || '0', 10);
        const totalPassages = parseInt(sessionStorage.getItem('total_passages') || '1', 10);
        
        if (currentPassageIndex < totalPassages - 1) {
          // Move to next passage
          const nextPassageIndex = currentPassageIndex + 1;
          sessionStorage.setItem('current_passage_index', String(nextPassageIndex));
          sessionStorage.setItem('current_screen', '1'); // Reset screen counter
          
          // Navigate back to read page for next passage
          goto('/read');
        } else {
          // All passages completed
          submitted = true;
          // Fetch fun statistic
          loadFunStat();
        }
      } else {
        submitError = 'Failed to submit responses. Please try again.';
        submitting = false;
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      submitError = error instanceof Error ? error.message : 'An error occurred while submitting.';
      submitting = false;
    }
  }

  async function loadFunStat() {
    try {
      const stats = await adminGetStatistics();
      const userPreferredFont = sessionStorage.getItem('font_preferred_type');
      const participantId = sessionStorage.getItem('participant_id');
      
      // Build list of available facts
      const facts: string[] = [];
      
      // Fact 1: Most participants prefer [font]
      if (stats.font_preferences.total > 0) {
        const mostPreferred = stats.font_preferences.serif > stats.font_preferences.sans ? 'Serif' : 
                             stats.font_preferences.sans > stats.font_preferences.serif ? 'Sans-Serif' : null;
        if (mostPreferred) {
          facts.push(`Most participants prefer ${mostPreferred} fonts!`);
        }
      }
      
      // Fact 2: Gaze tracking data points
      if (stats.gaze_points.total > 0) {
        const gazePoints = stats.gaze_points.total;
        if (gazePoints >= 1000) {
          facts.push(`Together, we've collected over ${Math.floor(gazePoints / 1000)}K gaze tracking data points!`);
        } else {
          facts.push(`Together, we've collected over ${gazePoints} gaze tracking data points!`);
        }
      }
      
      // Fact 3: Average reading time
      if (stats.reading_times.total_sessions > 0) {
        const avgSerif = stats.reading_times.average_serif_ms / 1000;
        const avgSans = stats.reading_times.average_sans_ms / 1000;
        if (avgSerif > 0 || avgSans > 0) {
          const avgTime = avgSerif > 0 && avgSans > 0 ? (avgSerif + avgSans) / 2 : (avgSerif || avgSans);
          facts.push(`The average participant reads ${avgTime.toFixed(1)} seconds per passage!`);
        }
      }
      
      // Fact 4: User's preferred font with percentage agreement
      if (userPreferredFont && stats.font_preferences.total > 0) {
        const fontName = userPreferredFont === 'serif' ? 'Serif' : 'Sans-Serif';
        const userFontCount = userPreferredFont === 'serif' ? stats.font_preferences.serif : stats.font_preferences.sans;
        const percentage = Math.round((userFontCount / stats.font_preferences.total) * 100);
        facts.push(`Your preferred font is ${fontName}! ${percentage}% of participants agree with you!`);
      }
      
      // Fact 5: Participant number
      if (participantId && stats.participants.total > 0) {
        const participantNum = parseInt(participantId, 10);
        if (participantNum > 0) {
          facts.push(`You're participant #${participantNum} in our study!`);
        }
      }
      
      // Fact 6: User's font matches percentage (similar to fact 4, but different wording)
      if (userPreferredFont && stats.font_preferences.total > 0) {
        const fontName = userPreferredFont === 'serif' ? 'Serif' : 'Sans-Serif';
        const userFontCount = userPreferredFont === 'serif' ? stats.font_preferences.serif : stats.font_preferences.sans;
        const percentage = Math.round((userFontCount / stats.font_preferences.total) * 100);
        // Only add if we don't already have fact 4 (to avoid duplicates)
        if (!facts.some(f => f.includes('agree with you'))) {
          facts.push(`Your preferred font matches ${percentage}% of other participants' choices!`);
        }
      }
      
      // Randomly select one fact to show
      if (facts.length > 0) {
        const randomIndex = Math.floor(Math.random() * facts.length);
        funStat = facts[randomIndex];
      }
    } catch (error) {
      console.error('Error loading fun stat:', error);
      // Fallback to simple preferred font if stats fail
      const userPreferredFont = sessionStorage.getItem('font_preferred_type');
      if (userPreferredFont) {
        const fontName = userPreferredFont === 'serif' ? 'Serif' : 'Sans-Serif';
        funStat = `Your preferred font is ${fontName}!`;
      }
    }
  }
</script>

{#if submitted}
  <!-- Completion Screen -->
  <div class="min-h-screen bg-white flex items-center justify-center px-4">
    <div class="max-w-2xl w-full text-center space-y-6">
      <div class="space-y-4">
        <h1 class="text-5xl font-light text-gray-900 tracking-tight">Thank You!</h1>
        <p class="text-xl text-gray-600">You have completed the study.</p>
        <p class="text-gray-500">Your responses have been recorded.</p>
        {#if funStat}
          <div class="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
            <p class="text-purple-800 text-lg">
              <span class="font-semibold">Did You Know?</span> {funStat}
            </p>
          </div>
        {/if}
      </div>
      <div class="pt-4">
        <button
          class="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
          on:click={() => {
            // Clear all study-related sessionStorage
            sessionStorage.removeItem('current_passage_index');
            sessionStorage.removeItem('current_passage_id');
            sessionStorage.removeItem('current_screen');
            sessionStorage.removeItem('total_passages');
            sessionStorage.removeItem('study_text_id');
            sessionStorage.removeItem('session_db_id');
            sessionStorage.removeItem('session_id');
            sessionStorage.removeItem('calibration_points');
            sessionStorage.removeItem('font_left');
            sessionStorage.removeItem('font_right');
            sessionStorage.removeItem('time_left_ms');
            sessionStorage.removeItem('time_right_ms');
            sessionStorage.removeItem('timeA_ms');
            sessionStorage.removeItem('timeB_ms');
            sessionStorage.removeItem('font_preference');
            sessionStorage.removeItem('font_preferred_type');
            // Clear tournament data
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
              if (key.startsWith('match_') || key.startsWith('tournament_')) {
                sessionStorage.removeItem(key);
              }
            });
            // Navigate to home to start over
            goto('/');
          }}
        >
          Start Over
        </button>
      </div>
    </div>
  </div>
{:else}
  <!-- Loading Modal - Show immediately when loading -->
  <Modal
    open={loading}
    title="Loading"
    message="Loading quiz questions. Please wait..."
    buttonText={null}
    onClose={null}
  />

  <!-- Background (hidden while loading to prevent flicker) -->
  {#if loading}
    <div class="fixed inset-0 bg-white z-0"></div>
  {/if}

  <!-- Quiz Form (completely hidden while loading, with fade transition) -->
  {#if !loading && quizQuestions.length > 0}
    <div class="min-h-screen bg-white px-4 py-10 animate-fade-in">
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="text-center space-y-2">
          <h1 class="text-4xl font-light text-gray-900 tracking-tight">Comprehension Quiz</h1>
          <p class="text-gray-500">Answer the questions about the passage you just read.</p>
        </div>

        <form class="space-y-6" on:submit|preventDefault={submit}>
          {#if submitError}
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {submitError}
            </div>
          {/if}

          {#if currentQuestions.length === 0}
            <div class="text-center py-8">
              <p class="text-red-500">No quiz questions available.</p>
            </div>
          {:else}
            {#each currentQuestions as q, index (q.id + '_' + index)}
              <QuizQuestion
                question={q}
                answer={answers[q.id]}
                onAnswerChange={handleAnswerChange}
              />
            {/each}
          {/if}
        </form>

        <div class="flex items-center justify-between pt-4">
          <button
            type="button"
            class="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={previousPage}
            disabled={currentPage === 0}
          >Previous</button>

          <span class="text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>

          {#if currentPage === totalPages - 1}
            <button
              class="px-6 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              on:click={submit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          {:else}
            <button
              type="button"
              class="px-6 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
              on:click={nextPage}
            >Next</button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-in;
  }
</style>
