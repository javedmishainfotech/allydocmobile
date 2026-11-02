import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
// Defines the background notification task (expo-notifications requires this at module scope of
// a file required early - see src/services/pushNotifications.js for what the task does).
import { registerBackgroundNotificationTask } from './src/services/pushNotifications';

import App from './App';

registerBackgroundNotificationTask();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
