import { Redirect } from 'expo-router';

/**
 * Never block on a full-screen spinner here — that caused "infinite loading" when
 * auth/bootstrap misbehaved. Session is resolved on the welcome screen instead.
 */
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
