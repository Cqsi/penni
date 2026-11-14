import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { lastWeek, week } from '../data/mock';
import { colors, fonts, radius } from '../theme';

const GAP = 12;
const CHART_H = 112;

/** Swipe left on "Safe to spend" to see last week's spending as bars. */
export function SpendCarousel({ onPage }: { onPage?: (page: number) => void }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 520) - 40;
  const [page, setPage] = useState(0);
  const grow = useSharedValue(0);

  useEffect(() => {
    if (page === 1) grow.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    else grow.value = 0;
    onPage?.(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const spentShare = (week.budget - week.safeToSpend) / week.budget;
  const total = lastWeek.amounts.reduce((a, b) => a + b, 0);
  const max = Math.max(...lastWeek.amounts);
  const dailyBudget = week.budget / 7;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + GAP}
        decelerationRate="fast"
        disableIntervalMomentum
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: GAP }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / (cardW + GAP));
          if (p !== page) setPage(p);
        }}
      >
        <View style={[styles.card, { width: cardW }]}>
          <Text style={styles.label}>Safe to spend this week</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>€{week.safeToSpend}</Text>
            <Text style={styles.amountSub}>/ €{week.budget}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${spentShare * 100}%` }]} />
          </View>
          <Text style={styles.caption}>{week.daysLeft} days left</Text>
        </View>

        <View style={[styles.card, { width: cardW }]}>
          <View style={styles.chartHead}>
            <Text style={styles.label}>Last week</Text>
            <Text style={styles.total}>€{total}</Text>
          </View>
          <View style={styles.chart}>
            <View style={[styles.budgetLine, { bottom: (dailyBudget / max) * CHART_H }]} />
            {lastWeek.amounts.map((v, i) => (
              <Bar key={i} value={v} max={max} index={i} grow={grow} label={lastWeek.days[i]} top={v === max} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.dots}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.dot, page === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function Bar({ value, max, index, grow, label, top }: { value: number; max: number; index: number; grow: SharedValue<number>; label: string; top: boolean }) {
  const h = (value / max) * CHART_H;
  const style = useAnimatedStyle(() => ({ height: Math.max(4, h * grow.value) }));
  const valueStyle = useAnimatedStyle(() => ({ opacity: withDelay(index * 40, withTiming(grow.value > 0.9 ? 1 : 0, { duration: 200 })) }));
  return (
    <View style={styles.barCol}>
      {top && <Animated.Text style={[styles.barValue, valueStyle]}>€{value}</Animated.Text>}
      <Animated.View style={[styles.bar, { backgroundColor: top ? colors.brand : '#BFE8CF' }, style]} />
      <Text style={[styles.barLabel, top && { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 22, minHeight: 196 },
  label: { fontSize: 14, color: colors.muted, fontFamily: fonts.regular },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  amount: { fontSize: 56, fontFamily: fonts.light, color: colors.text, letterSpacing: -2 },
  amountSub: { fontSize: 17, color: colors.muted, fontFamily: fonts.regular },
  track: { height: 6, borderRadius: 99, backgroundColor: colors.hairline, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, backgroundColor: colors.brand },
  caption: { fontSize: 13, color: colors.muted, marginTop: 10, fontFamily: fonts.regular },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  total: { fontSize: 15, color: colors.text, fontFamily: fonts.medium },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_H + 40, marginTop: 8, paddingBottom: 22 },
  budgetLine: { position: 'absolute', left: 0, right: 0, marginBottom: 22, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#C9C9C4' },
  barCol: { alignItems: 'center', width: 28, justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 8 },
  barValue: { fontSize: 12, color: colors.text, fontFamily: fonts.medium, marginBottom: 4 },
  barLabel: { position: 'absolute', bottom: -20, fontSize: 12, color: colors.muted, fontFamily: fonts.regular },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D6D6D2' },
  dotActive: { width: 18, backgroundColor: colors.text },
});
