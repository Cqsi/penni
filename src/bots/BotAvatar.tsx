import { useEffect, useId, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ALL_BOTS, type Bot, type BotId } from './bots';

const VB_W = 160;
const VB_H = 170;

type Shape = {
  /** The body outline only. Drawn three times: base colour, bounce light, shadow. */
  silhouette: (fill: string) => ReactNode;
  /** Stems, leaves, antennas: drawn behind the body. */
  back?: (bot: Bot) => ReactNode;
  /** Drawn on top of the body, under the face. */
  front?: (bot: Bot) => ReactNode;
  eyes: [number, number][];
  eyeStyle?: 'cartoon' | 'screen';
  mouth: [number, number];
  /** Soft highlight: cx, cy, rx, ry, rotation. */
  spec: [number, number, number, number, number];
  feet: [number, number][];
  shadowRx: number;
};

const SHAPES: Record<BotId, Shape> = {
  pyra: {
    silhouette: (f) => <Path d="M80 30C86 30 90 34 93 40L138 132C142 141 136 150 125 150L35 150C24 150 18 141 22 132L67 40C70 34 74 30 80 30Z" fill={f} />,
    eyes: [[67, 106], [93, 106]],
    mouth: [80, 126],
    spec: [69, 64, 7, 17, 27],
    feet: [[62, 151], [98, 151]],
    shadowRx: 50,
  },
  cubo: {
    silhouette: (f) => <Rect x={28} y={46} width={104} height={104} rx={30} fill={f} />,
    eyes: [[66, 92], [94, 92]],
    mouth: [80, 113],
    spec: [54, 62, 19, 8, -16],
    feet: [[60, 151], [100, 151]],
    shadowRx: 48,
  },
  pera: {
    silhouette: (f) => (
      <Path d="M80 34C97 34 103 49 103 63C103 77 135 89 135 120C135 143 113 152 80 152C47 152 25 143 25 120C25 89 57 77 57 63C57 49 63 34 80 34Z" fill={f} />
    ),
    back: (bot) => (
      <>
        <Path d="M80 38Q80 27 85 20" stroke="#5B4126" strokeWidth={4.5} fill="none" strokeLinecap="round" />
        <Path d="M86 26C92 14 108 14 112 20C106 30 92 32 86 26Z" fill={bot.mid} />
        <Path d="M88 25C96 22 103 20 109 20" stroke={bot.dark} strokeWidth={1.2} fill="none" opacity={0.6} />
      </>
    ),
    eyes: [[67, 104], [93, 104]],
    mouth: [80, 124],
    spec: [69, 54, 6, 12, 18],
    feet: [[63, 152], [97, 152]],
    shadowRx: 48,
  },
  mochi: {
    silhouette: (f) => <Path d="M80 42C119 42 137 79 137 112C137 141 112 151 80 151C48 151 23 141 23 112C23 79 41 42 80 42Z" fill={f} />,
    eyes: [[66, 92], [94, 92]],
    mouth: [80, 112],
    spec: [57, 65, 19, 9, -25],
    feet: [[60, 151], [100, 151]],
    shadowRx: 46,
  },
  pip: {
    silhouette: (f) => (
      <>
        <Rect x={58} y={124} width={44} height={28} rx={14} fill={f} />
        <Rect x={28} y={46} width={104} height={84} rx={32} fill={f} />
      </>
    ),
    back: (bot) => (
      <>
        <Line x1={80} y1={48} x2={80} y2={30} stroke={bot.dark} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={80} cy={25} r={7.5} fill="#D7F75A" />
        <Circle cx={77.5} cy={22.5} r={2.2} fill="#fff" opacity={0.8} />
      </>
    ),
    front: () => (
      <>
        <Rect x={42} y={62} width={76} height={54} rx={22} fill="#0C2416" />
        <Path d="M52 70Q80 62 108 70" stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.12} />
      </>
    ),
    eyes: [[66, 87], [94, 87]],
    eyeStyle: 'screen',
    mouth: [80, 103],
    spec: [55, 57, 15, 6, -18],
    feet: [[68, 153], [92, 153]],
    shadowRx: 42,
  },
  sprout: {
    silhouette: (f) => <Path d="M80 52C112 52 126 84 126 114C126 141 106 152 80 152C54 152 34 141 34 114C34 84 48 52 80 52Z" fill={f} />,
    back: (bot) => (
      <>
        <Path d="M80 56Q80 44 82 36" stroke={bot.dark} strokeWidth={4} fill="none" strokeLinecap="round" />
        <Path d="M81 38C74 24 58 24 54 30C60 40 74 42 81 38Z" fill={bot.mid} />
        <Path d="M82 36C88 20 108 18 112 26C106 38 90 42 82 36Z" fill={bot.mid} />
      </>
    ),
    eyes: [[67, 98], [93, 98]],
    mouth: [80, 118],
    spec: [61, 72, 13, 7, -30],
    feet: [[64, 152], [96, 152]],
    shadowRx: 44,
  },
};

/** Top of each bot's drawing (incl. stems/antenna) in viewBox units. */
const TOP_Y: Record<BotId, number> = { pyra: 30, cubo: 46, pera: 16, mochi: 42, pip: 17, sprout: 22 };

/** Empty space above the bot at a given size, so a speech bubble can sit right on top of it. */
export function botHeadroom(id: BotId, size: number) {
  return (TOP_Y[id] / VB_H) * ((size * VB_H) / VB_W);
}

type Props = {
  id: BotId;
  size?: number;
  /** Change this number to make the bot hop. */
  hopSignal?: number;
  /** Stagger idle animations between several bots on one screen. */
  phase?: number;
};

export function BotAvatar({ id, size = 160, hopSignal = 0, phase = 0 }: Props) {
  const bot = ALL_BOTS[id];
  const s = SHAPES[id];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = (name: string) => `${name}${uid}`;
  const url = (name: string) => `url(#${g(name)})`;
  const height = (size * VB_H) / VB_W;
  const eyeY = s.eyes[0][1];

  const breathe = useSharedValue(0);
  const blink = useSharedValue(1);
  const look = useSharedValue(0);
  const hop = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    // Feet stay planted: the body gently stretches and settles, like breathing.
    breathe.value = withDelay(
      phase * 300,
      withRepeat(withSequence(withTiming(1, { duration: 1700, easing: ease }), withTiming(0, { duration: 1900, easing: ease })), -1),
    );
    blink.value = withDelay(
      phase * 700,
      withRepeat(withSequence(withDelay(3400, withTiming(0.08, { duration: 80 })), withTiming(1, { duration: 110 })), -1),
    );
    // Every few seconds the eyes glance one way, then the other, then back.
    const glance = { duration: 220, easing: Easing.out(Easing.quad) };
    look.value = withDelay(
      1200 + phase * 900,
      withRepeat(
        withSequence(
          withDelay(2600, withTiming(1, glance)),
          withDelay(900, withTiming(-1, glance)),
          withDelay(800, withTiming(0, glance)),
        ),
        -1,
      ),
    );
  }, [breathe, blink, look, phase]);

  useEffect(() => {
    if (!hopSignal) return;
    // Anticipation squash, jump with stretch, land with a squish, settle.
    hop.value = withSequence(
      withTiming(-0.3, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 230, easing: Easing.in(Easing.quad) }),
      withTiming(-0.35, { duration: 80 }),
      withTiming(0.06, { duration: 120 }),
      withTiming(0, { duration: 110 }),
    );
  }, [hopSignal, hop]);

  const bodyStyle = useAnimatedStyle(() => {
    const up = Math.max(hop.value, 0);
    const squash = Math.max(-hop.value, 0);
    return {
      transform: [
        { translateY: -up * size * 0.18 },
        { scaleX: 1 - breathe.value * 0.012 + squash * 0.22 - up * 0.05 },
        { scaleY: 1 + breathe.value * 0.025 - squash * 0.26 + up * 0.08 },
      ],
    };
  });
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const lookStyle = useAnimatedStyle(() => ({ transform: [{ translateX: look.value * size * 0.0125 }] }));
  const shadowStyle = useAnimatedStyle(() => {
    const up = Math.max(hop.value, 0);
    return { opacity: interpolate(up, [0, 1], [0.22, 0.08]), transform: [{ scaleX: 1 - up * 0.35 + breathe.value * 0.015 }] };
  });

  const cartoon = s.eyeStyle !== 'screen';
  const [mx, my] = s.mouth;
  const [lx, ly] = s.eyes[0];
  const [rx] = s.eyes[1];
  const [sx, sy, srx, sry, srot] = s.spec;

  return (
    <View style={{ width: size, height }}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }, shadowStyle]}>
        <Svg width={size} height={(size * 18) / VB_W} viewBox={`0 152 ${VB_W} 18`}>
          <Defs>
            <RadialGradient id={g('sh')} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#000" stopOpacity={1} />
              <Stop offset="1" stopColor="#000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={80} cy={160} rx={s.shadowRx} ry={8} fill={url('sh')} />
        </Svg>
      </Animated.View>

      <Animated.View style={[{ width: size, height, transformOrigin: 'bottom' }, bodyStyle]}>
        <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Defs>
            <RadialGradient id={g('base')} cx="36%" cy="26%" r="85%">
              <Stop offset="0" stopColor={bot.light} />
              <Stop offset="0.45" stopColor={bot.mid} />
              <Stop offset="1" stopColor={bot.dark} />
            </RadialGradient>
            <RadialGradient id={g('rim')} cx="78%" cy="92%" r="55%">
              <Stop offset="0" stopColor="#C8FFDD" stopOpacity={0.75} />
              <Stop offset="1" stopColor="#C8FFDD" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={g('ao')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#002A12" stopOpacity={0} />
              <Stop offset="0.6" stopColor="#002A12" stopOpacity={0} />
              <Stop offset="1" stopColor="#002A12" stopOpacity={0.35} />
            </LinearGradient>
            <RadialGradient id={g('spec')} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.95} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={g('blush')} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FF8FA8" stopOpacity={0.7} />
              <Stop offset="1" stopColor="#FF8FA8" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={g('foot')} cx="40%" cy="30%" r="80%">
              <Stop offset="0" stopColor={bot.mid} />
              <Stop offset="1" stopColor={bot.dark} />
            </RadialGradient>
          </Defs>

          {s.back?.(bot)}
          {s.feet.map(([fx, fy], i) => (
            <Ellipse key={i} cx={fx} cy={fy} rx={12} ry={7} fill={url('foot')} />
          ))}

          {s.silhouette(url('base'))}
          {s.silhouette(url('rim'))}
          {s.silhouette(url('ao'))}
          {s.front?.(bot)}

          <Ellipse cx={sx} cy={sy} rx={srx} ry={sry} fill={url('spec')} transform={`rotate(${srot} ${sx} ${sy})`} />
          <Circle cx={sx - srx * 0.25} cy={sy - sry * 0.2} r={2.4} fill="#fff" opacity={0.9} />

          {cartoon && (
            <>
              <Ellipse cx={lx - 9} cy={ly + 12} rx={8} ry={5} fill={url('blush')} />
              <Ellipse cx={rx + 9} cy={ly + 12} rx={8} ry={5} fill={url('blush')} />
              {s.eyes.map(([ex, ey], i) => (
                <Path
                  key={i}
                  d={`M${ex - 6} ${ey - 15}Q${ex} ${ey - 18.5} ${ex + 6} ${ey - 15}`}
                  stroke={bot.dark}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.6}
                />
              ))}
              <Path d={`M${mx - 7} ${my}Q${mx} ${my + 11} ${mx + 7} ${my}Q${mx} ${my + 2.5} ${mx - 7} ${my}Z`} fill="#2A0E14" />
              <Ellipse cx={mx} cy={my + 5.4} rx={3.3} ry={1.9} fill="#FF7F97" />
            </>
          )}
          {!cartoon && (
            <Path d={`M${mx - 6} ${my}Q${mx} ${my + 5} ${mx + 6} ${my}`} stroke="#B6F7A8" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          )}
        </Svg>

        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, width: size, height, transformOrigin: `50% ${(eyeY / VB_H) * 100}%` },
            eyeStyle,
          ]}
        >
          {cartoon && (
            <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: 'absolute' }}>
              <Defs>
                <RadialGradient id={g('white')} cx="40%" cy="35%" r="70%">
                  <Stop offset="0" stopColor="#FFFFFF" />
                  <Stop offset="1" stopColor="#D9E4DF" />
                </RadialGradient>
              </Defs>
              {s.eyes.map(([ex, ey], i) => (
                <Ellipse key={i} cx={ex} cy={ey} rx={9} ry={11} fill={url('white')} />
              ))}
            </Svg>
          )}
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, lookStyle]}>
            <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
              <Defs>
                <LinearGradient id={g('iris')} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#0B0B10" />
                  <Stop offset="1" stopColor="#35463E" />
                </LinearGradient>
                <RadialGradient id={g('glow')} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#D8FFC9" />
                  <Stop offset="1" stopColor="#7EE08A" />
                </RadialGradient>
              </Defs>
              {s.eyes.map(([ex, ey], i) =>
                cartoon ? (
                  <G key={i}>
                    <Ellipse cx={ex + 0.8} cy={ey + 2} rx={6.4} ry={7.4} fill={url('iris')} />
                    <Circle cx={ex + 0.8} cy={ey + 2.4} r={3.3} fill="#040406" />
                    <Circle cx={ex + 3.4} cy={ey - 1.6} r={2.5} fill="#fff" />
                    <Circle cx={ex - 1.6} cy={ey + 5.6} r={1.1} fill="#fff" opacity={0.85} />
                  </G>
                ) : (
                  <G key={i}>
                    <Ellipse cx={ex} cy={ey} rx={6.5} ry={8.5} fill={url('glow')} />
                    <Ellipse cx={ex - 1.5} cy={ey - 3} rx={1.8} ry={2.4} fill="#fff" opacity={0.8} />
                  </G>
                ),
              )}
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
