import { Ionicons } from '@expo/vector-icons';
import {
  type AudioPlayer,
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar } from '../bots/BotAvatar';
import { ALL_BOTS } from '../bots/bots';
import { user } from '../data/mock';
import { addToChat } from '../lib/chatLog';
import { askCoach, type ChatMsg, speechUrl, transcribe } from '../lib/coach';
import { useBotId } from '../lib/setup';
import { colors, fonts } from '../theme';

type Phase = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

// Turn-taking: you've said something (≥ 350 ms of voice), then paused for 1.1 s → Penni answers.
const MIN_VOICE_MS = 350;
const PAUSE_MS = 1100;
const IDLE_RESTART_MS = 12000; // nothing said: start a fresh recording so files stay small
const MAX_TURN_MS = 25000;

/** On screen we only show the gist; the full answer is spoken. */
const firstSentence = (t: string) => t.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t;

const tap = (style = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(style);
};

/** Voice mode: a phone-call style screen where you just talk and your bot talks back. */
export default function VoiceCall() {
  const botId = useBotId();
  const bot = ALL_BOTS[botId];

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const rec = useAudioRecorderState(recorder, 100);

  const [phase, setPhase] = useState<Phase>('connecting');
  const phaseRef = useRef<Phase>('connecting');
  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const [caption, setCaption] = useState<{ from: 'bot' | 'me'; text: string } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [hop, setHop] = useState(0);

  const alive = useRef(true);
  const history = useRef<ChatMsg[]>([]);
  const player = useRef<AudioPlayer | null>(null);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vad = useRef({ floor: 0, voiced: 0, silent: 0, last: 0 });
  const pulse = useSharedValue(0.2);

  // ---- speaking -------------------------------------------------------------
  const stopPlayer = () => {
    if (fallback.current) clearTimeout(fallback.current);
    player.current?.remove();
    player.current = null;
  };

  const speak = (text: string) => {
    stopPlayer();
    go('speaking');
    setCaption({ from: 'bot', text });
    setHop((h) => h + 1);
    history.current.push({ from: 'bot', text });
    const done = () => {
      if (player.current !== p) return;
      stopPlayer();
      if (alive.current && phaseRef.current === 'speaking') listen();
    };
    const p = createAudioPlayer({ uri: speechUrl(botId, text) });
    p.addListener('playbackStatusUpdate', (s) => s.didJustFinish && done());
    player.current = p;
    p.play();
    // If the audio never reports that it finished (network hiccup), carry on anyway.
    fallback.current = setTimeout(done, Math.min(30000, 3000 + text.length * 80));
  };

  // ---- listening ------------------------------------------------------------
  const stopRecorder = async () => {
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {}
  };

  const listen = async () => {
    if (!alive.current) return;
    vad.current = { floor: 0, voiced: 0, silent: 0, last: 0 };
    go('listening');
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      go('error');
      setCaption({ from: 'bot', text: 'My ears stopped working. Try ending the call and calling again.' });
    }
  };

  /** You stopped talking: transcribe, ask the coach, answer out loud. */
  const finishTurn = async () => {
    if (phaseRef.current !== 'listening') return;
    go('thinking');
    await stopRecorder();
    const uri = recorder.uri;
    if (!uri || !alive.current) return listen();
    let said = '';
    try {
      said = (await transcribe(uri)).trim();
    } catch {
      return alive.current && speak('Sorry, the line was bad. Could you say that again?');
    }
    if (!alive.current) return;
    if (!said) return listen();
    setCaption({ from: 'me', text: said });
    history.current.push({ from: 'me', text: said });
    const { text: reply } = await askCoach(bot, history.current, true);
    if (alive.current) speak(reply);
  };

  // Voice activity: watch the mic level while listening and decide when your turn is over.
  useEffect(() => {
    if (phaseRef.current !== 'listening' || !rec.isRecording) return;
    const db = rec.metering;
    const t = rec.durationMillis;
    const v = vad.current;
    const dt = Math.max(0, t - v.last);
    v.last = t;
    if (db == null) return; // no metering (web): tap the bot when you're done
    if (!v.floor) v.floor = db;
    const voiced = db > v.floor + 14 && db > -50;
    if (voiced) {
      v.voiced += dt;
      v.silent = 0;
    } else {
      v.silent += dt;
      v.floor = db < v.floor ? db : v.floor + (db - v.floor) * 0.05; // follow the room's noise level
    }
    pulse.value = withTiming(Math.max(0.15, Math.min(1, (db - v.floor) / 28)), { duration: 120 });

    if (v.voiced >= MIN_VOICE_MS && v.silent >= PAUSE_MS) finishTurn();
    else if (v.voiced >= MIN_VOICE_MS && t > MAX_TURN_MS) finishTurn();
    else if (v.voiced < MIN_VOICE_MS && t > IDLE_RESTART_MS) stopRecorder().then(listen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.durationMillis]);

  // ---- call lifecycle ---------------------------------------------------------
  useEffect(() => {
    (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!alive.current) return;
      if (!perm.granted) {
        go('error');
        return setCaption({ from: 'bot', text: 'I need the microphone for calls. You can allow it in Settings.' });
      }
      // Record and play in one session, with sound from the loudspeaker (not the earpiece).
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
      setTimeout(() => alive.current && speak(`Hi ${user.firstName}! What's on your mind?`), 900);
    })();
    return () => {
      alive.current = false;
      stopPlayer();
      stopRecorder();
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'connecting' || phase === 'error') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase === 'connecting' || phase === 'error']);

  // Rings: follow your voice while listening, pulse while the bot talks, breathe while thinking.
  useEffect(() => {
    cancelAnimation(pulse);
    if (phase === 'speaking') {
      pulse.value = withRepeat(withSequence(withTiming(0.85, { duration: 360 }), withTiming(0.35, { duration: 420 })), -1);
    } else if (phase === 'thinking' || phase === 'connecting') {
      pulse.value = withRepeat(withSequence(withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0.15, { duration: 900 })), -1);
    } else if (phase !== 'listening') {
      pulse.value = withTiming(0.1, { duration: 300 });
    }
  }, [phase, pulse]);

  const end = () => {
    tap(Haptics.ImpactFeedbackStyle.Medium);
    alive.current = false;
    stopPlayer();
    stopRecorder();
    // The call shows up in the chat afterwards (if you said anything).
    if (history.current.some((m) => m.from === 'me')) history.current.forEach((m) => addToChat({ ...m, via: 'voice' }));
    if (router.canGoBack()) router.back();
    else router.replace('/chat');
  };

  /** Tap the bot: interrupt it while it talks, or say "I'm done" while you talk. */
  const tapBot = () => {
    if (phaseRef.current === 'speaking') {
      tap();
      stopPlayer();
      listen();
    } else if (phaseRef.current === 'listening' && rec.durationMillis > 600) {
      tap();
      finishTurn();
    }
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const status = {
    connecting: 'Calling…',
    listening: 'Listening',
    thinking: 'Thinking',
    speaking: `${bot.name} is talking`,
    error: 'Can’t hear you',
  }[phase];
  const hint = {
    connecting: '',
    listening: 'Just talk. I’ll answer when you pause.',
    thinking: '',
    speaking: '',
    error: '',
  }[phase];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.name}>{bot.name}</Text>
        <Text style={styles.time}>{phase === 'connecting' ? 'Calling…' : mmss}</Text>
      </View>

      <View style={styles.center}>
        <Pressable onPress={tapBot} style={styles.stage}>
          <Ring pulse={pulse} size={280} grow={0.12} opacity={0.45} />
          <Ring pulse={pulse} size={224} grow={0.09} opacity={0.8} />
          <BotAvatar id={botId} size={190} hopSignal={hop} />
        </Pressable>

        <View style={styles.statusRow}>
          {phase === 'listening' && <View style={styles.liveDot} />}
          <Text style={styles.status}>{status}</Text>
          {phase === 'thinking' && <Dots />}
        </View>

        <View style={styles.captionSlot}>
          {caption && (
            <Animated.Text
              key={caption.text}
              entering={FadeIn.duration(350)}
              numberOfLines={2}
              style={[styles.caption, caption.from === 'me' && styles.captionMe]}
            >
              {caption.from === 'me' ? `“${caption.text}”` : firstSentence(caption.text)}
            </Animated.Text>
          )}
        </View>
        <Text style={styles.hint}>{hint}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={end} style={styles.close} hitSlop={10} accessibilityLabel="End call">
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Ring({ pulse, size, grow, opacity }: { pulse: SharedValue<number>; size: number; grow: number; opacity: number }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.9 + pulse.value * grow }], opacity: 0.35 + pulse.value * 0.65 }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brandSoft, opacity }, style]}
    />
  );
}

function Dots() {
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginLeft: 2 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 160} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    const t = setTimeout(() => {
      v.value = withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0.3, { duration: 320 })), -1);
    }, delay);
    return () => clearTimeout(t);
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.muted }, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 16 },
  top: { alignItems: 'center', marginTop: 24 },
  name: { fontSize: 28, fontFamily: fonts.medium, color: colors.text, letterSpacing: -0.6 },
  time: { fontSize: 15, fontFamily: fonts.medium, color: colors.muted, marginTop: 4, fontVariant: ['tabular-nums'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stage: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, height: 22 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  status: { fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  captionSlot: { height: 64, justifyContent: 'center', marginTop: 10, maxWidth: 320 },
  caption: { fontSize: 18, lineHeight: 26, fontFamily: fonts.regular, color: colors.text, textAlign: 'center' },
  captionMe: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  hint: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, height: 18 },
  controls: { alignItems: 'center', paddingBottom: 8 },
  close: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});

