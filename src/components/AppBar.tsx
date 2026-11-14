import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SLogo } from './SLogo';

/** Top bar with the S logo centred. */
export function AppBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>{left}</View>
      <SLogo size={30} />
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  side: { width: 48, justifyContent: 'center' },
});
