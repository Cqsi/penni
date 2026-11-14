import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotAvatar, botHeadroom } from '../bots/BotAvatar';
import { ALL_BOTS, PICKABLE, type BotId } from '../bots/bots';
import { AppBar } from '../components/AppBar';
import { SpeechBubble } from '../components/SpeechBubble';
import { colors, fonts, radius } from '../theme';

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

export default function PickBot() {
  const [selected, setSelected] = useState<BotId>(PICKABLE[0]);
  const [hop, setHop] = useState(0);
  const bot = ALL_BOTS[selected];

  const choose = (id: BotId) => {
    tap();
    setSelected(id);
    setHop((h) => h + 1);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppBar right={<View />} />
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        Pick your money buddy
      </Text>

      <View style={styles.stage}>
        <SpeechBubble text={bot.greeting} />
        <Pressable onPress={() => choose(selected)} style={{ marginTop: -botHeadroom(selected, 210) + 6 }}>
          <BotAvatar id={selected} size={210} hopSignal={hop} />
        </Pressable>
        <Text style={styles.name}>{bot.name}</Text>
        <Text style={styles.role}>{bot.role}</Text>
      </View>

      <View style={styles.row}>
        {PICKABLE.map((id, i) => {
          const active = id === selected;
          return (
            <Pressable key={id} onPress={() => choose(id)} style={[styles.option, active && styles.optionActive]}>
              <BotAvatar id={id} size={60} phase={i + 1} />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        onPress={() => {
          tap();
          router.push({ pathname: '/home', params: { bot: selected } });
        }}
      >
        <Text style={styles.ctaText}>Continue</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: fonts.medium, color: colors.text, marginTop: 20, letterSpacing: -0.8 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  role: { fontSize: 15, lineHeight: 21, color: colors.muted, fontFamily: fonts.regular, textAlign: 'center', marginTop: 4, maxWidth: 290 },
  name: { fontSize: 20, fontFamily: fonts.medium, color: colors.text, marginTop: 10, letterSpacing: -0.3 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 24 },
  option: { width: 86, height: 86, borderRadius: 28, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  optionActive: { borderColor: colors.brand },
  cta: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontFamily: fonts.medium },
});
