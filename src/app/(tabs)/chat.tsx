import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar } from '../../bots/BotAvatar';
import { ALL_BOTS } from '../../bots/bots';
import { suggestions } from '../../data/mock';
import { getChatLog, nextMsgId, setChatLog, useChatLog } from '../../lib/chatLog';
import { askCoach } from '../../lib/coach';
import { useBotId } from '../../lib/setup';
import { colors, fonts, radius } from '../../theme';

export default function Chat() {
  const params = useLocalSearchParams<{ q?: string; t?: string }>();
  const botId = useBotId();
  const bot = ALL_BOTS[botId];

  // Shared with the voice call, so a call shows up here afterwards.
  const messages = useChatLog();
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [hop, setHop] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    const history = [...getChatLog(), { id: nextMsgId(), from: 'me' as const, text: t }];
    setChatLog(history);
    setDraft('');
    setTyping(true);
    const started = Date.now();
    // Real AI via the local server; falls back to scripted answers if it's not running.
    const { text: reply } = await askCoach(
      bot,
      history.map(({ from, text: body }) => ({ from, text: body })),
    );
    // Keep the typing dots up for a moment so fast answers don't feel abrupt.
    setTimeout(() => {
      setChatLog([...getChatLog(), { id: nextMsgId(), from: 'bot', text: reply }]);
      setTyping(false);
      setHop((h) => h + 1);
    }, Math.max(0, 700 - (Date.now() - started)));
  };

  // Opened from a basket on Home: ask that question straight away.
  useEffect(() => {
    if (params.q) send(params.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q, params.t]);

  const asked = messages.some((m) => m.from === 'me');
  const lastBot = [...messages].reverse().find((m) => m.from === 'bot')?.id;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.header}>{bot.name}</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <BotAvatar id={botId} size={104} hopSignal={hop} />
            <Text style={styles.introRole}>{bot.role}</Text>
          </View>

          {messages.map((m, i) => [
            m.via === 'voice' && messages[i - 1]?.via !== 'voice' && (
              <View key={`call-${m.id}`} style={styles.callNote}>
                <Ionicons name="call-outline" size={13} color={colors.muted} />
                <Text style={styles.callNoteText}>Voice call with {bot.name}</Text>
              </View>
            ),
            m.from === 'bot' ? (
              <Animated.View key={m.id} entering={FadeInDown.duration(300)} style={styles.botRow}>
                <View style={styles.avatarSlot}>{m.id === lastBot && !typing && <BotAvatar id={botId} size={34} />}</View>
                <View style={{ flexShrink: 1 }}>
                  <View style={[styles.bubble, styles.botBubble]}>
                    <Text style={styles.botText}>{m.text}</Text>
                  </View>
                </View>
              </Animated.View>
            ) : (
              <Animated.View key={m.id} entering={FadeInDown.duration(250)} style={styles.meRow}>
                <View style={[styles.bubble, styles.meBubble]}>
                  <Text style={styles.meText}>{m.text}</Text>
                </View>
              </Animated.View>
            ),
          ])}

          {typing && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.botRow}>
              <View style={styles.avatarSlot}>
                <BotAvatar id={botId} size={34} />
              </View>
              <View style={[styles.bubble, styles.botBubble, { paddingVertical: 14 }]}>
                <TypingDots />
              </View>
            </Animated.View>
          )}

          {!asked && (
            <Animated.View entering={FadeIn.delay(300)} style={styles.chips}>
              {suggestions.map((s) => (
                <Pressable key={s} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]} onPress={() => send(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <View style={styles.ask}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => send(draft)}
              placeholder={`Ask ${bot.name}`}
              placeholderTextColor={colors.muted}
              style={styles.input}
              returnKeyType="send"
            />
            {draft.trim() ? (
              <Pressable onPress={() => send(draft)} style={styles.send}>
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/voice')} style={[styles.send, styles.mic]} hitSlop={6}>
                <Ionicons name="mic-outline" size={21} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TypingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 160} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0.3, { duration: 320 })), -1));
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: -(v.value - 0.3) * 4 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted }, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { height: 48, lineHeight: 48, textAlign: 'center', fontSize: 17, fontFamily: fonts.medium, color: colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  intro: { alignItems: 'center', paddingTop: 8, paddingBottom: 14 },
  introRole: { fontSize: 14, color: colors.muted, fontFamily: fonts.regular, textAlign: 'center', marginTop: 8, maxWidth: 260, lineHeight: 20 },
  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingRight: 48 },
  meRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingLeft: 64 },
  avatarSlot: { width: 34, alignItems: 'center' },
  bubble: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, flexShrink: 1 },
  botBubble: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: '#D2D2CC', borderBottomLeftRadius: 6 },
  meBubble: { backgroundColor: colors.brand, borderBottomRightRadius: 6 },
  botText: { fontSize: 15, lineHeight: 21, color: colors.text, fontFamily: fonts.regular },
  meText: { fontSize: 15, lineHeight: 21, color: '#fff', fontFamily: fonts.regular },
  callNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 },
  callNoteText: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted },
  note: { fontSize: 11, color: colors.muted, fontFamily: fonts.regular, marginTop: 4, marginLeft: 4 },
  chips: { gap: 8, marginTop: 6, paddingLeft: 42, alignItems: 'flex-start' },
  chip: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.hairline },
  chipText: { fontSize: 14, color: colors.text, fontFamily: fonts.medium },
  inputRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  ask: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill, paddingLeft: 20, paddingRight: 6, height: 54 },
  input: { flex: 1, fontSize: 16, color: colors.text, height: '100%', fontFamily: fonts.regular },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  mic: { backgroundColor: colors.bg },
});
