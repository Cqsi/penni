import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar } from '../bots/BotAvatar';
import { ALL_BOTS, PICKABLE, type BotId } from '../bots/bots';
import { ScreenHeader } from '../components/ScreenHeader';
import { SpeechBubble } from '../components/SpeechBubble';
import { equivalentFor, leakCategories, week } from '../data/mock';
import { colors, fonts, radius } from '../theme';

const eur = (n: number) => `€${Math.round(n).toLocaleString('fi-FI')}`;

export default function WhatIf() {
  const params = useLocalSearchParams<{ bot?: string }>();
  const botId: BotId = params.bot && params.bot in ALL_BOTS ? (params.bot as BotId) : PICKABLE[0];

  const [catKey, setCatKey] = useState<(typeof leakCategories)[number]['key']>('Restaurants');
  const [pct, setPct] = useState(20);
  const [hop, setHop] = useState(0);
  const [goalSet, setGoalSet] = useState(false);
  const [explain, setExplain] = useState(false);

  const cat = leakCategories.find((c) => c.key === catKey)!;
  const monthly = (cat.monthly * pct) / 100;
  const yearly = monthly * 12;
  const newWeekly = week.safeToSpend + monthly / 4.33;
  const equiv = equivalentFor(yearly);

  const line = explain
    ? `Your average ${cat.label.toLowerCase()} spend (${eur(cat.monthly)}/month, last 3 months) × ${pct}%.`
    : goalSet
    ? `Goal saved! I’ll cheer you on every week.`
    : pct === 0
      ? 'Slide me and see what you could save.'
      : equiv
        ? `That’s ${equiv} every year!`
        : 'Every euro counts. Try a bit more?';

  const buzz = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="What if" />

        <View style={styles.stage}>
          <SpeechBubble text={line} maxWidth={250} />
          <BotAvatar id={botId} size={104} hopSignal={hop} />
        </View>

        <Text style={styles.question}>Spend less on…</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chips}>
          {leakCategories.map((c) => {
            const active = c.key === catKey;
            return (
              <Pressable
                key={c.key}
                onPress={() => {
                  buzz();
                  setCatKey(c.key);
                  setGoalSet(false);
                  setExplain(false);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && { color: '#fff' }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.card}>
          <View style={styles.sliderTop}>
            <Text style={styles.label}>Cut by</Text>
            <Text style={styles.pct}>{pct}%</Text>
          </View>
          <Slider
            style={{ height: 40, marginHorizontal: -4 }}
            minimumValue={0}
            maximumValue={50}
            step={5}
            value={pct}
            onValueChange={(v) => {
              const r = Math.round(v);
              if (r !== pct) {
                buzz();
                setPct(r);
                setGoalSet(false);
                setExplain(false);
              }
            }}
            onSlidingComplete={() => setHop((h) => h + 1)}
            minimumTrackTintColor={colors.brand}
            maximumTrackTintColor={colors.hairline}
            thumbTintColor={Platform.OS === 'ios' ? undefined : colors.brand}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>You’d save</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>+{eur(monthly)}</Text>
            <Text style={styles.amountSub}>a month</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statValue}>{eur(yearly)}</Text>
              <Text style={styles.statLabel}>a year</Text>
            </View>
            <View>
              <Text style={styles.statValue}>{eur(newWeekly)}</Text>
              <Text style={styles.statLabel}>safe to spend / week</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.how} onPress={() => setExplain((e) => !e)} hitSlop={8}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
          <Text style={styles.howText}>How I got this</Text>
        </Pressable>

        <Pressable
          disabled={pct === 0}
          style={({ pressed }) => [styles.cta, (pressed || pct === 0) && { opacity: 0.6 }]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setGoalSet(true);
            setExplain(false);
            setHop((h) => h + 1);
          }}
        >
          <Text style={styles.ctaText}>{goalSet ? 'Goal saved' : 'Make it my goal'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  stage: { alignItems: 'center', marginTop: 4, marginBottom: 4 },
  question: { fontSize: 26, fontFamily: fonts.medium, color: colors.text, letterSpacing: -0.6, marginTop: 8 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 14, marginBottom: 14 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 20, marginBottom: 12 },
  sliderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, color: colors.muted, fontFamily: fonts.regular },
  pct: { fontSize: 30, fontFamily: fonts.light, color: colors.text, letterSpacing: -0.8 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  amount: { fontSize: 52, fontFamily: fonts.light, color: colors.brand, letterSpacing: -2 },
  amountSub: { fontSize: 16, color: colors.muted, fontFamily: fonts.regular },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statValue: { fontSize: 20, fontFamily: fonts.medium, color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  how: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 2, marginBottom: 16 },
  howText: { fontSize: 13, color: colors.muted, fontFamily: fonts.regular },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
});
