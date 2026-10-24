// ============================================================================
// Where to go the moment someone has signed in.
//
// Sign-in used to send everybody to the designer home. This decides properly:
//
//   1. They came here from something (`?next=` — an enquiry, a design they were
//      looking at): go back to it. They stay on the customer side.
//   2. They own a shop: open their shop.
//   3. Otherwise they are a customer, and stay one. If the account was created
//      a moment ago and nothing sent them here, ask once what brings them
//      (app/choose-role.tsx) — that is the only place a tailor-first person gets
//      the chance to say so.
//
// It waits for the session AND the profile before deciding. Routing on a
// half-loaded state is how a shop owner gets sent to the customer feed.
// ============================================================================

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { isFreshAccount, safeNext } from '../lib/auth-return';
import { useMode } from '../lib/mode';
import { useThemeColors } from '../lib/theme';

/** If no session ever appears, stop waiting rather than spin forever. */
const GIVE_UP_MS = 8000;

export default function PostAuth() {
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(params.next);
  const { session, loading } = useAuth();
  const { mode, ready } = useMode();
  const colors = useThemeColors();

  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setGaveUp(true), GIVE_UP_MS);
    return () => clearTimeout(id);
  }, []);

  if (!session || loading || !ready) {
    // Reached without ever signing in (a stale link): don't strand them here.
    if (gaveUp && !loading && !session) return <Redirect href={'/(client)/discover' as Href} />;
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (next) return <Redirect href={next as Href} />;
  if (mode === 'tailor') return <Redirect href={'/(app)' as Href} />;
  if (isFreshAccount(session.user.created_at)) return <Redirect href={'/choose-role' as Href} />;
  return <Redirect href={'/(client)/discover' as Href} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
