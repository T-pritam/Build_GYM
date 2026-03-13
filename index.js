import { registerRootComponent } from 'expo';

import App from './App';

// Register background message handler for Firebase
// This must be called outside of any component lifecycle
try {
  const messaging = require('@react-native-firebase/messaging').default;
  
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
  });
} catch (error) {
  console.log('Firebase messaging not available or failed to initialize:', error.message);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
