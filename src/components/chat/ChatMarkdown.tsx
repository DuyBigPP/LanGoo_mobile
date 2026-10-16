import * as React from "react";
import { Platform, StyleSheet, Text } from "react-native";
import Markdown, { type RenderRules } from "react-native-markdown-display";
import { radius, spacing, useTheme, type Theme } from "@/theme";

const MONO_FONT = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

/** Đoạn văn bản bôi đen được -> bôi đen + Copy sẽ mở phiếu tra nhanh (xem ClipboardLookup). */
const SELECTABLE_RULES: RenderRules = {
  textgroup: (node, children) => (
    <Text key={node.key} selectable>
      {children}
    </Text>
  ),
};

/** Markdown cho câu trả lời AI — style theo theme, chỉ hiển thị (không HTML). */
export function ChatMarkdown({ content }: { content: string }) {
  const theme = useTheme();
  const markdownStyles = React.useMemo(() => createMarkdownStyles(theme), [theme]);
  return (
    <Markdown style={markdownStyles} rules={SELECTABLE_RULES}>
      {content}
    </Markdown>
  );
}

/** Style markdown (tiêu đề, danh sách, code, bảng, trích dẫn...). */
function createMarkdownStyles(theme: Theme) {
  const heading = {
    fontWeight: theme.fontWeight.bold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  };
  const codeBlock = {
    fontFamily: MONO_FONT,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
  };

  return StyleSheet.create({
    body: {
      fontFamily: "Be Vietnam Pro",
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      lineHeight: 22,
    },
    paragraph: { marginTop: 0, marginBottom: spacing.sm },
    strong: { fontWeight: theme.fontWeight.bold },
    em: { fontStyle: "italic" },
    link: { color: theme.colors.primary, textDecorationLine: "underline" },
    heading1: { ...heading, fontSize: theme.fontSize.xl },
    heading2: { ...heading, fontSize: theme.fontSize.lg },
    heading3: { ...heading, fontSize: theme.fontSize.md },
    bullet_list: { marginTop: 0, marginBottom: spacing.sm },
    ordered_list: { marginTop: 0, marginBottom: spacing.sm },
    list_item: { marginBottom: 2 },
    code_inline: { ...codeBlock, paddingHorizontal: 4, borderRadius: radius.sm },
    fence: {
      ...codeBlock,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    blockquote: {
      backgroundColor: theme.colors.primarySoft,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    hr: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginVertical: spacing.sm,
    },
    table: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      marginBottom: spacing.sm,
    },
    th: { padding: 6, fontWeight: theme.fontWeight.bold },
    td: { padding: 6 },
    tr: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  });
}
