import React, { useMemo } from "react";
import { Linking, StyleSheet } from "react-native";
import { useColorScheme } from "nativewind";
import Markdown from "react-native-markdown-display";

/**
 * Render an assistant/chat message as Markdown (bold, lists, code, links,
 * tables) instead of plain text. LLM replies are markdown-heavy, so showing
 * them raw leaks `**`, `-`, and backticks into the UI.
 *
 * Theme-aware: the styles were hardcoded to light surfaces, which left the
 * body text near-black (and code blocks pale) — unreadable once dark mode
 * shipped. Pure-JS renderer — works on native and web.
 */
export function MarkdownText({ children }: { children: string }) {
  const { colorScheme } = useColorScheme();
  const styles = useMemo(
    () => buildMarkdownStyles(colorScheme === "dark"),
    [colorScheme],
  );
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

/** Slate-scale palette per theme for the markdown elements. */
function buildMarkdownStyles(dark: boolean) {
  const text = dark ? "#e2e8f0" : "#0f172a";
  const link = dark ? "#60a5fa" : "#2563eb";
  const codeBg = dark ? "#1e293b" : "#f1f5f9";
  const border = dark ? "#334155" : "#e2e8f0";
  const quoteBg = dark ? "#1e293b" : "#f8fafc";
  const quoteBorder = dark ? "#475569" : "#cbd5e1";

  // react-native-markdown-display takes a per-element RN style map.
  return StyleSheet.create({
    body: { color: text, fontSize: 16, lineHeight: 23 },
    paragraph: { marginTop: 0, marginBottom: 8 },
    strong: { fontWeight: "700" },
    em: { fontStyle: "italic" },
    link: { color: link, textDecorationLine: "underline" },
    heading1: { fontSize: 20, fontWeight: "700", marginTop: 4, marginBottom: 6 },
    heading2: { fontSize: 18, fontWeight: "700", marginTop: 4, marginBottom: 6 },
    heading3: { fontSize: 16, fontWeight: "700", marginTop: 4, marginBottom: 4 },
    bullet_list: { marginBottom: 4 },
    ordered_list: { marginBottom: 4 },
    list_item: { marginBottom: 2 },
    code_inline: {
      backgroundColor: codeBg,
      color: text,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
      fontFamily: "monospace",
      fontSize: 14,
    },
    fence: {
      backgroundColor: codeBg,
      color: text,
      borderColor: border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontFamily: "monospace",
      fontSize: 13,
    },
    code_block: {
      backgroundColor: codeBg,
      color: text,
      borderColor: border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontFamily: "monospace",
      fontSize: 13,
    },
    blockquote: {
      backgroundColor: quoteBg,
      borderColor: quoteBorder,
      borderLeftWidth: 3,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    table: { borderColor: border, borderWidth: 1, borderRadius: 6 },
    th: { padding: 6, fontWeight: "700" },
    td: { padding: 6 },
    hr: { backgroundColor: border, height: 1, marginVertical: 8 },
  });
}
