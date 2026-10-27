import 'react-native-get-random-values';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PaperProvider>
            <RootNavigator />
            <StatusBar style="auto" />
            {/* Mobile equivalent of the web app's react-toastify <ToastContainer /> */}
            <Toast />
          </PaperProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </View>
  );
}
