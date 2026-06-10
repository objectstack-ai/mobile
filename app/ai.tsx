import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  Send,
  Sparkles,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Square,
  SquarePen,
  MessagesSquare,
} from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { EmptyState } from "~/components/common/EmptyState";
import { BottomSheet } from "~/components/ui/BottomSheet";
import { MarkdownText } from "~/components/ui/MarkdownText";
import { ToolInvocations } from "~/components/ui/ToolInvocations";
import { cn } from "~/lib/utils";
import { useAIChat, type AIChatMessage } from "~/hooks/useAIChat";

const EXAMPLE_PROMPTS = [
  "What objects can I ask about?",
  "Show me the most recent records",
  "Summarize what's in my workspace",
];

/* ------------------------------------------------------------------ */
/*  Message bubble                                                     */
/* ------------------------------------------------------------------ */

/** Copy-to-clipboard affordance shown under an assistant message. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    void Clipboard.setStringAsync(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <Pressable
      onPress={onCopy}
      accessibilityRole="button"
      accessibilityLabel={copied ? "Copied" : "Copy message"}
      className="mt-1 flex-row items-center gap-1 self-start rounded-md px-1.5 py-1 active:bg-muted"
    >
      {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} color="#94a3b8" />}
      <Text className={cn("text-xs", copied ? "text-green-600" : "text-muted-foreground")}>
        {copied ? "Copied" : "Copy"}
      </Text>
    </Pressable>
  );
}

function MessageBubble({ message }: { message: AIChatMessage }) {
  const isUser = message.role === "user";
  // An assistant turn with no text yet = the reply is still streaming in.
  const isPending = !isUser && message.content.trim() === "";

  return (
    <View className={cn("mb-3 max-w-[85%]", isUser ? "self-end" : "self-start")}>
      {/* Structured tool activity (assistant only) */}
      {!isUser && message.tools && message.tools.length > 0 && (
        <ToolInvocations tools={message.tools} />
      )}
      <View
        className={cn(
          "rounded-2xl px-4 py-2.5",
          isUser ? "bg-primary" : "border border-border bg-card",
        )}
      >
        {isUser ? (
          <Text className="text-base text-primary-foreground">{message.content}</Text>
        ) : isPending ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#64748b" />
            <Text className="text-sm text-muted-foreground">Thinking…</Text>
          </View>
        ) : (
          // Assistant replies are markdown (bold, lists, code, links).
          <MarkdownText>{message.content}</MarkdownText>
        )}
      </View>
      {!isUser && !isPending && <CopyButton text={message.content} />}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function AIAssistantScreen() {
  const {
    messages,
    isLoading,
    error,
    serverBacked,
    conversations,
    conversationId,
    init,
    send,
    retry,
    stop,
    clear,
    newConversation,
    loadConversation,
    removeConversation,
  } = useAIChat();
  const [draft, setDraft] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Probe the server + restore the last conversation on first mount.
  useEffect(() => {
    void init();
  }, [init]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setDraft("");
      void send(trimmed);
    },
    [send, isLoading],
  );

  // Keep the latest message in view.
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length, isLoading]);

  const canSend = draft.trim().length > 0 && !isLoading;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader
        title="AI Assistant"
        right={
          <View className="flex-row items-center">
            {serverBacked ? (
              <>
                <Pressable
                  onPress={() => void newConversation()}
                  accessibilityRole="button"
                  accessibilityLabel="New chat"
                  className="h-9 w-9 items-center justify-center rounded-lg active:bg-muted"
                >
                  <SquarePen size={18} color="#64748b" />
                </Pressable>
                <Pressable
                  onPress={() => setDrawerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Conversation history"
                  className="h-9 w-9 items-center justify-center rounded-lg active:bg-muted"
                >
                  <MessagesSquare size={18} color="#64748b" />
                </Pressable>
              </>
            ) : (
              messages.length > 0 && (
                <Pressable
                  onPress={clear}
                  accessibilityRole="button"
                  accessibilityLabel="Clear conversation"
                  className="h-9 w-9 items-center justify-center rounded-lg active:bg-muted"
                >
                  <Trash2 size={18} color="#64748b" />
                </Pressable>
              )
            )}
          </View>
        }
      />

      {/* Conversations drawer (server-backed mode) */}
      <BottomSheet open={drawerOpen} onOpenChange={setDrawerOpen} title="Conversations">
        <Pressable
          className="mb-1 flex-row items-center gap-3 rounded-lg px-2 py-3 active:bg-muted"
          onPress={() => {
            setDrawerOpen(false);
            void newConversation();
          }}
          accessibilityRole="button"
          accessibilityLabel="Start a new chat"
        >
          <SquarePen size={18} color="#2563eb" />
          <Text className="text-base font-medium text-primary">New chat</Text>
        </Pressable>
        {conversations.length === 0 ? (
          <Text className="px-2 py-4 text-center text-sm text-muted-foreground">
            No saved conversations yet.
          </Text>
        ) : (
          conversations.map((c) => (
            <View key={c.id} className="flex-row items-center">
              <Pressable
                className={cn(
                  "flex-1 rounded-lg px-2 py-3 active:bg-muted",
                  c.id === conversationId && "bg-muted/60",
                )}
                onPress={() => {
                  setDrawerOpen(false);
                  void loadConversation(c.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={c.title ?? "Untitled conversation"}
              >
                <Text className="text-base text-foreground" numberOfLines={1}>
                  {c.title ?? "New conversation"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void removeConversation(c.id)}
                accessibilityRole="button"
                accessibilityLabel="Delete conversation"
                className="h-9 w-9 items-center justify-center rounded-lg active:bg-muted"
              >
                <Trash2 size={16} color="#94a3b8" />
              </Pressable>
            </View>
          ))
        )}
      </BottomSheet>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="px-4 py-4"
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View className="pt-10">
              <EmptyState
                icon={
                  <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles size={36} color="#2563eb" />
                  </View>
                }
                title="Ask the assistant"
                description="Ask a question in plain language and the assistant will answer using your data."
              />
              <View className="mt-2 gap-2">
                {EXAMPLE_PROMPTS.map((p) => (
                  <Pressable
                    key={p}
                    className="rounded-xl border border-border bg-card px-4 py-3 active:bg-muted"
                    onPress={() => submit(p)}
                    accessibilityRole="button"
                    accessibilityLabel={p}
                  >
                    <Text className="text-sm text-card-foreground">{p}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <>
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
            </>
          )}

          {error && (
            <View className="mt-2 items-center gap-2">
              <Text className="text-center text-sm text-destructive">{error.message}</Text>
              <Pressable
                onPress={retry}
                accessibilityRole="button"
                accessibilityLabel="Retry"
                className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 active:bg-muted"
              >
                <RotateCcw size={14} color="#64748b" />
                <Text className="text-sm font-medium text-foreground">Retry</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View className="flex-row items-end gap-2 border-t border-border bg-card px-3 py-2.5">
          <TextInput
            className="max-h-28 flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 text-base text-foreground"
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question…"
            placeholderTextColor="#9ca3af"
            multiline
            onSubmitEditing={() => submit(draft)}
            blurOnSubmit={false}
            accessibilityLabel="Message"
          />
          {isLoading ? (
            <Pressable
              onPress={stop}
              className="h-11 w-11 items-center justify-center rounded-full bg-foreground active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Stop generating"
            >
              <Square size={16} color="#ffffff" fill="#ffffff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => submit(draft)}
              disabled={!canSend}
              className={cn(
                "h-11 w-11 items-center justify-center rounded-full",
                canSend ? "bg-primary active:opacity-80" : "bg-muted",
              )}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !canSend }}
            >
              <Send size={18} color={canSend ? "#ffffff" : "#94a3b8"} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
