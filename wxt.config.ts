import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		permissions: ['tabs', 'activeTab', 'storage'],
		host_permissions: [
			'https://hn.algolia.com/*',
			'https://www.reddit.com/*',
			'https://lobste.rs/*',
			'https://api.anthropic.com/*',
			'https://api.openai.com/*',
			'https://generativelanguage.googleapis.com/*',
			'https://api.github.com/*',
		],
		browser_specific_settings: {
			gecko: {
				id: 'discussed@discussed.dev',
			},
		},
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
