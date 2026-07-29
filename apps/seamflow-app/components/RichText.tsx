// ============================================================================
// Markdown-lite for AI output.
//
// The models emit `**bold**` emphasis; raw asterisks look broken in the UI and
// sound worse when read aloud by TTS. Two tools:
//
//   <RichText>    — renders a string with **segments** as bold, accent-colored
//                   text (everything else untouched). No other markdown.
//   stripMarkdown — flattens **/*/_/# markers to plain text, for places that
//                   can only hold plain strings (captions, TTS speech).
// ============================================================================

import { StyleSheet } from 'react-native';
import { Text, useAtelierTheme, type TextProps } from '@seamflow/ui';

/** Remove markdown markers, keeping the inner text — for plain-text targets
 *  (captions) and TTS, so the voice never reads symbols aloud. */
export function stripMarkdown(s: string): string {
  return (
    s
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/(^|[^\w*])\*([^*\s][^*\n]*?)\*(?![\w*])/g, '$1$2')
      .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*]\s+/gm, '')
      // Table rows: drop separator lines entirely, read cells as a sentence.
      .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, '')
      .replace(/^\s*\|(.+)\|\s*$/gm, (_m, row: string) =>
        row.split('|').map((c: string) => c.trim()).filter(Boolean).join(', '),
      )
      .replace(/\n{3,}/g, '\n\n')
  );
}

/**
 * Render a string with `**bold**` spans emphasized (semibold + primary color).
 * All other characters render as-is under the given Text props.
 */
export function RichText({
  children,
  ...textProps
}: TextProps & { children: string }) {
  const { colors } = useAtelierTheme();
  const parts = children.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) {
    return <Text {...textProps}>{children}</Text>;
  }
  return (
    <Text {...textProps}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
          <Text
            key={i}
            {...textProps}
            style={[textProps.style, styles.em, { color: colors.primary }]}
          >
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Custom fonts don't synthesize bold on Android — use the semibold face.
  em: { fontFamily: 'Inter_600SemiBold' },
});
