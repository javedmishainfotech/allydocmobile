import 'react-native-get-random-values';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { IncomingCallProvider } from './src/contexts/IncomingCallContext';
import IncomingCallModal from './src/components/calls/IncomingCallModal';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ReduxProvider store={store}>
            <PaperProvider>
              <IncomingCallProvider>
                <RootNavigator />
                <IncomingCallModal />
              </IncomingCallProvider>
              <StatusBar style="auto" />
              {/* Mobile equivalent of the web app's react-toastify <ToastContainer /> */}
              <Toast />
            </PaperProvider>
          </ReduxProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </View>
  );
}
