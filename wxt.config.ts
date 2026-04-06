import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		permissions: ['tabs', 'activeTab', 'storage'],
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
