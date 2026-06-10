import React, { useMemo } from "react";
import { Linking, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";

/**
 * Render an assistant/chat message as Markdown (bold, lists, code, links,
 * tables) instead of plain text. LLM replies are markdown-heavy, so showing
 * them raw leaks `**`, `-`, and backticks into the UI.
 *
 * Styled to match the app's light surfaces (card foreground text, primary
 * links, muted code blocks). Pure-JS renderer — works on native and web.
 */
export function MarkdownText({ children }: { children: string }) {
  const styles = useMemo(() => markdownStyles, []);
  return (
    <Markdown
      style={styles}
      onLinkPress={(url) => {
        void Linking.openURL(url).catch(() => {});
        return false; // we handled it
      }}
    >
      {children}
    </Markdown>
  );
}

// react-native-markdown-display takes a per-element RN style map.
const markdownStyles = StyleSheet.create({
  body: { color: "#0f172a", fontSize: 16, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: "700" },
  em: { fontStyle: "italic" },
  link: { color: "#2563eb", textDecorationLine: "underline" },
  heading1: { fontSize: 20, fontWeight: "700", marginTop: 4, marginBottom: 6 },
  heading2: { fontSize: 18, fontWeight: "700", marginTop: 4, marginBottom: 6 },
  heading3: { fontSize: 16, fontWeight: "700", marginTop: 4, marginBottom: 4 },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  code_inline: {
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontFamily: "monospace",
    fontSize: 14,
  },
  fence: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 13,
  },
  code_block: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 13,
  },
  blockquote: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderLeftWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  table: { borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 6 },
  th: { padding: 6, fontWeight: "700" },
  td: { padding: 6 },
  hr: { backgroundColor: "#e2e8f0", height: 1, marginVertical: 8 },
});
