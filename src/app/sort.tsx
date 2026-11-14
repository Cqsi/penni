import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { BotAvatar } from '../bots/BotAvatar';
import { ALL_BOTS, PICKABLE, type BotId } from '../bots/bots';
import { ScreenHeader } from '../components/ScreenHeader';
import { SpeechBubble } from '../components/SpeechBubble';
import { baskets, sortCards } from '../data/mock';
import { colors, fonts, radius } from '../theme';

const BASKET_COLORS = [colors.basket1, colors.basket2, colors.basket3];
const DROP_Y = 90; // how far down the card must be dragged to count as a drop
const SIDE_X = 45; // how far sideways picks basket 1 or 3 instead of 2
const FLY_Y = 250; // roughly where the baskets sit below the card

const haptic = (ok: boolean) => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
};

export default function SortGame() {
  const params = useLocalSearchParams<{ bot?: string }>();
  const botId: BotId = params.bot && params.bot in ALL_BOTS ? (params.bot as BotId) : PICKABLE[0];
  const { width } = useWindowDimensions();
  const zoneSpacing = (Math.min(width, 480) - 40) / 3;

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [line, setLine] = useState('Drag each purchase into the right basket.');
  const [hop, setHop] = useState(0);
  const [result, setResult] = useState<{ picked: number; correct: number } | null>(null);
  const locked = useRef(false);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const out = useSharedValue(0);

  const done = index >= sortCards.length;
  const card = sortCards[Math.min(index, sortCards.length - 1)];

  // Fly the card into a basket. Runs on the UI thread straight from the gesture, so there's no lag.
  const flyTo = (zone: number) => {
    'worklet';
    const fly = { duration: 230, easing: Easing.out(Easing.cubic) };
    x.value = withTiming((zone - 2) * zoneSpacing, fly);
    y.value = withTiming(FLY_Y, fly);
    out.value = withTiming(1, fly);
  };

  const answer = (picked: number, alreadyFlying = false) => {
    if (locked.current || done) return;
    locked.current = true;
    if (!alreadyFlying) flyTo(picked);
    const ok = picked === card.basket;
    haptic(ok);
    if (ok) setScore((s) => s + 1);
    setResult({ picked, correct: card.basket });
    setLine(ok ? `Yes! ${card.why}` : `Not quite. ${card.why}`);
    setHop((h) => h + 1);

    // Next card right away; the bot's explanation stays up while you play on.
    setTimeout(() => {
      x.value = 0;
      y.value = 0;
      out.value = 0;
      setResult(null);
      setIndex((i) => i + 1);
      locked.current = false;
    }, 520);
  };

  // Stable function for the gesture worklet to call back into JS with the latest state.
  const answerRef = useRef(answer);
  answerRef.current = answer;
  const onDrop = useRef((zone: number) => answerRef.current(zone, true)).current;

  const pan = usePanGesture({
    onUpdate: (e) => {
      'worklet';
      x.value = e.translationX;
      y.value = e.translationY;
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > DROP_Y) {
        const zone = e.translationX < -SIDE_X ? 1 : e.translationX > SIDE_X ? 3 : 2;
        flyTo(zone);
        scheduleOnRN(onDrop, zone);
      } else {
        x.value = withSpring(0, { damping: 18, stiffness: 240 });
        y.value = withSpring(0, { damping: 18, stiffness: 240 });
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: 1 - out.value * 0.9,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${x.value / 18}deg` },
      { scale: 1 - out.value * 0.65 },
    ],
  }));

  const restart = () => {
    setIndex(0);
    setScore(0);
    setLine('Round two! Let’s go.');
    setHop((h) => h + 1);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={{ paddingHorizontal: 20, flex: 1 }}>
        <ScreenHeader
          icon="close"
          right={
            <View style={styles.xp}>
              <Ionicons name="sparkles" size={13} color={colors.brand} />
              <Text style={styles.xpText}>{score * 10} XP</Text>
            </View>
          }
        />
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(Math.min(index, sortCards.length) / sortCards.length) * 100}%` }]} />
        </View>

        {done ? (
          <View style={styles.end}>
            <SpeechBubble text={score >= 6 ? 'You’re a basket pro! I learned a lot from you.' : 'Nice try! Want another round?'} />
            <BotAvatar id={botId} size={170} hopSignal={hop + 1} />
            <Text style={styles.endScore}>
              {score} / {sortCards.length}
            </Text>
            <Text style={styles.endSub}>
              +{score * 10} XP
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 28, alignSelf: 'stretch' }}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={restart}>
                <Text style={[styles.btnText, { color: colors.text }]}>Play again</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => router.back()}>
                <Text style={styles.btnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.stage}>
              <SpeechBubble text={line} maxWidth={280} />
              <BotAvatar id={botId} size={84} hopSignal={hop} />
            </View>

            <View style={styles.cardArea}>
              <Animated.View key={index} entering={ZoomIn.duration(200)} style={styles.cardWrap}>
              <GestureDetector gesture={pan}>
                <Animated.View style={[styles.card, cardStyle]}>
                  <View style={styles.cardIcon}>
                    <Ionicons name={card.icon as keyof typeof Ionicons.glyphMap} size={26} color={colors.text} />
                  </View>
                  <Text style={styles.merchant}>{card.merchant}</Text>
                  <Text style={styles.meta}>
                    {card.category} · {card.date}
                  </Text>
                  <Text style={styles.cardAmount}>€{card.amount.toFixed(2).replace('.', ',')}</Text>
                </Animated.View>
              </GestureDetector>
              </Animated.View>
            </View>

            <Text style={styles.hint}>Drag into a basket</Text>
            <View style={styles.zones}>
              {baskets.map((b, i) => (
                <Zone key={b.id} index={i} name={b.name} x={x} y={y} result={result} onPress={() => answer(b.id)} />
              ))}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Zone({
  index,
  name,
  x,
  y,
  result,
  onPress,
}: {
  index: number;
  name: string;
  x: SharedValue<number>;
  y: SharedValue<number>;
  result: { picked: number; correct: number } | null;
  onPress: () => void;
}) {
  const id = index + 1;
  const color = BASKET_COLORS[index];
  const hover = useAnimatedStyle(() => {
    const zone = x.value < -SIDE_X ? 1 : x.value > SIDE_X ? 3 : 2;
    const active = y.value > DROP_Y * 0.6 && zone === id;
    return { transform: [{ scale: withSpring(active ? 1.08 : 1) }], borderColor: active ? color : 'transparent' };
  });

  const isCorrect = result?.correct === id;
  const isWrongPick = result && result.picked === id && !isCorrect;

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Animated.View
        style={[
          styles.zone,
          hover,
          isCorrect && { borderColor: colors.brand, backgroundColor: colors.brandSoft },
          isWrongPick && { borderColor: '#E5484D', backgroundColor: '#FDECEC' },
        ]}
      >
        <View style={[styles.zoneBadge, { backgroundColor: colors.brandSoft }]}>
          {isCorrect ? (
            <Ionicons name="checkmark" size={18} color={colors.brand} />
          ) : (
            <Text style={[styles.zoneNum, { color: colors.basket1 }]}>{id}</Text>
          )}
        </View>
        <Text style={styles.zoneName}>{name}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  xp: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
  xpText: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  progressTrack: { height: 6, borderRadius: 99, backgroundColor: colors.hairline, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.brand, borderRadius: 99 },
  stage: { alignItems: 'center', marginTop: 8 },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  cardWrap: { width: '86%', maxWidth: 340 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  merchant: { fontSize: 20, fontFamily: fonts.medium, color: colors.text, marginTop: 14, letterSpacing: -0.3 },
  meta: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted, marginTop: 4 },
  cardAmount: { fontSize: 36, fontFamily: fonts.light, color: colors.text, marginTop: 12, letterSpacing: -1 },
  hint: { textAlign: 'center', fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginBottom: 10 },
  zones: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  zone: { backgroundColor: colors.card, borderRadius: radius.row, paddingVertical: 14, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: 'transparent' },
  zoneBadge: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  zoneNum: { fontSize: 16, fontFamily: fonts.medium },
  zoneName: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  endScore: { fontSize: 48, fontFamily: fonts.light, color: colors.text, marginTop: 16, letterSpacing: -1 },
  endSub: { fontSize: 15, fontFamily: fonts.regular, color: colors.muted, marginTop: 6, textAlign: 'center' },
  btn: { flex: 1, height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: colors.card },
  btnText: { color: '#fff', fontSize: 16, fontFamily: fonts.medium },
});
