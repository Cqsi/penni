import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BankLogo } from '../components/BankLogo';
import { BottomSheet } from '../components/BottomSheet';
import { OnboardingProgress } from '../components/OnboardingProgress';
import { SLogo } from '../components/SLogo';
import { MAIN_BANKS, OTHER_BANKS } from '../data/banks';
import { colors, fonts, radius } from '../theme';

type Status = 'connecting' | 'connected' | undefined;

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

/** Pretend bank connection: a short wait, then connected. */
function useConnections() {
  const [status, setStatus] = useState<Record<string, Status>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const connect = (id: string) => {
    if (status[id]) return;
    tap();
    setStatus((s) => ({ ...s, [id]: 'connecting' }));
    timers.current.push(
      setTimeout(() => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStatus((s) => ({ ...s, [id]: 'connected' }));
      }, 1100 + Math.random() * 600),
    );
  };
  return { status, connect };
}

/** Onboarding 2/3: connect other banks. */
export default function Banks() {
  const { status, connect } = useConnections();
  const [sheet, setSheet] = useState(false);
  const fromSheet = OTHER_BANKS.filter((b) => status[b.id]);
  const connected = 1 + Object.values(status).filter((s) => s === 'connected').length;

  return (
    <SafeAreaView style={styles.screen}>
      <OnboardingProgress step={2} />
      <Text style={styles.title}>Add your other banks</Text>
      <Text style={styles.sub}>See all your money in one place. You can add more later.</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <BankRow logo={<SLogo size={40} />} name="S-Bank" status="connected" />
        {MAIN_BANKS.map((b) => (
          <BankRow key={b.id} logo={<BankLogo bank={b} />} name={b.name} status={status[b.id]} onPress={() => connect(b.id)} />
        ))}
        {fromSheet.map((b) => (
          <Animated.View key={b.id} entering={FadeInDown.duration(300)}>
            <BankRow logo={<BankLogo bank={b} />} name={b.name} status={status[b.id]} />
          </Animated.View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.more, pressed && { opacity: 0.7 }]}
          onPress={() => {
            tap();
            setSheet(true);
          }}
        >
          <Text style={styles.name}>More banks</Text>
          <Text style={styles.seeAll}>See all</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        onPress={() => {
          tap();
          router.push('/pick');
        }}
      >
        <Text style={styles.ctaText}>{connected > 1 ? `Continue with ${connected} banks` : 'Continue'}</Text>
      </Pressable>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Other banks">
        <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
          {OTHER_BANKS.map((b, i) => (
            <BankRow key={b.id} flat divider={i > 0} logo={<BankLogo bank={b} />} name={b.name} status={status[b.id]} onPress={() => connect(b.id)} />
          ))}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function BankRow({ logo, name, status, onPress, flat, divider }: { logo: ReactNode; name: string; status: Status; onPress?: () => void; flat?: boolean; divider?: boolean }) {
  return (
    <Pressable
      disabled={!onPress || !!status}
      onPress={onPress}
      style={({ pressed }) => [flat ? styles.flatRow : styles.row, divider && styles.divider, pressed && { opacity: 0.7 }]}
    >
      {logo}
      <Text style={styles.name}>{name}</Text>
      {status === 'connected' ? (
        <Animated.View entering={ZoomIn.duration(250)} style={styles.done}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </Animated.View>
      ) : status === 'connecting' ? (
        <ActivityIndicator color={colors.brand} style={{ width: 28 }} />
      ) : (
        <View style={styles.connect}>
          <Text style={styles.connectText}>Connect</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: fonts.medium, color: colors.text, marginTop: 20, letterSpacing: -0.8 },
  sub: { fontSize: 16, lineHeight: 23, color: colors.muted, fontFamily: fonts.regular, marginTop: 6 },
  list: { gap: 10, paddingTop: 22, paddingBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.row, paddingHorizontal: 14, height: 68 },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, height: 64 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  name: { flex: 1, fontSize: 16, fontFamily: fonts.medium, color: colors.text },
  connect: { paddingHorizontal: 14, height: 32, borderRadius: radius.pill, backgroundColor: colors.brandSoft, justifyContent: 'center' },
  connectText: { fontSize: 14, fontFamily: fonts.medium, color: colors.brand },
  done: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.card, borderRadius: radius.row, paddingHorizontal: 18, height: 60 },
  seeAll: { fontSize: 14, fontFamily: fonts.medium, color: colors.muted },
  sheetList: { paddingHorizontal: 20, paddingTop: 6 },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
});
