import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

document.documentElement.lang = browser.i18n.getUILanguage();

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element');

const app = mount(App, { target });

export default app;
