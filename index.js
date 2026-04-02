/**
 * All `import` statements are hoisted to the top of the module. So this was WRONG:
 *   import { initSentry } from '...';
 *   initSentry();
 *   import 'expo-router/entry';
 * Both imports run before `initSentry()`, meaning the entire expo-router tree loaded first.
 *
 * Use `require()` so `initSentry()` runs before `expo-router/entry` executes.
 */
import { initSentry } from './src/config/sentry';

initSentry();

require('expo-router/entry');

// Extra dismiss attempts at the earliest moment after RN registers (expo-router can block hide).
const SplashScreen = require('expo-splash-screen');
function hideSplash() {
  SplashScreen.hideAsync().catch(() => {});
}
hideSplash();
setImmediate(hideSplash);
setTimeout(hideSplash, 0);
setTimeout(hideSplash, 50);
setTimeout(hideSplash, 200);
