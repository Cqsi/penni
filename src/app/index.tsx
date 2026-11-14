import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingProgress } from '../components/OnboardingProgress';
import { SLogo } from '../components/SLogo';
import { colors, fonts, radius } from '../theme';

type State = 'idle' | 'connecting' | 'connected';

/** Onboarding 1/3: connect the S-Bank account. */
export default function ConnectSBank() {
  const [state, setState] = useState<State>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const next = () => router.push('/banks');

  const connect = () => {
    if (state === 'connected') return next();
    if (state === 'connecting') return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setState('connecting');
    timers.current.push(
      setTimeout(() => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setState('connected');
        timers.current.push(setTimeout(next, 700));
      }, 1400),
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <OnboardingProgress step={1} />

      <View style={styles.stage}>
        <Animated.View entering={ZoomIn.duration(500)}>
          <SLogo size={136} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150).duration(400)} style={styles.title}>
          Welcome to Penni
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250).duration(400)} style={styles.sub}>
          Your money coach in S-mobiili. Connect your S-Bank account and Penni shows you where your money goes.
        </Animated.Text>
      </View>

      <Pressable style={({ pressed }) => [styles.cta, pressed && state === 'idle' && { opacity: 0.85 }]} onPress={connect}>
        {state === 'idle' && <Text style={styles.ctaText}>Connect S-pankki bank</Text>}
        {state === 'connecting' && (
          <Animated.View entering={FadeIn} style={styles.ctaRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.ctaText}>Connecting…</Text>
          </Animated.View>
        )}
        {state === 'connected' && (
          <Animated.View entering={ZoomIn.duration(250)} style={styles.ctaRow}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.ctaText}>Connected</Text>
          </Animated.View>
        )}
      </Pressable>
      <View style={styles.secure}>
        <Ionicons name="lock-closed" size={12} color={colors.muted} />
        <Text style={styles.secureText}>Penni can never move your money.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 12 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 34, lineHeight: 40, fontFamily: fonts.medium, color: colors.text, marginTop: 32, letterSpacing: -1 },
  sub: { fontSize: 16, lineHeight: 23, color: colors.muted, fontFamily: fonts.regular, textAlign: 'center', marginTop: 10, maxWidth: 300 },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  secureText: { fontSize: 13, color: colors.muted, fontFamily: fonts.regular },
});
