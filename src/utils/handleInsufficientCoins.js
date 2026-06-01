import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Called whenever a coin deduction would fail due to insufficient balance.
 * Fires a local push notification + shows an Alert with a "Top Up" button
 * that navigates the user to the coin purchase screen.
 *
 * @param {object} params
 * @param {number} params.required  - coins needed
 * @param {number} params.balance   - current balance
 * @param {object} params.navigation - React Navigation prop
 */
export async function handleInsufficientCoins({ required, balance, navigation }) {
  const shortage = required - balance;

  // Fire an immediate local notification so it appears in the device tray
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Insufficient Build Coins',
        body: `You need ${shortage} more coin${shortage !== 1 ? 's' : ''} to complete this action. Top up your wallet now.`,
        data: { type: 'insufficient_coins' },
      },
      trigger: null, // fire immediately
    });
  } catch {
    // Notification permission may not be granted — fail silently
  }

  Alert.alert(
    'Insufficient Coins',
    `You need ₿ ${required} but only have ₿ ${balance}.\nTop up your wallet to continue.`,
    [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Top Up',
        onPress: () => navigation.navigate('BuildCoinTransactions', { returnTo: true }),
      },
    ],
  );
}
