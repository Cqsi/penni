import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInRight, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar } from '../bots/BotAvatar';
import { ProgressBars } from '../components/OnboardingProgress';
import { SpeechBubble } from '../components/SpeechBubble';
import { lessonStreak, todayLesson, tomorrowLesson, type Step } from '../data/lessons';
import { saveSetup, todayKey, useBotId } from '../lib/setup';
import { colors, fonts, radius } from '../theme';

const WRONG = '#E5484D';
const WRONG_SOFT = '#FDECEC';

const haptic = (kind: 'tap' | 'good' | 'bad') => {
  if (Platform.OS === 'web') return;
  if (kind === 'tap') Haptics.selectionAsync();
  else Haptics.notificationAsync(kind === 'good' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
};

/** Daily lesson: a few short cards with lines on top, a quiz, and a little celebration at the end. */
export default function LessonScreen() {
  const botId = useBotId();
  const lesson = todayLesson();
  const total = lesson.steps.length + 1; // + the "done" card
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [hop, setHop] = useState(0);

  const current: Step | undefined = lesson.steps[step];
  const done = !current;

  const next = () => {
    if (done) return router.back();
    haptic('tap');
    setPicked(null);
    if (step + 1 === lesson.steps.length) {
      saveSetup({ lessonDoneOn: todayKey() });
      haptic('good');
      setTimeout(() => setHop((h) => h + 1), 350);
    }
    setStep(step + 1);
  };

  const pick = (i: number) => {
    if (picked !== null || current?.kind !== 'quiz') return;
    setPicked(i);
    haptic(i === current.answer ? 'good' : 'bad');
  };

  const label = done ? 'Back to home' : current.kind === 'intro' ? 'Start' : 'Continue';
  const blocked = current?.kind === 'quiz' && picked === null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <ProgressBars step={step + 1} total={total} />
      </View>

      <Animated.View key={step} entering={FadeInRight.duration(320)} style={{ flex: 1 }}>
        {done ? (
          <DoneCard botId={botId} hop={hop} />
        ) : current.kind === 'intro' ? (
          <View style={styles.center}>
            <BotAvatar id={botId} size={150} />
            <View style={styles.pill}>
              <Ionicons name={lesson.icon} size={14} color={colors.brand} />
              <Text style={styles.pillText}>Daily lesson · {lesson.minutes} min</Text>
            </View>
            <Text style={[styles.title, { textAlign: 'center' }]}>{current.title}</Text>
            <Text style={[styles.body, { textAlign: 'center' }]}>{current.body}</Text>
          </View>
        ) : current.kind === 'text' ? (
          <View style={styles.content}>
            <View style={styles.icon}>
              <Ionicons name={lesson.icon} size={28} color={colors.brand} />
            </View>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.body}>{current.body}</Text>
            {current.bars && <Bars bars={current.bars} />}
          </View>
        ) : (
          <Quiz step={current} picked={picked} onPick={pick} botId={botId} />
        )}
      </Animated.View>

      <Pressable disabled={blocked} style={({ pressed }) => [styles.cta, blocked && styles.ctaOff, pressed && { opacity: 0.85 }]} onPress={next}>
        <Text style={[styles.ctaText, blocked && { color: colors.muted }]}>{blocked ? 'Pick an answer' : label}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Quiz({ step, picked, onPick, botId }: { step: Extract<Step, { kind: 'quiz' }>; picked: number | null; onPick: (i: number) => void; botId: ReturnType<typeof useBotId> }) {
  const { width } = useWindowDimensions();
  const right = picked === step.answer;
  return (
    <View style={styles.content}>
      <Text style={styles.eyebrow}>Quick question</Text>
      <Text style={styles.title}>{step.question}</Text>
      <View style={{ gap: 10, marginTop: 20 }}>
        {step.options.map((o, i) => {
          const isAnswer = picked !== null && i === step.answer;
          const isWrongPick = picked === i && !right;
          return (
            <Pressable
              key={o}
              onPress={() => onPick(i)}
              style={[styles.option, isAnswer && styles.optionRight, isWrongPick && styles.optionWrong, picked !== null && !isAnswer && !isWrongPick && { opacity: 0.5 }]}
            >
              <Text style={styles.optionText}>{o}</Text>
              {isAnswer && (
                <Animated.View entering={ZoomIn.duration(250)} style={[styles.mark, { backgroundColor: colors.brand }]}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                </Animated.View>
              )}
              {isWrongPick && (
                <Animated.View entering={ZoomIn.duration(250)} style={[styles.mark, { backgroundColor: WRONG }]}>
                  <Ionicons name="close" size={15} color="#fff" />
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </View>
      {picked !== null && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.feedback}>
          <BotAvatar id={botId} size={56} hopSignal={right ? 1 : 0} />
          <SpeechBubble tail="left" text={`${right ? 'Yes! ' : 'Not quite. '}${step.explain}`} maxWidth={Math.min(width, 520) - 48 - 56 - 8} slot={96} />
        </Animated.View>
      )}
    </View>
  );
}

function DoneCard({ botId, hop }: { botId: ReturnType<typeof useBotId>; hop: number }) {
  return (
    <View style={styles.center}>
      <BotAvatar id={botId} size={170} hopSignal={hop} />
      <Text style={[styles.title, { textAlign: 'center', marginTop: 20 }]}>Lesson done!</Text>
      <Animated.View entering={ZoomIn.delay(250).duration(350)} style={styles.streak}>
        <Ionicons name="flame" size={18} color={colors.brand} />
        <Text style={styles.streakText}>{lessonStreak(true)} days in a row</Text>
      </Animated.View>
      <Text style={[styles.body, { textAlign: 'center' }]}>Tomorrow: {tomorrowLesson().title.toLowerCase()}.</Text>
    </View>
  );
}

/** Bars that grow in, with the € value on top. */
function Bars({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map((b) => b.value));
  return (
    <View style={styles.bars}>
      {bars.map((b, i) => (
        <Bar key={b.label} share={b.value / max} delay={150 + i * 120} value={b.value} label={b.label} />
      ))}
    </View>
  );
}

const BAR_H = 150;
function Bar({ share, delay, value, label }: { share: number; delay: number; value: number; label: string }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(share, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [h, share, delay]);
  const style = useAnimatedStyle(() => ({ height: Math.max(6, h.value * BAR_H) }));
  return (
    <View style={styles.barCol}>
      <Text style={styles.barValue}>€{value.toLocaleString('en-US')}</Text>
      <Animated.View style={[styles.bar, style]} />
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, paddingRight: 52 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingTop: 28 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: 12, height: 30, marginTop: 24 },
  pillText: { fontSize: 13, fontFamily: fonts.medium, color: colors.brand },
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  eyebrow: { fontSize: 14, fontFamily: fonts.medium, color: colors.brand, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontFamily: fonts.medium, color: colors.text, letterSpacing: -0.8, marginTop: 12 },
  body: { fontSize: 17, lineHeight: 25, color: colors.muted, fontFamily: fonts.regular, marginTop: 12, maxWidth: 340 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 18, paddingVertical: 14, borderRadius: radius.row, backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'transparent' },
  optionRight: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  optionWrong: { borderColor: WRONG, backgroundColor: WRONG_SOFT },
  optionText: { flex: 1, fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  mark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 16, height: 40, marginTop: 14 },
  streakText: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, backgroundColor: colors.card, borderRadius: radius.card, padding: 20, marginTop: 24 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', maxWidth: 56, borderRadius: 10, backgroundColor: colors.brand },
  barValue: { fontSize: 12, fontFamily: fonts.medium, color: colors.text, marginBottom: 6 },
  barLabel: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 8 },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  ctaOff: { backgroundColor: colors.hairline },
  ctaText: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
});
