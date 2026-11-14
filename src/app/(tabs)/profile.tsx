import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar } from '../../bots/BotAvatar';
import { user } from '../../data/mock';
import { LEVEL_SIZE, POINTS_PER_LEVEL, progress, REWARDS } from '../../lib/rewards';
import { saveSetup, useBotId, useSetup } from '../../lib/setup';
import { colors, fonts, radius } from '../../theme';

/** Profile: S-Bonus points, your level and rewards. */
export default function Profile() {
  const setup = useSetup();
  const botId = useBotId();
  const p = progress(setup);

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(p.xpInLevel / LEVEL_SIZE, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [p.xpInLevel, fill]);
  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const redeem = (id: string) => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveSetup({ redeemed: [...(setup.redeemed ?? []), id] });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.firstName[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.firstName}</Text>
            <Text style={styles.muted}>{user.city}</Text>
          </View>
          <BotAvatar id={botId} size={52} />
        </View>

        {/* S-Bonus */}
        <View style={styles.bonus}>
          <Text style={styles.bonusLabel}>S-Bonus points</Text>
          <Animated.Text key={p.points} entering={ZoomIn.duration(300)} style={styles.bonusPoints}>
            {p.points.toLocaleString('en-US')}
          </Animated.Text>
        </View>

        {/* Level */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.levelRow}>
            <Text style={styles.level}>Level {p.level}</Text>
            <Text style={styles.levelTitle}>{p.title}</Text>
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, barStyle]} />
          </View>
          <Text style={styles.muted}>
            {p.xpInLevel} / {LEVEL_SIZE} XP · next level gives +{POINTS_PER_LEVEL} S-Bonus points
          </Text>
        </View>

        <Text style={styles.section}>Rewards</Text>
        <View style={[styles.card, { paddingVertical: 6 }]}>
          {REWARDS.map((r, i) => {
            const got = setup.redeemed?.includes(r.id);
            const missing = r.cost - p.points;
            return (
              <View key={r.id} style={[styles.row, i > 0 && styles.divider]}>
                <View style={styles.rewardIcon}>
                  <Ionicons name={r.icon} size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.title}</Text>
                  <Text style={styles.muted}>{r.cost.toLocaleString('en-US')} pts</Text>
                </View>
                {got ? (
                  <Animated.View entering={ZoomIn.duration(250)} style={styles.redeemed}>
                    <Ionicons name="checkmark" size={14} color={colors.brand} />
                    <Text style={styles.redeemedText}>Claimed</Text>
                  </Animated.View>
                ) : missing > 0 ? (
                  <Text style={styles.locked}>{missing.toLocaleString('en-US')} to go</Text>
                ) : (
                  <Pressable onPress={() => redeem(r.id)} style={({ pressed }) => [styles.get, pressed && { opacity: 0.8 }]}>
                    <Text style={styles.getText}>Claim</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontFamily: fonts.medium, color: colors.text },
  name: { fontSize: 22, fontFamily: fonts.medium, color: colors.text, letterSpacing: -0.4 },
  muted: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 22 },
  levelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  level: { fontSize: 30, fontFamily: fonts.medium, color: colors.text, letterSpacing: -0.8 },
  levelTitle: { fontSize: 14, fontFamily: fonts.medium, color: colors.brand },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.hairline, overflow: 'hidden', marginTop: 16, marginBottom: 10 },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.brand },
  section: { fontSize: 20, fontFamily: fonts.medium, color: colors.text, letterSpacing: -0.4, marginTop: 22, marginBottom: 12, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  rowTitle: { flex: 1, fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  bonus: { backgroundColor: colors.brand, borderRadius: radius.card, paddingVertical: 22, paddingHorizontal: 22 },
  bonusLabel: { fontSize: 15, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.85)' },
  bonusPoints: { fontSize: 56, lineHeight: 64, fontFamily: fonts.medium, color: '#fff', letterSpacing: -2, marginTop: 4 },
  rewardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  get: { paddingHorizontal: 16, height: 34, borderRadius: radius.pill, backgroundColor: colors.brand, justifyContent: 'center' },
  getText: { fontSize: 14, fontFamily: fonts.medium, color: '#fff' },
  redeemed: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 34, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
  redeemedText: { fontSize: 14, fontFamily: fonts.medium, color: colors.brand },
  locked: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
});
