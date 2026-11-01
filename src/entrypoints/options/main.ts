import { t } from '@/lib/i18n';
import { mount } from 'svelte';
import App from './App.svelte';
import './options.css';

document.documentElement.lang = browser.i18n.getUILanguage();
// The static <title> in index.html can't use i18n; it stays as the fallback.
document.title = `Discussed — ${t('settings')}`;

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element');

mount(App, { target });
