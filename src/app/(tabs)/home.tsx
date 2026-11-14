import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '../../components/AppBar';
import { SpendCarousel } from '../../components/SpendCarousel';
import { baskets, month, user } from '../../data/mock';
import { todayLesson } from '../../data/lessons';
import { resetSetup, todayKey, useBotId, useSetup } from '../../lib/setup';
import { TASKS } from '../../lib/tasks';
import { colors, fonts, radius } from '../../theme';

const BASKET_COLORS = [colors.basket1, colors.basket2, colors.basket3];

export default function Home() {
  const botId = useBotId();

  // Ask the coach from Home: switch to the Chat tab with the question (t makes repeats count).
  const openChat = (q: string) => router.navigate({ pathname: '/chat', params: { q, t: String(Date.now()) } });

  const total = baskets.reduce((s, b) => s + b.amount, 0);
  const setup = useSetup();
  const doneCount = TASKS.filter((t) => t.done(setup)).length;
  const lesson = todayLesson();
  const lessonDone = setup.lessonDoneOn === todayKey();

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

        {/* Long-press the heading to undo the tasks (handy for demos). */}
        <Pressable style={styles.sectionRow} onLongPress={resetSetup} delayLongPress={600}>
          <Text style={styles.section}>{doneCount === TASKS.length ? 'Your plan' : 'Start here'}</Text>
          <Text style={styles.sectionHint}>{doneCount === TASKS.length ? 'All set' : `${doneCount} of ${TASKS.length} done`}</Text>
        </Pressable>
        <View style={[styles.card, { paddingVertical: 8 }]}>
          {TASKS.map((t, i) => {
            const done = t.done(setup);
            return (
              <Pressable
                key={t.id}
                style={({ pressed }) => [styles.task, i > 0 && styles.basketDivider, pressed && { opacity: 0.6 }]}
                onPress={() => router.push({ pathname: '/task', params: { id: t.id, bot: botId } })}
              >
                {done ? (
                  <Animated.View entering={ZoomIn.duration(300)} style={[styles.check, styles.checkDone]}>
                    <Ionicons name="checkmark" size={15} color="#fff" />
                  </Animated.View>
                ) : (
                  <View style={styles.check}>
                    <Text style={styles.checkNum}>{i + 1}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <Text style={[styles.taskHint, done && { color: colors.brand }]}>{done ?? t.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            );
          })}
        </View>

        <Pressable style={({ pressed }) => [styles.lesson, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => router.push('/lesson')}>
          <View style={styles.lessonIcon}>
            <Ionicons name={lesson.icon} size={22} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lessonEyebrow}>Daily lesson · {lesson.minutes} min</Text>
            <Text style={styles.gameTitle}>{lesson.title}</Text>
          </View>
          {lessonDone ? (
            <View style={[styles.check, styles.checkDone]}>
              <Ionicons name="checkmark" size={15} color="#fff" />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          )}
        </Pressable>

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
  lesson: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.row, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: colors.card, marginTop: 12 },
  lessonIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  lessonEyebrow: { fontSize: 13, fontFamily: fonts.medium, color: colors.brand, marginBottom: 2 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkNum: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted },
  taskTitle: { fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  taskHint: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
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
});
