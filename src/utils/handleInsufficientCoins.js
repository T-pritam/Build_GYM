import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Called whenever a coin deduction would fail due to insufficient balance.
 * Fires a local push notification + shows an informational Alert.
 *
 * Deliberately offers no way to buy coins. Coins are a digital good, so App
 * Store guideline 3.1.1 forbids selling them for real money outside Apple's
 * IAP — and that covers a button that sends the member somewhere else to pay.
 * Members top up at reception or on the web, reached from email/WhatsApp, never
 * from inside the app.
 *
 * @param {object} params
 * @param {number} params.required  - coins needed
 * @param {number} params.balance   - current balance
 */
export async function handleInsufficientCoins({ required, balance }) {
  const shortage = required - balance;

  // Fire an immediate local notification so it appears in the device tray
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Insufficient Build Coins',
        body: `You need ${shortage} more coin${shortage !== 1 ? 's' : ''} to complete this action.`,
        data: { type: 'insufficient_coins' },
      },
      trigger: null, // fire immediately
    });
  } catch {
    // Notification permission may not be granted — fail silently
  }

  Alert.alert(
    'Insufficient Coins',
    `You need ₿ ${required} but only have ₿ ${balance}.`,
    [{ text: 'OK', style: 'cancel' }],
  );
}
