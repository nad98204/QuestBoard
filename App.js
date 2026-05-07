import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import QuestBoardScreen from './src/screens/QuestBoardScreen';
import { startupScheduleDailyNotifications } from './src/utils/notifications';

export default function App() {
  useEffect(() => {
    startupScheduleDailyNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.safe}>
        <QuestBoardScreen />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0c0c10',
  },
});
