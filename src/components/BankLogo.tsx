import { Image, StyleSheet } from 'react-native';
import type { Bank } from '../data/banks';
import { colors } from '../theme';

/** Bank logo as a rounded app-icon tile. */
export function BankLogo({ bank, size = 40 }: { bank: Pick<Bank, 'logo'>; size?: number }) {
  return <Image source={bank.logo} style={{ width: size, height: size, borderRadius: size * 0.24, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline }} />;
}
