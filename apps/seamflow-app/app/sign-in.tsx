import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../lib/auth-context';
import { config, devLoginEnabled } from '../lib/config';
import { colors, spacing } from '../lib/theme';

export default function SignIn() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: string, p: string) => {
    setSubmitting(true);
    try {
      await signInWithPassword(e, p);
      router.replace('/(app)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      Alert.alert('Sign in failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.brand}>SeamFlow</Text>
        <Text style={styles.subtitle}>Tailor CRM</Text>
      </View>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />

      <Button
        label="Sign in"
        onPress={() => submit(email, password)}
        loading={submitting}
        disabled={!email || !password}
      />

      {devLoginEnabled ? (
        <View style={styles.devSection}>
          <View style={styles.divider} />
          <Text style={styles.devNote}>Development build</Text>
          <Button
            label="Continue as dev"
            variant="secondary"
            onPress={() => submit(config.devEmail!, config.devPassword!)}
            loading={submitting}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  brand: { color: colors.text, fontSize: 36, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 16, marginTop: 4 },
  devSection: { marginTop: spacing.xl },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  devNote: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
