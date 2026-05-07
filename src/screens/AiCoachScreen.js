import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  loadCoachHistoryFromAsync,
  persistCoachHistoryToAsync,
  sendAiCoachMessage,
} from '../utils/aiCoach';

export default function AiCoachScreen({
  state,
  onClose,
  onAfterExchange,
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromParent = Array.isArray(state?.aiCoachHistory)
        ? state.aiCoachHistory
        : [];
      const fromAsync = await loadCoachHistoryFromAsync();
      const pick =
        fromParent.length >= fromAsync.length ? fromParent : fromAsync;
      if (!cancelled) {
        setMessages(pick);
        if (pick.length && fromParent.length < fromAsync.length) {
          await persistCoachHistoryToAsync(pick);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state?.aiCoachHistory]);

  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvt, () => {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    });
    return () => sub.remove();
  }, []);

  const send = useCallback(async () => {
    const t = input.trim();
    if (!t || loading || !state) return;
    setError(null);
    setLoading(true);
    setInput('');
    try {
      const result = await sendAiCoachMessage({
        state,
        userText: t,
        history: messages,
      });
      setMessages(result.history);
      await onAfterExchange?.({
        history: result.history,
        actions: result.actions,
      });
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    } catch (e) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, onAfterExchange, state]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.mainColumn}>
          <View style={styles.topBar}>
            <Text style={styles.headerTitle}>🤖 AI Coach</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeTap}>
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errBanner}>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          <FlatList
            ref={flatListRef}
            style={styles.listFlex}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                Hỏi coach về streak, thể dục hoặc thói quen — tiếng Việt, thân
                thiện.
              </Text>
            }
            renderItem={({ item }) => {
              const isUser = item.role === 'user';
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    isUser ? styles.bubbleRowUser : styles.bubbleRowAi,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isUser ? styles.bubbleUser : styles.bubbleAi,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isUser ? styles.bubbleTextUser : styles.bubbleTextAi,
                      ]}
                    >
                      {item.text}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        </View>

        <View style={styles.inputWrap}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#d4af37" />
              <Text style={styles.loadingHint}>Đang suy nghĩ…</Text>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Nhắn cho AI Coach…"
              placeholderTextColor="#6a6570"
              editable={!loading}
              multiline
              onSubmitEditing={send}
            />
            <Pressable
              style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
              onPress={send}
              disabled={loading || !input.trim()}
            >
              <Text style={styles.sendBtnText}>Gửi</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c10' },
  flex: { flex: 1 },
  mainColumn: { flex: 1, minHeight: 0 },
  listFlex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a38',
  },
  headerTitle: {
    color: '#f3eee6',
    fontSize: 20,
    fontWeight: '800',
  },
  closeTap: { paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { color: '#d4af37', fontWeight: '700', fontSize: 15 },
  errBanner: {
    backgroundColor: '#2a1616',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#4a2a2a',
  },
  errText: { color: '#f0c4c4', fontSize: 13 },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  empty: {
    color: '#5c5766',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAi: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '86%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleAi: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2a3a55',
  },
  bubbleUser: {
    backgroundColor: '#3d3520',
    borderColor: '#5c4f2a',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextAi: { color: '#e8e4dc' },
  bubbleTextUser: { color: '#f5f0e6' },
  inputWrap: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a38',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#0c0c10',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
  loadingHint: { color: '#8a8580', fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#12121a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#e8e4dc',
    borderWidth: 1,
    borderColor: '#2a2a38',
    fontSize: 16,
  },
  sendBtn: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: {
    color: '#0c0c10',
    fontWeight: '800',
    fontSize: 15,
  },
});
