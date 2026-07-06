// ============================================================================
// Dialog system — the app-wide replacement for React Native's `Alert`.
//
// One global <DialogProvider> (mounted at the root) hosts a single centered
// dialog and a bottom-sheet picker. Screens never manage modal state: they
// call the imperative `useDialog()` hook, which returns promise-based methods:
//
//   const dialog = useDialog();
//   await dialog.error(err);                                  // OK-only
//   await dialog.alert({ title, message, tone: 'success' });  // OK-only
//   if (await dialog.confirm({ title, message, destructive })) { … }
//   const phone = await dialog.prompt({ title, placeholder }); // string | null
//   const action = await dialog.choose({ title, actions });    // value | null
//   const key = await dialog.pick({ title, options });         // key | null
//
// `alert`/`confirm`/`prompt`/`choose` render as a centered card. `pick` (long
// dynamic lists — clients, templates, owners) renders as a scrollable bottom
// sheet via <OptionSheet>. Nothing in the app should call `Alert.*` anymore.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, spacing, radii, type SemanticColors } from '@seamflow/ui';
import { Button } from '../components/Button';
import { OptionSheet, type SheetOption } from '../components/OptionSheet';
import { useTranslation } from './i18n';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type DialogTone = 'info' | 'success' | 'warning' | 'error';

interface CenteredBase {
  title: string;
  message?: string;
  tone?: DialogTone;
}

export interface AlertOptions extends CenteredBase {
  okLabel?: string;
}

export interface ConfirmOptions extends CenteredBase {
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the danger color. */
  destructive?: boolean;
}

export interface PromptOptions extends CenteredBase {
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  keyboardType?: TextInput['props']['keyboardType'];
  /** Disable confirm while the field is empty. Default true. */
  requireValue?: boolean;
}

export interface ChooseAction<T = string> {
  label: string;
  value: T;
  destructive?: boolean;
}

export interface ChooseOptions<T = string> extends CenteredBase {
  actions: ChooseAction<T>[];
  cancelLabel?: string;
}

export interface PickOptions {
  title: string;
  options: SheetOption[];
  selectedKey?: string;
}

export interface DialogApi {
  alert(opts: AlertOptions): Promise<void>;
  /** Convenience for error paths — pulls `.message` off an Error. */
  error(err: unknown, opts?: { title?: string }): Promise<void>;
  confirm(opts: ConfirmOptions): Promise<boolean>;
  prompt(opts: PromptOptions): Promise<string | null>;
  choose<T = string>(opts: ChooseOptions<T>): Promise<T | null>;
  pick(opts: PickOptions): Promise<string | null>;
}

// ----------------------------------------------------------------------------
// Internal request shape
// ----------------------------------------------------------------------------

type Request =
  | ({ kind: 'alert' } & AlertOptions)
  | ({ kind: 'confirm' } & ConfirmOptions)
  | ({ kind: 'prompt' } & PromptOptions)
  | ({ kind: 'choose' } & ChooseOptions<unknown>)
  | ({ kind: 'pick' } & PickOptions);

interface Pending {
  id: number;
  req: Request;
  resolve: (value: unknown) => void;
}

// ----------------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------------

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<Pending | null>(null);
  const queue = useRef<Pending[]>([]);
  const idRef = useRef(0);

  const enqueue = useCallback((req: Request) => {
    return new Promise<unknown>((resolve) => {
      const p: Pending = { id: ++idRef.current, req, resolve };
      setPending((cur) => {
        if (cur) {
          queue.current.push(p);
          return cur;
        }
        return p;
      });
    });
  }, []);

  // Resolve the visible dialog, then surface the next queued one (so rapid
  // successive calls — e.g. an error right after another — don't stomp).
  const finish = useCallback((value: unknown) => {
    setPending((cur) => {
      cur?.resolve(value);
      return queue.current.shift() ?? null;
    });
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      alert: (o) => enqueue({ kind: 'alert', tone: 'info', ...o }) as Promise<void>,
      error: (err, o) =>
        enqueue({
          kind: 'alert',
          tone: 'error',
          title: o?.title ?? t('common.error'),
          message: err instanceof Error ? err.message : String(err),
        }) as Promise<void>,
      confirm: (o) => enqueue({ kind: 'confirm', ...o }) as Promise<boolean>,
      prompt: (o) => enqueue({ kind: 'prompt', ...o }) as Promise<string | null>,
      choose: <T,>(o: ChooseOptions<T>) =>
        enqueue({ kind: 'choose', ...(o as ChooseOptions<unknown>) }) as Promise<T | null>,
      pick: (o) => enqueue({ kind: 'pick', ...o }) as Promise<string | null>,
    }),
    [enqueue, t],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      <DialogHost pending={pending} onResolve={finish} />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within <DialogProvider>');
  return ctx;
}

// ----------------------------------------------------------------------------
// Host — renders the active request
// ----------------------------------------------------------------------------

function DialogHost({
  pending,
  onResolve,
}: {
  pending: Pending | null;
  onResolve: (value: unknown) => void;
}) {
  if (!pending) return null;

  // Long dynamic lists get a bottom sheet; everything else is centered.
  if (pending.req.kind === 'pick') {
    const req = pending.req;
    return (
      <OptionSheet
        visible
        title={req.title}
        options={req.options}
        selectedKey={req.selectedKey ?? ''}
        onSelect={(key) => onResolve(key)}
        onClose={() => onResolve(null)}
      />
    );
  }

  // key by id so the prompt's TextInput state resets cleanly per request.
  return <CenteredDialog key={pending.id} req={pending.req} onResolve={onResolve} />;
}

const TONE_ICON: Record<DialogTone, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  error: 'alert-circle',
};

const TONE_COLOR: Record<DialogTone, keyof SemanticColors> = {
  info: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
};

function CenteredDialog({
  req,
  onResolve,
}: {
  req: Exclude<Request, { kind: 'pick' }>;
  onResolve: (value: unknown) => void;
}) {
  const { t } = useTranslation();
  const { colors, shadows } = useAtelierTheme();
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState(req.kind === 'prompt' ? req.defaultValue ?? '' : '');

  const tone = req.tone ?? 'info';
  const toneColor = colors[TONE_COLOR[tone]];

  // Backdrop tap = the safe/cancel outcome for each kind.
  const onBackdrop = () => {
    switch (req.kind) {
      case 'confirm':
        return onResolve(false);
      case 'prompt':
      case 'choose':
        return onResolve(null);
      default:
        return onResolve(undefined);
    }
  };

  const cardEntering = reduceMotion ? FadeIn.duration(120) : ZoomIn.springify().damping(18).mass(0.7);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onBackdrop} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View entering={cardEntering}>
            {/* Swallow taps so pressing the card doesn't dismiss. */}
            <Pressable
              style={[styles.card, { backgroundColor: colors.overlay }, shadows.xl]}
              onPress={() => {}}
            >
              <View style={[styles.iconWrap, { backgroundColor: withToneWash(toneColor) }]}>
                <Ionicons name={TONE_ICON[tone]} size={26} color={toneColor} />
              </View>

              <Text variant="h3" tone="text" style={styles.title}>
                {req.title}
              </Text>
              {req.message ? (
                <Text variant="bodySm" tone="textMuted" style={styles.message}>
                  {req.message}
                </Text>
              ) : null}

              {req.kind === 'prompt' ? (
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={req.placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={req.keyboardType}
                  autoFocus
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.hairline,
                      backgroundColor: colors.surface,
                    },
                  ]}
                />
              ) : null}

              <View style={styles.actions}>{renderActions(req, t, text, onResolve)}</View>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function renderActions(
  req: Exclude<Request, { kind: 'pick' }>,
  t: (k: string) => string,
  text: string,
  onResolve: (value: unknown) => void,
): ReactNode {
  switch (req.kind) {
    case 'alert':
      return (
        <Button label={req.okLabel ?? t('common.ok')} onPress={() => onResolve(undefined)} />
      );

    case 'confirm':
      return (
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Button
              label={req.cancelLabel ?? t('common.cancel')}
              variant="secondary"
              onPress={() => onResolve(false)}
            />
          </View>
          <View style={styles.rowItem}>
            <Button
              label={req.confirmLabel ?? t('common.ok')}
              variant={req.destructive ? 'danger' : 'primary'}
              onPress={() => onResolve(true)}
            />
          </View>
        </View>
      );

    case 'prompt': {
      const empty = (req.requireValue ?? true) && text.trim().length === 0;
      return (
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Button
              label={req.cancelLabel ?? t('common.cancel')}
              variant="secondary"
              onPress={() => onResolve(null)}
            />
          </View>
          <View style={styles.rowItem}>
            <Button
              label={req.confirmLabel ?? t('common.ok')}
              disabled={empty}
              onPress={() => onResolve(text.trim())}
            />
          </View>
        </View>
      );
    }

    case 'choose':
      return (
        <View style={styles.stack}>
          {req.actions.map((a, i) => (
            <Button
              key={i}
              label={a.label}
              variant={a.destructive ? 'danger' : 'secondary'}
              onPress={() => onResolve(a.value)}
            />
          ))}
          <Button
            label={req.cancelLabel ?? t('common.cancel')}
            variant="ghost"
            onPress={() => onResolve(null)}
          />
        </View>
      );
  }
}

// A faint wash of the tone color behind the header icon.
function withToneWash(color: string): string {
  // colors are hex tokens; produce a low-alpha rgba wash.
  if (color.startsWith('#')) {
    const h = color.slice(1);
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const r = parseInt(f.slice(0, 2), 16);
    const g = parseInt(f.slice(2, 4), 16);
    const b = parseInt(f.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.12)`;
  }
  return color;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  kav: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.l,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.s,
  },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    marginTop: spacing.l,
    fontSize: 16,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: spacing.l,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  rowItem: {
    flex: 1,
  },
  stack: {
    gap: spacing.s,
  },
});
