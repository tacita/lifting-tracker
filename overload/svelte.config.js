import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// BASE_PATH is set by CI to '/lifting-tracker' for GitHub Pages.
// Locally it's empty so the dev server works at http://localhost:5173.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		}),
		paths: { base },
		alias: {
			$lib: './src/lib'
		}
	}
};

export default config;
