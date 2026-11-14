import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { colors, fonts } from '../theme';

/** Sheet that slides up from the bottom. Close by tapping the backdrop or dragging the top down. */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  const hidden = useSharedValue(1); // 1 = off screen, 0 = fully open
  const drag = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      drag.value = 0;
      hidden.value = withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) });
    } else {
      hidden.value = withTiming(1, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
  }, [open, hidden, drag]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useRef(() => closeRef.current()).current;

  const pan = usePanGesture({
    onUpdate: (e) => {
      'worklet';
      drag.value = Math.max(0, e.translationY);
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > 110 || e.velocityY > 900) scheduleOnRN(close);
      else drag.value = withSpring(0, { damping: 20, stiffness: 260 });
    },
  });

  const backdrop = useAnimatedStyle(() => ({ opacity: (1 - hidden.value) * 0.4 }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: hidden.value * height + drag.value }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: height * 0.85 }, sheet]}>
          <GestureDetector gesture={pan}>
            <View style={styles.top}>
              <View style={styles.handle} />
              <Text style={styles.title}>{title}</Text>
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  top: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  handle: { width: 38, height: 5, borderRadius: 3, backgroundColor: colors.hairline },
  title: { fontSize: 18, fontFamily: fonts.medium, color: colors.text, marginTop: 14, letterSpacing: -0.3 },
});
