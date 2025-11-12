<script lang="ts">
  import { QUIZ } from '$lib/studyText';
  import { onMount } from 'svelte';
  import { QuizQuestion, QuizResults } from '$lib/components/quiz';

  let answers: Record<string, number> = {};
  let submitted = false;
  let score = 0;

  // debug: show font assignment & times from previous step
  let meta: Record<string, string | null> = {};
  onMount(() => {
    meta = {
      font_left: sessionStorage.getItem('font_left'),
      font_right: sessionStorage.getItem('font_right'),
      timeA_ms: sessionStorage.getItem('timeA_ms'),
      timeB_ms: sessionStorage.getItem('timeB_ms')
    };
  });

  function handleAnswerChange(questionId: string, answerIndex: number) {
    answers[questionId] = answerIndex;
    answers = { ...answers }; // trigger reactivity
  }

  function submit() {
    submitted = true;
    score = QUIZ.reduce((acc, q) => acc + (answers[q.id] === q.answer ? 1 : 0), 0);
  }
</script>

<div class="min-h-screen bg-white px-4 py-10">
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="text-center space-y-2">
      <h1 class="text-4xl font-light text-gray-900 tracking-tight">Comprehension Quiz</h1>
      <p class="text-gray-500">Answer the questions about the passage you just read.</p>
    </div>

    <div class="rounded-lg border bg-gray-50 px-4 py-3 text-sm text-gray-600">
      <div>Box A time: {meta.timeA_ms ? (Number(meta.timeA_ms)/1000).toFixed(2) + 's' : '—'}</div>
      <div>Box B time: {meta.timeB_ms ? (Number(meta.timeB_ms)/1000).toFixed(2) + 's' : '—'}</div>
      <div>Fonts — Left: {meta.font_left ?? '—'}, Right: {meta.font_right ?? '—'}</div>
    </div>

    <form class="space-y-6" on:submit|preventDefault={submit}>
      {#each QUIZ as q (q.id)}
        <QuizQuestion
          question={q}
          answer={answers[q.id]}
          onAnswerChange={handleAnswerChange}
        />
      {/each}

      <div class="flex items-center gap-3">
        <button
          class="px-6 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
          type="submit"
        >Submit</button>

        {#if submitted}
          <QuizResults score={score} total={QUIZ.length} />
        {/if}
      </div>
    </form>
  </div>
</div>
