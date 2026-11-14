import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export function ScreenHeader({ title, icon = 'chevron-back', right }: { title?: string; icon?: 'chevron-back' | 'close'; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} style={styles.btn} hitSlop={10}>
        <Ionicons name={icon} size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 12 },
  btn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontFamily: fonts.medium, color: colors.text, textAlign: 'center' },
});
