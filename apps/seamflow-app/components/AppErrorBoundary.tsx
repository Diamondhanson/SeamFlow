// ============================================================================
// <AppErrorBoundary> — the screen a tailor sees instead of the app closing.
//
// React unmounts the whole tree when a render throws and nothing catches it.
// With no boundary anywhere, one bad render on one screen took down everything:
// the tailor's app vanished, mid-task, with no explanation and nothing to tap.
//
// This sits inside the providers and around the router, which is the useful
// place: it has the theme and the translations, and it catches every screen.
// A failure in a provider ITSELF is above it and would still close the app —
// rarer, and it would need a second, dependency-free boundary further out.
//
// "Try again" remounts the subtree by changing the key. That genuinely fixes
// the common case, which is a screen rendering against data in an unexpected
// shape: the remount refetches, and the second attempt usually succeeds. It is
// not a guess — a crash loop just lands back here rather than killing the app.
// ============================================================================

import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Button } from './Button';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import { reportCrash } from '../lib/crash-reporting';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  /** Bumped on retry so the subtree remounts from scratch. */
  generation: number;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, generation: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    // The whole point of the boundary: somebody finds out.
    reportCrash(error, { componentStack: info.componentStack ?? undefined });
  }

  private retry = (): void => {
    this.setState((s) => ({ error: null, generation: s.generation + 1 }));
  };

  render(): ReactNode {
    if (this.state.error) {
      return <CrashScreen onRetry={this.retry} />;
    }
    // `key` is what makes retry a real remount rather than a re-render of the
    // same failing elements.
    return <View key={this.state.generation} style={styles.fill}>{this.props.children}</View>;
  }
}

/**
 * Split out as a function component so it can use the theme and translation
 * hooks — a class cannot, and an English-only crash screen would be the wrong
 * thing to show in a product whose main market reads French.
 */
function CrashScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();

  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={44} color={colors.textMuted} />
      <Text variant="h3" style={styles.title}>
        {t('errors.crashTitle')}
      </Text>
      <Text variant="bodySm" tone="textMuted" style={styles.body}>
        {t('errors.crashBody')}
      </Text>
      <View style={styles.action}>
        <Button label={t('common.retry')} onPress={onRetry} fullWidth={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  title: { textAlign: 'center', marginTop: spacing.md },
  body: { textAlign: 'center' },
  action: { marginTop: spacing.lg },
});
