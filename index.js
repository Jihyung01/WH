/**
 * Imports are hoisted, so `initSentry()` must run before `expo-router/entry` loads the tree.
 * Use `require()` for the router entry after Sentry init.
 *
 * TaskManager.defineTask MUST run in global scope before any screen loads. If it only ran via
 * a tab screen import, iOS could wake the app for geofencing while JS never executed that module,
 * causing "Task 'wherehere-geofence-task' not found" and failed startGeofencingAsync.
 * @see https://docs.expo.dev/versions/latest/sdk/task-manager/
 */
import { initSentry } from './src/config/sentry';

initSentry();

try {
  require('./src/services/geofencing');
} catch (e) {
  console.warn('[tasks] geofencing defineTask failed:', e);
}
try {
  require('./src/services/backgroundLocation');
} catch (e) {
  console.warn('[tasks] backgroundLocation defineTask failed:', e);
}

require('expo-router/entry');
