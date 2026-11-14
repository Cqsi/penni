import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotAvatar } from '../../bots/BotAvatar';
import { useBotId } from '../../lib/setup';
import { colors, fonts } from '../../theme';

/** Bottom nav: Home, Chat and Profile. The chat tab's icon is the user's own bot. */
export default function TabsLayout() {
  const botId = useBotId();
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: [styles.bar, { height: 58 + Math.max(bottom, 8), paddingTop: 6, paddingBottom: Math.max(bottom, 8) }],
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.bot, { opacity: focused ? 1 : 0.55 }]}>
              <BotAvatar id={botId} size={30} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={26} color={color as string} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, elevation: 0 },
  label: { fontSize: 11, fontFamily: fonts.medium },
  bot: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});
