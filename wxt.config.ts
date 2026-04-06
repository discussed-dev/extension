import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		permissions: ['tabs', 'activeTab', 'storage'],
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
