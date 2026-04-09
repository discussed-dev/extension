import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		default_locale: 'en',
		permissions: ['tabs', 'activeTab', 'storage', 'scripting'],
		commands: {
			_execute_action: {
				suggested_key: {
					default: 'Alt+D',
					mac: 'Alt+D',
				},
				description: 'Open Discussed popup',
			},
		},
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
				data_collection_permissions: {
					required: ['none'],
				},
			},
		},
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
