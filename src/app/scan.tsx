import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar } from '../bots/BotAvatar';
import { ALL_BOTS, PICKABLE, type BotId } from '../bots/bots';
import { SpeechBubble } from '../components/SpeechBubble';
import { scanReceipt, setPendingReceipt } from '../lib/receipt';
import { colors, fonts, radius } from '../theme';

const FRAME_W = 260;
const FRAME_H = 360;

/** Receipt scanner: take a photo (or pick one) and the AI reads it into the three baskets. */
export default function Scan() {
  const params = useLocalSearchParams<{ bot?: string }>();
  const botId: BotId = params.bot && params.bot in ALL_BOTS ? (params.bot as BotId) : PICKABLE[0];
  const [permission, requestPermission] = useCameraPermissions();
  const [line, setLine] = useState('Point me at a receipt.');
  const [hop, setHop] = useState(0);
  const [reading, setReading] = useState(false);
  const camera = useRef<CameraView>(null);

  const sweep = useSharedValue(0);
  const flash = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [sweep]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * (FRAME_H - 4) }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  /** Send the photo to the AI, then show the result (or say what went wrong). */
  const read = async (base64: string | null | undefined, mime = 'image/jpeg') => {
    if (!base64) return setLine('Hmm, that photo didn’t work. Try again?');
    setReading(true);
    setLine('Got it! Reading your receipt…');
    setHop((h) => h + 1);
    try {
      const r = await scanReceipt(base64, mime);
      if (!r.isReceipt || !r.items.length) {
        setLine('I can’t see a receipt there. Try again, a bit closer?');
        return setReading(false);
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPendingReceipt(r);
      router.replace({ pathname: '/receipt', params: { bot: botId } });
    } catch (e) {
      console.warn('Receipt scan failed:', (e as Error).message);
      setLine('I couldn’t read it this time. Is the Penni server running?');
      setReading(false);
    }
  };

  const shoot = async () => {
    if (reading) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flash.value = withSequence(withTiming(0.9, { duration: 60 }), withTiming(0, { duration: 350 }));
    try {
      const photo = await camera.current?.takePictureAsync({ base64: true, quality: 0.5, exif: false });
      read(photo?.base64 ?? photo?.uri?.split('base64,')[1]);
    } catch {
      setLine('The camera didn’t take that one. Try again?');
    }
  };

  const pickPhoto = async () => {
    if (reading) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    read(asset.base64 ?? asset.uri.split('base64,')[1], asset.mimeType ?? 'image/jpeg');
  };

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.ask}>
        <Pressable onPress={() => router.back()} style={[styles.close, { backgroundColor: colors.card }]} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SpeechBubble text={reading ? line : 'I need your camera to read receipts.'} />
          <BotAvatar id={botId} size={150} />
        </View>
        <Pressable style={styles.cta} onPress={requestPermission}>
          <Text style={styles.ctaText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={pickPhoto} hitSlop={8}>
          {reading ? <ActivityIndicator color={colors.brand} /> : <Text style={styles.linkText}>Pick a photo instead</Text>}
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} style={styles.close} hitSlop={10}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Scan receipt</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.center} pointerEvents="none">
          <View style={styles.frame}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <View key={c} style={[styles.corner, cornerStyle[c]]} />
            ))}
            <Animated.View style={[styles.sweep, sweepStyle]} />
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.botRow} pointerEvents="none">
            <SpeechBubble text={line} maxWidth={240} slot={64} />
            <BotAvatar id={botId} size={64} hopSignal={hop} />
          </View>
          <View style={styles.controls}>
            <Pressable onPress={pickPhoto} style={styles.side} hitSlop={8}>
              <Ionicons name="images-outline" size={24} color="#fff" />
            </Pressable>
            <Pressable onPress={shoot} disabled={reading} style={styles.shutter}>
              {reading ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
            </Pressable>
            <View style={[styles.side, { backgroundColor: 'transparent' }]} />
          </View>
        </View>
      </SafeAreaView>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }, flashStyle]} />
    </View>
  );
}

const C = 34; // corner length
const cornerStyle = StyleSheet.create({
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 22 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 22 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 22 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 22 },
});

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  ask: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 4 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_W, height: FRAME_H },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#fff' },
  sweep: { position: 'absolute', left: 14, right: 14, height: 3, borderRadius: 2, backgroundColor: colors.brand, opacity: 0.9 },
  bottom: { alignItems: 'center', paddingBottom: 16 },
  botRow: { alignItems: 'center', marginBottom: 14 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 36 },
  side: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  link: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  linkText: { fontSize: 15, fontFamily: fonts.medium, color: colors.brand },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
});
