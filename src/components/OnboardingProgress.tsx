import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '../theme';

/** Three lines at the top of onboarding. The current one fills in when the screen opens. */
export function OnboardingProgress({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {step > 1 && (
          <Pressable onPress={() => router.canGoBack() && router.back()} style={styles.back} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        )}
      </View>
      <ProgressBars step={step} total={total} />
      <View style={styles.side} />
    </View>
  );
}

/** A row of lines, one per step. Lines up to `step` are filled. */
export function ProgressBars({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.bars}>
      {Array.from({ length: total }, (_, i) => (
        <Bar key={i} state={i + 1 < step ? 'done' : i + 1 === step ? 'current' : 'todo'} />
      ))}
    </View>
  );
}

function Bar({ state }: { state: 'done' | 'current' | 'todo' }) {
  const p = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(state === 'todo' ? 0 : 1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [state, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 48, gap: 12 },
  side: { width: 40 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  bars: { flex: 1, flexDirection: 'row', gap: 6 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.hairline, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: colors.brand },
});
