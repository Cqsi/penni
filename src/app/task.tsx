import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar } from '../bots/BotAvatar';
import { ALL_BOTS, PICKABLE, type BotId } from '../bots/bots';
import { ScreenHeader } from '../components/ScreenHeader';
import { SpeechBubble } from '../components/SpeechBubble';
import { saveSetup, useSetup } from '../lib/setup';
import { GOALS, TASKS, type TaskId } from '../lib/tasks';
import { colors, fonts, radius } from '../theme';

const STEP = 10;
const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

/** One "Start here" task: pick an amount (and a goal), see what it means, save. */
export default function Task() {
  const params = useLocalSearchParams<{ id?: string; bot?: string }>();
  const botId: BotId = params.bot && params.bot in ALL_BOTS ? (params.bot as BotId) : PICKABLE[0];
  const task = TASKS.find((t) => t.id === params.id) ?? TASKS[0];
  const setup = useSetup();
  const { width } = useWindowDimensions();

  const saved = task.id === 'budget' ? setup.budget : task.id === 'goal' ? setup.goal?.amount : setup.leaks;
  const [value, setValue] = useState(saved ?? task.start);
  const [goal, setGoal] = useState(setup.goal?.name ?? GOALS[0].name);

  const change = (v: number) => {
    tap();
    setValue(Math.max(STEP, v));
  };

  const save = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const patch = { budget: { budget: value }, goal: { goal: { name: goal, amount: value } }, leaks: { leaks: value } }[task.id as TaskId];
    saveSetup(patch);
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Start here" icon="close" />

      <View style={styles.botRow}>
        <BotAvatar id={botId} size={64} />
        <SpeechBubble tail="left" text={task.tip(value, goal)} maxWidth={Math.min(width, 520) - 48 - 64 - 8} slot={84} />
      </View>

      <Text style={styles.question}>{task.question}</Text>

      {task.id === 'goal' && (
        <View style={styles.goals}>
          {GOALS.map((g) => {
            const active = g.name === goal;
            return (
              <Pressable
                key={g.name}
                onPress={() => {
                  tap();
                  setGoal(g.name);
                }}
                style={[styles.goal, active && styles.goalActive]}
              >
                <Ionicons name={g.icon} size={18} color={active ? colors.brand : colors.text} />
                <Text style={[styles.goalText, active && { color: colors.brand }]}>{g.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.card}>
        <Pressable onPress={() => change(value - STEP)} style={styles.step} hitSlop={8}>
          <Ionicons name="remove" size={24} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.amount}>€{value}</Text>
          <Text style={styles.unit}>{task.unit}</Text>
        </View>
        <Pressable onPress={() => change(value + STEP)} style={styles.step} hitSlop={8}>
          <Ionicons name="add" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.presets}>
        {task.presets.map((p) => (
          <Pressable key={p} onPress={() => change(p)} style={[styles.preset, p === value && styles.presetActive]}>
            <Text style={[styles.presetText, p === value && { color: '#fff' }]}>€{p}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <Pressable style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]} onPress={save}>
        <Text style={styles.ctaText}>Save</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 12 },
  botRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  question: { fontSize: 28, lineHeight: 34, fontFamily: fonts.medium, color: colors.text, marginTop: 24, letterSpacing: -0.8 },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'transparent' },
  goalActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  goalText: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.card, padding: 22, marginTop: 18 },
  step: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 44, fontFamily: fonts.medium, color: colors.text, letterSpacing: -1.5 },
  unit: { fontSize: 14, color: colors.muted, fontFamily: fonts.regular, marginTop: -2 },
  presets: { flexDirection: 'row', gap: 8, marginTop: 12 },
  preset: { flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  presetActive: { backgroundColor: colors.ink },
  presetText: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
});
