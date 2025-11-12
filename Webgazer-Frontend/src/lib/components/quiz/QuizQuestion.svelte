<script lang="ts">
  import type { QuizQuestionResponse } from '$lib/api';

  export let question: QuizQuestionResponse;
  export let answer: number | undefined = undefined;
  export let onAnswerChange: (questionId: string, answerIndex: number) => void;
</script>

<fieldset class="border rounded-lg p-4">
  <legend class="text-lg font-medium mb-2">{question.prompt}</legend>
  <div class="space-y-2">
    {#each question.choices as choice, idx}
      <label class="flex items-center gap-2">
        <input
          type="radio"
          name={question.id}
          value={idx}
          on:change={() => onAnswerChange(question.id, idx)}
          checked={answer === idx}
        />
        <span>{choice}</span>
      </label>
    {/each}
  </div>
</fieldset>

