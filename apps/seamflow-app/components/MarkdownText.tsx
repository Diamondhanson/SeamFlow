// ============================================================================
// <MarkdownText> — themed markdown for assistant replies.
//
// The model emits markdown MARKERS (**bold**, ## headings, - bullets, tables);
// this component translates them into styled native views so the user never
// sees a raw symbol: bold → semibold in the primary color, headings → compact
// section titles, bullets → proper dots, tables → hairline grid. Everything
// follows the active theme. TTS uses stripMarkdown (RichText.tsx) instead.
// ============================================================================

import Markdown from 'react-native-markdown-display';
import { useAtelierTheme } from '@seamflow/ui';

export function MarkdownText({ children }: { children: string }) {
  const { colors } = useAtelierTheme();
  return (
    <Markdown
      style={{
        body: {
          color: colors.text,
          fontFamily: 'Inter_400Regular',
          fontSize: 15,
          lineHeight: 21,
        },
        paragraph: { marginTop: 0, marginBottom: 6 },
        strong: { fontFamily: 'Inter_600SemiBold', color: colors.primary },
        em: { fontStyle: 'italic' },
        heading1: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 17,
          lineHeight: 22,
          marginTop: 4,
          marginBottom: 4,
        },
        heading2: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 16,
          lineHeight: 21,
          marginTop: 4,
          marginBottom: 4,
        },
        heading3: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 15,
          lineHeight: 20,
          marginTop: 4,
          marginBottom: 2,
        },
        bullet_list: { marginBottom: 4 },
        ordered_list: { marginBottom: 4 },
        list_item: { marginBottom: 2 },
        bullet_list_icon: { color: colors.textMuted },
        ordered_list_icon: { color: colors.textMuted },
        code_inline: {
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 13,
          backgroundColor: colors.surface,
          color: colors.text,
        },
        fence: { backgroundColor: colors.surface, borderColor: colors.hairline },
        code_block: { backgroundColor: colors.surface, borderColor: colors.hairline },
        table: { borderColor: colors.hairline, borderRadius: 6 },
        thead: {},
        th: { padding: 6, fontFamily: 'Inter_600SemiBold' },
        tr: { borderColor: colors.hairline },
        td: { padding: 6 },
        hr: { backgroundColor: colors.hairline },
        blockquote: {
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          marginLeft: 0,
          paddingLeft: 10,
        },
        link: { color: colors.primary },
      }}
    >
      {children}
    </Markdown>
  );
}
