import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BotAvatar } from '../bots/BotAvatar';
import { ALL_BOTS, PICKABLE, type BotId } from '../bots/bots';
import { AppBar } from '../components/AppBar';
import { SpendCarousel } from '../components/SpendCarousel';
import { baskets, month, user } from '../data/mock';
import { colors, fonts, radius } from '../theme';

const BASKET_COLORS = [colors.basket1, colors.basket2, colors.basket3];
const BOT_SIZE = 58;

export default function Home() {
  const params = useLocalSearchParams<{ bot?: string }>();
  const botId: BotId = params.bot && params.bot in ALL_BOTS ? (params.bot as BotId) : PICKABLE[0];
  const bot = ALL_BOTS[botId];

  const openChat = (q?: string) => router.push({ pathname: '/chat', params: q ? { bot: botId, q } : { bot: botId } });

  // The bot sits next to the ask bar: a gentle hover and a slow turn from side to side.
  const hover = useSharedValue(0);
  const turn = useSharedValue(-1);
  useEffect(() => {
    hover.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    turn.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [hover, turn]);
  const hoverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -hover.value * 4 }, { rotate: `${turn.value * 5}deg` }, { scaleX: 1 - Math.abs(turn.value) * 0.04 }],
  }));

  const total = baskets.reduce((s, b) => s + b.amount, 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={{ paddingHorizontal: 20 }}>
        <AppBar
          left={
            <View style={styles.profile}>
              <Text style={styles.profileText}>{user.firstName[0]}</Text>
            </View>
          }
          right={
            <Pressable onPress={() => router.push({ pathname: '/scan', params: { bot: botId } })} hitSlop={10}>
              <Ionicons name="scan-outline" size={24} color={colors.text} />
            </Pressable>
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SpendCarousel />

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Baskets</Text>
          <Text style={styles.sectionHint}>{month}</Text>
        </View>
        <View style={styles.card}>
          {baskets.map((b, i) => (
            <Pressable key={b.id} style={[styles.basket, i > 0 && styles.basketDivider]} onPress={() => openChat(`What are ${b.name.toLowerCase()}?`)}>
              <View style={styles.basketTop}>
                <View style={[styles.dot, { backgroundColor: BASKET_COLORS[i] }]} />
                <Text style={styles.basketName}>{b.name}</Text>
                <Text style={styles.basketAmount}>€{b.amount}</Text>
              </View>
              <View style={[styles.track, { height: 4, marginTop: 10 }]}>
                <View style={[styles.fill, { width: `${(b.amount / total) * 100}%`, backgroundColor: BASKET_COLORS[i] }]} />
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.whatIf, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => router.push({ pathname: '/whatif', params: { bot: botId } })}
        >
          <Text style={styles.whatIfTitle}>What if I spent less?</Text>
          <View style={styles.whatIfArrow}>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.game, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => router.push({ pathname: '/sort', params: { bot: botId } })}
        >
          <Ionicons name="swap-horizontal" size={22} color={colors.brand} />
          <Text style={styles.gameTitle}>Sort it</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      </ScrollView>

      {/* Bottom row: the bot on the left, the ask bar next to it. Tapping either opens the chat. */}
      <SafeAreaView edges={['bottom']} style={styles.askWrap}>
        <Svg pointerEvents="none" style={styles.fade} width="100%" height={24}>
          <Defs>
            <LinearGradient id="askFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height={24} fill="url(#askFade)" />
        </Svg>
        <View style={styles.askRow}>
          <Pressable onPress={() => openChat()}>
            <Animated.View style={hoverStyle}>
              <BotAvatar id={botId} size={BOT_SIZE} />
            </Animated.View>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.ask, pressed && { opacity: 0.85 }]} onPress={() => openChat()}>
            <Text style={styles.askText}>Ask {bot.name}</Text>
            <View style={styles.send}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 },
  profile: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  profileText: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 22 },
  track: { height: 6, borderRadius: 99, backgroundColor: colors.hairline, overflow: 'hidden', marginTop: 14 },
  fill: { height: '100%', borderRadius: 99, backgroundColor: colors.brand },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 12, paddingHorizontal: 4 },
  section: { fontSize: 20, fontFamily: fonts.medium, color: colors.text, letterSpacing: -0.4 },
  sectionHint: { fontSize: 13, color: colors.muted, fontFamily: fonts.regular },
  basket: { paddingVertical: 14 },
  basketDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  basketTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  basketName: { flex: 1, fontSize: 16, fontFamily: fonts.regular, color: colors.text },
  basketAmount: { fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  whatIf: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.ink, borderRadius: radius.row, paddingVertical: 18, paddingHorizontal: 20, marginTop: 14 },
  whatIfTitle: { fontSize: 17, fontFamily: fonts.medium, color: '#fff' },
  whatIfArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  game: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.row, paddingVertical: 18, paddingHorizontal: 20, backgroundColor: colors.card, marginTop: 12 },
  gameTitle: { flex: 1, fontSize: 17, fontFamily: fonts.medium, color: colors.text },
  askWrap: { backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 4 },
  fade: { position: 'absolute', top: -24, left: 0, right: 0 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  ask: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill, paddingLeft: 20, paddingRight: 6, height: 54 },
  askText: { flex: 1, fontSize: 16, color: colors.muted, fontFamily: fonts.regular },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
