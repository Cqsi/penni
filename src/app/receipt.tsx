import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar } from '../bots/BotAvatar';
import { ALL_BOTS, PICKABLE, type BotId } from '../bots/bots';
import { ScreenHeader } from '../components/ScreenHeader';
import { SpeechBubble } from '../components/SpeechBubble';
import { BASKETS, basketTotals, eur2, getPendingReceipt, receiptLine, type BasketKey } from '../lib/receipt';
import { getSetup, saveSetup, weekFor } from '../lib/setup';
import { colors, fonts, radius } from '../theme';

const DOT: Record<BasketKey, string> = { must: colors.basket1, surprise: colors.basket2, leak: colors.basket3 };

const niceDate = (d: string) => {
  const t = new Date(d);
  return d && !isNaN(t.getTime()) ? t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

/** A scanned receipt: total, the three-basket split, every item, and "Add to this week". */
export default function ReceiptScreen() {
  const params = useLocalSearchParams<{ bot?: string }>();
  const botId: BotId = params.bot && params.bot in ALL_BOTS ? (params.bot as BotId) : PICKABLE[0];
  const { width } = useWindowDimensions();
  const [added, setAdded] = useState<number | null>(null);
  const r = getPendingReceipt();
  if (!r) return <Redirect href="/home" />;

  const totals = basketTotals(r);
  const shown = BASKETS.filter((b) => r.items.some((i) => i.basket === b.key));

  const add = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const s = getSetup();
    const receipts = [...(s.receipts ?? []), { store: r.store, total: r.total, leaks: totals.leak }];
    saveSetup({ receipts });
    setAdded(weekFor({ ...s, receipts }).safeToSpend);
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/home')), 1100);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Receipt" icon="close" />

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(350)} style={styles.head}>
          <Text style={styles.store}>{r.store || 'Receipt'}</Text>
          {!!niceDate(r.date) && <Text style={styles.muted}>{niceDate(r.date)}</Text>}
          <Text style={styles.total}>{eur2(r.total)}</Text>

          {/* The three baskets as one bar */}
          <View style={styles.split}>
            {BASKETS.map((b) =>
              totals[b.key] > 0 ? <View key={b.key} style={{ flex: totals[b.key], backgroundColor: DOT[b.key] }} /> : null,
            )}
          </View>
          <View style={styles.legend}>
            {BASKETS.map((b) => (
              <View key={b.key} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: DOT[b.key] }]} />
                <Text style={styles.legendText}>
                  {b.name} <Text style={{ color: colors.text }}>{eur2(totals[b.key])}</Text>
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {!r.adds && (
          <View style={styles.warn}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.muted} />
            <Text style={styles.warnText}>
              Items add up to {eur2(r.sum)}, the receipt says {eur2(r.total)}. Worth a quick check.
            </Text>
          </View>
        )}

        <View style={styles.botRow}>
          <BotAvatar id={botId} size={56} hopSignal={1} />
          <SpeechBubble tail="left" text={receiptLine(r)} maxWidth={Math.min(width, 520) - 48 - 56 - 8} slot={84} />
        </View>

        <View style={styles.card}>
          {shown.map((b, bi) => (
            <View key={b.key} style={bi > 0 && styles.group}>
              <View style={styles.groupHead}>
                <View style={[styles.dot, { backgroundColor: DOT[b.key] }]} />
                <Text style={styles.groupName}>{b.name}</Text>
              </View>
              {r.items
                .filter((i) => i.basket === b.key)
                .map((i, k) => (
                  <View key={`${i.name}-${k}`} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{i.nameEn}</Text>
                      <Text style={styles.itemOrig} numberOfLines={1}>
                        {i.name}
                      </Text>
                    </View>
                    <Text style={styles.price}>{eur2(i.price)}</Text>
                  </View>
                ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable disabled={added !== null} onPress={add} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
        {added === null ? (
          <Text style={styles.ctaText}>Add to this week</Text>
        ) : (
          <Animated.View entering={ZoomIn.duration(250)} style={styles.ctaDone}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.ctaText}>Added · €{added} left this week</Text>
          </Animated.View>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 12 },
  head: { backgroundColor: colors.card, borderRadius: radius.card, padding: 22, marginTop: 16 },
  store: { fontSize: 17, fontFamily: fonts.medium, color: colors.text },
  muted: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  total: { fontSize: 44, lineHeight: 52, fontFamily: fonts.medium, color: colors.text, letterSpacing: -1.5, marginTop: 10 },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 3, marginTop: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted },
  dot: { width: 8, height: 8, borderRadius: 4 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.row, paddingHorizontal: 16, paddingVertical: 12, marginTop: 10 },
  warnText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.muted },
  botRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: 20, paddingVertical: 10 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, marginTop: 4 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 4 },
  groupName: { fontSize: 14, fontFamily: fonts.medium, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  itemName: { fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  itemOrig: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 1 },
  price: { fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaDone: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaText: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
});
