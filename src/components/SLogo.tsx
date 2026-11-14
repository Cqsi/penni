import { Image } from 'react-native';

/** The S-Bank logo (official S-mobiili app icon). */
export function SLogo({ size = 32 }: { size?: number }) {
  return <Image source={require('../../assets/banks/sbank.png')} style={{ width: size, height: size, borderRadius: size * 0.24 }} />;
}
