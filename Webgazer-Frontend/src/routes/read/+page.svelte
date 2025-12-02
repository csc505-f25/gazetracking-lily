<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  import { fetchStudyText, submitGazePoint, type Passage } from '$lib/api';
  import { WebGazerManager, Modal } from '$lib/components';
  import { ReadingPanel } from '$lib/components/reading';
  import { webgazerStore } from '$lib/stores/webgazer';
  import {
    initializeTournament,
    recordMatchResult,
    getCurrentMatch,
    getFontInfo,
    FONT_POOL,
    type TournamentState,
    type FontName
  } from '$lib/fonts';

  let wgInstance: any = null;
  let started = false;
  let doneA = false;
  let doneB = false;
  let t0 = 0;
  let timeA = 0;
  let timeB = 0;
  let fontPreference: 'A' | 'B' | null = null;
  let loading = true;
  let showInstructionModal = false;
  let showQuizTransitionModal = false;
  
  // Tournament state
  let tournament: TournamentState | null = null;
  let currentMatch: ReturnType<typeof getCurrentMatch> = null;
  
  // Passage management (for reading content)
  let passages: Passage[] = [];
  let currentPassageIndex = 0;
  let currentPassage: Passage | null = null;
  let currentScreen = 1; // Track which screen (1-4) for current passage
  const SCREENS_PER_PASSAGE = 4;
  
  // Store tournament results
  let matchResults: Array<{
    matchId: string;
    round: number;
    bracket: string;
    fontA: FontName;
    fontB: FontName;
    winner: FontName;
    timeA: number;
    timeB: number;
  }> = [];

  // Gaze data collection
  let gazeCollectionInterval: ReturnType<typeof setInterval> | null = null;
  let sessionDbId: number | null = null;
  let gazeBuffer: Array<{ x: number; y: number; panel: string; phase: string; timestamp: number }> = [];
  const GAZE_COLLECTION_INTERVAL = 100; // Collect gaze every 100ms
  const GAZE_BATCH_SIZE = 10; // Submit in batches of 10 points

  // Gaze indicator (red dot) - set to false for production deployment
  const SHOW_GAZE_INDICATOR = true;
  let currentGaze: { x: number; y: number } | null = null;
  let hasGaze = false;
  let gazeUnsubscribe: (() => void) | null = null;

  // Fetch study text on mount
  onMount(async () => {
    // Get session ID from sessionStorage
    const sessionIdStr = sessionStorage.getItem('session_db_id');
    if (sessionIdStr) {
      sessionDbId = parseInt(sessionIdStr, 10);
    }

    // Initialize tournament
    tournament = initializeTournament();
    currentMatch = getCurrentMatch(tournament);

    const textData = await fetchStudyText();
    if (textData) {
      sessionStorage.setItem('study_text_id', String(textData.id));
      
      // Handle multiple passages
      if (textData.passages && textData.passages.length > 0) {
        passages = textData.passages.sort((a: Passage, b: Passage) => a.order - b.order);
      } else if (textData.content) {
        // Legacy: use single content field
        const legacyPassage: Passage = {
          id: 0,
          study_text_id: textData.id,
          order: 0,
          content: textData.content,
          font_left: textData.font_left,
          font_right: textData.font_right
        };
        passages = [legacyPassage];
      } else {
        loading = false;
        return;
      }
      
      // Restore passage state from sessionStorage if coming back from quiz
      const savedPassageIndex = sessionStorage.getItem('current_passage_index');
      const savedScreen = sessionStorage.getItem('current_screen');
      
      if (savedPassageIndex !== null) {
        currentPassageIndex = parseInt(savedPassageIndex, 10);
      }
      if (savedScreen !== null) {
        currentScreen = parseInt(savedScreen, 10);
      }
      
      // Ensure we have a valid passage
      if (currentPassageIndex >= passages.length) {
        // All passages completed
        loading = false;
        return;
      }
      
      currentPassage = passages[currentPassageIndex];
      
      // Store current passage info in sessionStorage
      sessionStorage.setItem('current_passage_id', String(currentPassage.id));
      sessionStorage.setItem('current_passage_index', String(currentPassageIndex));
      sessionStorage.setItem('current_screen', String(currentScreen));
      sessionStorage.setItem('total_passages', String(passages.length));
    } else {
      loading = false;
      return;
    }
    loading = false;

    // Start gaze collection
    startGazeCollection();

    // Subscribe to gaze store for indicator
    if (SHOW_GAZE_INDICATOR) {
      gazeUnsubscribe = webgazerStore.subscribe((state) => {
        currentGaze = state.currentGaze;
        hasGaze = state.hasGaze;
      });
    }

    // Show instruction modal for first match
    showInstructionModal = true;
  });

  onDestroy(() => {
    // Stop gaze collection
    stopGazeCollection();
    // Submit any remaining buffered gaze points
    submitBufferedGazePoints();
    // Unsubscribe from gaze store
    if (gazeUnsubscribe) {
      gazeUnsubscribe();
    }
  });

  function handleWebGazerInitialized(instance: any) {
    wgInstance = instance;
    // Hide video & overlays during reading
    instance.showVideo(false)
      .showFaceOverlay(false)
      .showFaceFeedbackBox(false)
      .showPredictionPoints(false);
  }

  // Determine which panel the gaze is on based on x coordinate
  function getPanelFromGaze(x: number): string {
    const screenWidth = window.innerWidth;
    const midpoint = screenWidth / 2;
    return x < midpoint ? 'A' : 'B';
  }

  // Get current reading phase based on which panel user is looking at
  function getCurrentPhase(panel: string): string {
    if (!started) return 'waiting';
    
    if (panel === 'A') {
      return 'reading_A';
    } else if (panel === 'B') {
      return 'reading_B';
    }
    
    if (!doneA) return 'reading_A';
    if (!doneB) return 'reading_B';
    return 'completed';
  }

  // Collect gaze data periodically
  function startGazeCollection() {
    if (gazeCollectionInterval) return;

    gazeCollectionInterval = setInterval(() => {
      if (!sessionDbId) {
        const sessionIdStr = sessionStorage.getItem('session_db_id');
        if (sessionIdStr) {
          sessionDbId = parseInt(sessionIdStr, 10);
        } else {
          return;
        }
      }

      if (!started) {
        return;
      }

      const gazeState = get(webgazerStore);
      if (gazeState.currentGaze && gazeState.hasGaze) {
        const panel = getPanelFromGaze(gazeState.currentGaze.x);
        const phase = getCurrentPhase(panel);

        gazeBuffer.push({
          x: gazeState.currentGaze.x,
          y: gazeState.currentGaze.y,
          panel: panel,
          phase: phase,
          timestamp: Date.now()
        });

        if (gazeBuffer.length >= GAZE_BATCH_SIZE) {
          submitBufferedGazePoints();
        }
      }
    }, GAZE_COLLECTION_INTERVAL);
  }

  function stopGazeCollection() {
    if (gazeCollectionInterval) {
      clearInterval(gazeCollectionInterval);
      gazeCollectionInterval = null;
    }
  }

  async function submitBufferedGazePoints() {
    if (gazeBuffer.length === 0 || !sessionDbId) {
      return;
    }

    const promises = gazeBuffer.map(point =>
      submitGazePoint({
        session_id: sessionDbId!,
        x: point.x,
        y: point.y,
        panel: point.panel,
        phase: point.phase
      }).catch((error) => {
        console.error('Failed to submit gaze point:', error, point);
        return false;
      })
    );

    await Promise.allSettled(promises);
    gazeBuffer = [];
  }

  function start() {
    if (started) return;
    started = true;
    t0 = performance.now();
  }

  function handleInstructionModalClose() {
    showInstructionModal = false;
    setTimeout(() => {
      start();
    }, 100);
  }

  function handleQuizTransitionModalClose() {
    showQuizTransitionModal = false;
    goto('/quiz');
  }

  function completeA() {
    if (!started || doneA) return;
    timeA = performance.now() - t0;
    doneA = true;
    t0 = performance.now();
  }

  function completeB() {
    if (!started || doneB) return;
    timeB = performance.now() - t0;
    doneB = true;
  }

  async function selectFontPreference(preference: 'A' | 'B') {
    if (!currentMatch || !tournament || fontPreference !== null) return;
    
    await submitBufferedGazePoints();
    
    fontPreference = preference;
    const winner = preference === 'A' ? currentMatch.fontA! : currentMatch.fontB!;
    
    // Store match info before updating tournament
    const matchId = currentMatch.id;
    const matchRound = currentMatch.round;
    const matchBracket = currentMatch.bracket;
    const matchFontA = currentMatch.fontA!;
    const matchFontB = currentMatch.fontB!;
    
    // Record match result
    tournament = recordMatchResult(tournament, matchId, winner);
    currentMatch = getCurrentMatch(tournament);
    
    // Store match result
    matchResults.push({
      matchId: matchId,
      round: matchRound,
      bracket: matchBracket,
      fontA: matchFontA,
      fontB: matchFontB,
      winner: winner,
      timeA: timeA,
      timeB: timeB
    });
    
    // Store in sessionStorage
    const matchKey = `match_${matchId}`;
    sessionStorage.setItem(`${matchKey}_winner`, winner);
    sessionStorage.setItem(`${matchKey}_timeA`, String(timeA));
    sessionStorage.setItem(`${matchKey}_timeB`, String(timeB));
    
    // Check if tournament is complete
    if (tournament.finalWinner) {
      // Tournament complete - save all results
      saveTournamentResults();
      
      // Check if we've completed 4 screens for current passage
      if (currentScreen >= SCREENS_PER_PASSAGE) {
        // All screens done for this passage - show transition modal
        showQuizTransitionModal = true;
        return;
      } else {
        // Move to next screen of same passage
        currentScreen++;
        sessionStorage.setItem('current_screen', String(currentScreen));
        // Reset for next screen (same passage, new match)
        setTimeout(() => {
          resetForNextMatch();
        }, 1000);
        return;
      }
    }
    
    // Tournament not complete yet - check if we've done 4 screens for current passage
    if (currentScreen >= SCREENS_PER_PASSAGE) {
      // 4 screens done, but tournament not complete - show transition modal
      // (tournament will continue after quiz)
      showQuizTransitionModal = true;
      return;
    }
    
    // Move to next screen of same passage
    currentScreen++;
    sessionStorage.setItem('current_screen', String(currentScreen));
    
    // Reset for next match (next screen of same passage)
    setTimeout(() => {
      resetForNextMatch();
    }, 1000);
  }

  function resetForNextMatch() {
    started = false;
    doneA = false;
    doneB = false;
    fontPreference = null;
    timeA = 0;
    timeB = 0;
    t0 = 0;
  }

  function saveTournamentResults() {
    // Save tournament data to sessionStorage
    sessionStorage.setItem('tournament_results', JSON.stringify(matchResults));
    sessionStorage.setItem('tournament_winner', tournament?.finalWinner || '');
    sessionStorage.setItem('tournament_eliminated', JSON.stringify(tournament?.eliminated || []));
    
    // Also save in legacy format for backward compatibility
    if (matchResults.length > 0) {
      const lastMatch = matchResults[matchResults.length - 1];
      sessionStorage.setItem('font_preference', lastMatch.winner === lastMatch.fontA ? 'A' : 'B');
      sessionStorage.setItem('font_preferred_type', getFontInfo(lastMatch.winner).displayName);
      sessionStorage.setItem('timeA_ms', String(lastMatch.timeA));
      sessionStorage.setItem('timeB_ms', String(lastMatch.timeB));
    }
  }

  $: currentFontA = currentMatch?.fontA ? getFontInfo(currentMatch.fontA) : null;
  $: currentFontB = currentMatch?.fontB ? getFontInfo(currentMatch.fontB) : null;

</script>

<WebGazerManager
  showVideo={false}
  showFaceOverlay={false}
  showFaceFeedbackBox={false}
  showPredictionPoints={false}
  onInitialized={handleWebGazerInitialized}
/>

<!-- Instruction Modal -->
<Modal
  open={showInstructionModal}
  title="Reading Instructions"
  message="Please read the passage carefully. You will be asked comprehension questions about the content after you finish reading. Take your time to understand the material."
  buttonText="Start Reading"
  onClose={handleInstructionModalClose}
/>

<!-- Quiz Transition Modal -->
<Modal
  open={showQuizTransitionModal}
  title="Ready for Comprehension Questions"
  message="You have completed reading this passage. You will now be asked comprehension questions to verify your understanding. Please answer the questions based on what you just read."
  buttonText="Continue to Quiz"
  onClose={handleQuizTransitionModalClose}
/>

<div class="min-h-screen bg-gray-100 flex flex-col">
  {#if loading}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-gray-500">Loading study text...</p>
    </div>
  {:else if !currentPassage || currentPassageIndex >= passages.length}
    <!-- All Passages Complete -->
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">All Passages Complete!</h1>
        <p class="text-2xl text-gray-700 mb-2">
          {tournament?.finalWinner ? `Font Winner: ${getFontInfo(tournament.finalWinner).displayName}` : 'Thank you for participating!'}
        </p>
        <p class="text-lg text-gray-500">You have finished reading all passages.</p>
      </div>
    </div>
  {:else if currentMatch && currentPassage}
    <div class="flex-1 flex flex-col items-center justify-center px-8 py-10 bg-gray-100">
      <div class="flex-1 w-full flex flex-col items-center justify-center gap-8 px-8">
        <div class="text-center mb-6">
          <h1 class="text-4xl font-light text-gray-900 tracking-tight">Which font do you prefer?</h1>
          <p class="text-lg text-gray-600 mt-2">
            Passage {currentPassageIndex + 1} of {passages.length} — Screen {currentScreen} of {SCREENS_PER_PASSAGE}
          </p>
        </div>
        
        <div class="w-full flex items-center justify-center gap-100">
          <!-- Font A -->
          <div class="flex-1 max-w-2xl flex flex-col items-center gap-8">
            <ReadingPanel
              class="bg-white border-1 border-gray-200 w-full"
              label="Font A"
              fontName={currentMatch.fontA!}
              text={currentPassage.content}
            />
            <button
              class="px-10 py-3 mt-5 rounded-lg bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     {fontPreference === 'A' ? 'bg-gray-100 border-gray-500' : ''}"
              on:click={() => selectFontPreference('A')}
              disabled={fontPreference !== null}
            >
              Choose Font A
            </button>
          </div>

          <!-- Font B -->
          <div class="flex-1 max-w-2xl flex flex-col items-center gap-8">
            <ReadingPanel
              class="bg-white border-1 border-gray-200 w-full"
              label="Font B"
              fontName={currentMatch.fontB!}
              text={currentPassage.content}
            />
            <button
              class="px-10 py-3 mt-5 rounded-lg bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     {fontPreference === 'B' ? 'bg-gray-100 border-gray-500' : ''}"
              on:click={() => selectFontPreference('B')}
              disabled={fontPreference !== null}
            >
              Choose Font B
            </button>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-gray-500">No match available. Please refresh the page.</p>
    </div>
  {/if}
</div>

<!-- Gaze indicator (red dot) -->
{#if SHOW_GAZE_INDICATOR && hasGaze && currentGaze}
  <div
    class="fixed w-4 h-4 rounded-full ring-2 ring-white pointer-events-none z-50 transition-opacity duration-100"
    style={`left:${currentGaze.x - 8}px; top:${currentGaze.y - 8}px; background: rgba(239, 68, 68, 0.9); box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);`}
    aria-label="Current gaze position"
    aria-hidden="true"
  ></div>
{/if}
