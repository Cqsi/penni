import type { ImageSourcePropType } from 'react-native';

// Banks offered in onboarding. Logos are each bank's official iOS app icon (App Store artwork).
export type Bank = { id: string; name: string; logo: ImageSourcePropType };

/** The biggest banks in Finland after S-Bank, shown as buttons. */
export const MAIN_BANKS: Bank[] = [
  { id: 'op', name: 'OP', logo: require('../../assets/banks/op.png') },
  { id: 'nordea', name: 'Nordea', logo: require('../../assets/banks/nordea.png') },
  { id: 'danske', name: 'Danske Bank', logo: require('../../assets/banks/danske.png') },
];

/** Shown in the "Other banks" sheet. */
export const OTHER_BANKS: Bank[] = [
  { id: 'handelsbanken', name: 'Handelsbanken', logo: require('../../assets/banks/handelsbanken.png') },
  { id: 'aktia', name: 'Aktia', logo: require('../../assets/banks/aktia.png') },
  { id: 'saastopankki', name: 'Säästöpankki', logo: require('../../assets/banks/saastopankki.png') },
  { id: 'pop', name: 'POP Pankki', logo: require('../../assets/banks/pop.png') },
  { id: 'omasp', name: 'Oma Säästöpankki', logo: require('../../assets/banks/omasp.png') },
  { id: 'alandsbanken', name: 'Ålandsbanken', logo: require('../../assets/banks/alandsbanken.png') },
  { id: 'nordnet', name: 'Nordnet', logo: require('../../assets/banks/nordnet.png') },
  { id: 'revolut', name: 'Revolut', logo: require('../../assets/banks/revolut.png') },
];
