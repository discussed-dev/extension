import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		name: '__MSG_extensionName__',
		description: '__MSG_extensionDescription__',
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
		// Granted at runtime from the popup; see src/lib/reddit-access.ts
		optional_host_permissions: ['https://old.reddit.com/*'],
		host_permissions: [
			'https://hn.algolia.com/*',
			'https://www.reddit.com/*',
			'https://lobste.rs/*',
			'https://api.anthropic.com/*',
			'https://api.openai.com/*',
			'https://generativelanguage.googleapis.com/*',
		],
		browser_specific_settings: {
			gecko: {
				id: 'discussed@discussed.dev',
				// @ts-expect-error -- AMO's data_collection_permissions is not yet in WXT's manifest types
				data_collection_permissions: {
					required: ['none'],
				},
			},
		},
	},
	hooks: {
		// WXT drops optional_host_permissions for MV2 (Firefox); MV2 lists optional hosts in optional_permissions.
		'build:manifestGenerated': (_wxt, manifest) => {
			if (manifest.manifest_version !== 2) return;
			manifest.optional_permissions = [
				...(manifest.optional_permissions ?? []),
				'https://old.reddit.com/*',
			];
		},
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
