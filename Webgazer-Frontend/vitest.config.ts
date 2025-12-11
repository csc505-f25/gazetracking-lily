import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'node',
		// Exclude Svelte files and other non-test files
		exclude: ['node_modules', 'dist', '.svelte-kit']
	}
});
