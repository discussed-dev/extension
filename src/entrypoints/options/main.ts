import { mount } from 'svelte';
import App from './App.svelte';
import './options.css';

document.documentElement.lang = browser.i18n.getUILanguage();

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element');

mount(App, { target });
