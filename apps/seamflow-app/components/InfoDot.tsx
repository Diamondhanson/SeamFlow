// ============================================================================
// <InfoDot> — a small ⓘ tap target that explains a potentially confusing term
// in one plain sentence. Tapping opens a simple info dialog. Drop it next to a
// label: <Text>Owner</Text><InfoDot title=… message=… />.
// ============================================================================

import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAtelierTheme } from '@seamflow/ui';
import { useDialog } from '../lib/dialog';

export function InfoDot({
  title,
  message,
  size = 16,
}: {
  title: string;
  message: string;
  size?: number;
}) {
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  return (
    <Pressable
      onPress={() => void dialog.alert({ title, message, tone: 'info' })}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Ionicons name="information-circle-outline" size={size} color={colors.textMuted} />
    </Pressable>
  );
}
