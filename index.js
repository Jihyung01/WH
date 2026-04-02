/**
 * Imports are hoisted, so `initSentry()` must run before `expo-router/entry` loads the tree.
 * Use `require()` for the router entry after Sentry init.
 */
import { initSentry } from './src/config/sentry';

initSentry();

require('expo-router/entry');
