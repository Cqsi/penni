import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, fonts } from '../theme';

const EDGE = '#D2D2CC';

/**
 * Fades in softly whenever `text` changes and cross-fades between messages.
 * It sits in a fixed-size slot so nothing around it jumps.
 * `tail="down"` points at a bot below it, `tail="left"` at a bot to its left.
 * Pass `visible={false}` to fade it out while keeping the space.
 */
export function SpeechBubble({
  text,
  maxWidth = 260,
  slot = 76,
  visible = true,
  tail = 'down',
}: {
  text: string;
  maxWidth?: number;
  slot?: number;
  visible?: boolean;
  tail?: 'down' | 'left';
}) {
  const left = tail === 'left';
  return (
    <View style={{ height: slot, width: maxWidth, zIndex: 2 }}>
      {visible && (
        <Animated.View key={text} entering={FadeIn.duration(450)} exiting={FadeOut.duration(250)} style={left ? styles.anchorLeft : styles.anchorDown}>
          {left && <View style={[styles.tail, styles.tailLeft]} />}
          <View style={[styles.bubble, left && { flexShrink: 1 }]}>
            <Animated.Text style={styles.text}>{text}</Animated.Text>
          </View>
          {!left && <View style={[styles.tail, styles.tailDown]} />}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchorDown: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  anchorLeft: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  bubble: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: EDGE,
    paddingHorizontal: 16,
    paddingVertical: 9,
    zIndex: 1,
  },
  text: { fontSize: 15, lineHeight: 21, color: colors.text, textAlign: 'center', fontFamily: fonts.regular },
  // A rotated square drawn over the bubble's edge, so the outline flows into the tail.
  tail: { width: 13, height: 13, backgroundColor: colors.card, borderColor: EDGE, transform: [{ rotate: '45deg' }], zIndex: 2 },
  tailDown: { borderRightWidth: 1.5, borderBottomWidth: 1.5, borderBottomRightRadius: 3, marginTop: -7.5 },
  tailLeft: { borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderBottomLeftRadius: 3, marginRight: -7.5 },
});
