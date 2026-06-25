import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useMembershipStore } from '../store/membershipStore';
import { navigationRef } from './navigationRef';
import { logScreenView } from '../services/analyticsService';
import FrozenLockScreen from '../screens/membership/FrozenLockScreen';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Main hub + reachable screens
import HomeScreen from '../screens/main/HomeScreen';
import CafeScreen from '../screens/main/CafeScreen';
import PresenceScreen from '../screens/main/PresenceScreen';
import AccessScreen from '../screens/main/AccessScreen';
import AccessGrantedScreen from '../screens/main/AccessGrantedScreen';
import AccessDeniedScreen from '../screens/main/AccessDeniedScreen';

// Cafe sub-screens
import ItemDetailScreen from '../screens/cafe/ItemDetailScreen';
import CartScreen from '../screens/cafe/CartScreen';
import OrderConfirmationScreen from '../screens/cafe/OrderConfirmationScreen';
import CafeOrderFailedScreen from '../screens/cafe/CafeOrderFailedScreen';
import OrderTrackingScreen from '../screens/cafe/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/cafe/OrderHistoryScreen';
import CafeRewardsScreen from '../screens/cafe/RewardsScreen';

// Profile screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import MembershipScreen from '../screens/profile/MembershipScreen';
import MembershipPlansScreen from '../screens/profile/MembershipPlansScreen';
import PauseSubscriptionScreen from '../screens/profile/PauseSubscriptionScreen';
import BuildCoinTransactionsScreen from '../screens/profile/BuildCoinTransactionsScreen';
import AddBuildCoinsScreen from '../screens/profile/AddBuildCoinsScreen';
import PaymentSuccessScreen from '../screens/profile/PaymentSuccessScreen';
import PaymentFailedScreen from '../screens/profile/PaymentFailedScreen';
import TransactionDetailScreen from '../screens/profile/TransactionDetailScreen';
import ActivityDashboardScreen from '../screens/profile/ActivityDashboardScreen';
import ComplaintScreen from '../screens/profile/ComplaintScreen';
import MyComplaintsScreen from '../screens/profile/MyComplaintsScreen';
import MyComplaintDetailScreen from '../screens/profile/MyComplaintDetailScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import PersonalDetailsScreen from '../screens/profile/PersonalDetailsScreen';
import HealthEmergencyScreen from '../screens/profile/HealthEmergencyScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ConsentPreferencesScreen from '../screens/profile/ConsentPreferencesScreen';
import SupportScreen from '../screens/profile/SupportScreen';
import AchievementsScreen from '../screens/profile/AchievementsScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

// Workout screens
import {
  WorkoutHomeScreen,
  WorkoutSessionScreen,
  WorkoutSummaryScreen,
  MuscleGroupPickerScreen,
  ExercisePickerScreen,
  WorkoutStatsScreen,
  WorkoutHistoryScreen,
  WorkoutDetailScreen,
  PersonalRecordsScreen,
  MuscleDistributionScreen,
  StreakDetailScreen,
} from '../screens/workout';

// Detail screens
import TrainerDetailScreen from '../screens/detail/TrainerDetailScreen';
import ArticleReaderScreen from '../screens/community/ArticleReaderScreen';
import BlogListScreen from '../screens/community/BlogListScreen';
import BlogFeedScreen from '../screens/community/BlogFeedScreen';
import CommunityFeedScreen from '../screens/community/CommunityFeedScreen';
import CreatePostScreen from '../screens/community/CreatePostScreen';
import PostDetailScreen from '../screens/community/PostDetailScreen';
import AnnouncementDetailScreen from '../screens/main/AnnouncementDetailScreen';

// Main extra screens
import CommunityScreen from '../screens/main/CommunityScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ActivitiesScreen from '../screens/main/ActivitiesScreen';
import ActivityDetailScreen from '../screens/main/ActivityDetailScreen';
import MyBookingsScreen from '../screens/main/MyBookingsScreen';
import BookingDetailScreen from '../screens/main/BookingDetailScreen';
import BookingCancelledScreen from '../screens/main/BookingCancelledScreen';
import TrialDetailScreen from '../screens/main/TrialDetailScreen';
import BookingConfirmationScreen from '../screens/main/BookingConfirmationScreen';
import BookingQRScreen from '../screens/main/BookingQRScreen';
import TrainersScreen from '../screens/main/TrainersScreen';

const Stack = createNativeStackNavigator();

/**
 * Gate around the main app: when the member's membership is `frozen`
 * (admin- or member-initiated pause) the entire app is replaced by a single
 * static lock screen (v1 hard lock per BA sheet 4.1). Status is refreshed on
 * mount and whenever a MEMBERSHIP_* push arrives (via membershipStore.refresh).
 *
 * The redesign drops the bottom tab bar: Home is the hub and Café/Access/etc.
 * are reached as pushed stack screens. The route name stays `MainTabs` because
 * the auth flow + apiService reset/replace to it.
 */
function MainTabsGate(props) {
  const status  = useMembershipStore((s) => s.status);
  const loaded  = useMembershipStore((s) => s.loaded);
  const refresh = useMembershipStore((s) => s.refresh);

  useEffect(() => {
    refresh();
  }, []);

  // Until the first status fetch resolves, show a brief loader so a frozen
  // member never flashes the full app. On network failure refresh() still sets
  // loaded=true (status stays null) so offline users are not locked out.
  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080608', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#A78BFA" />
      </View>
    );
  }

  if (status === 'frozen') return <FrozenLockScreen />;
  return <HomeScreen {...props} />;
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const initialize      = useAuthStore((s) => s.initialize);

  // Bootstrap: read SecureStore once on mount before any navigation decision.
  useEffect(() => {
    initialize();
  }, []);

  // GA4 screen_view — logs the active route name on every navigation change.
  const lastRoute = useRef(null);
  const handleStateChange = () => {
    const current = navigationRef.getCurrentRoute()?.name;
    if (current && current !== lastRoute.current) {
      lastRoute.current = current;
      logScreenView(current).catch(() => {});
    }
  };

  /**
   * When the user is logged out from anywhere (token refresh failure, manual
   * logout, etc.) reset the stack back to the Login screen so they can't
   * navigate back into protected screens.
   * Guard with isLoading so we don't fire before SecureStore is read on launch.
   */
  useEffect(() => {
    if (!isLoading && !isAuthenticated && navigationRef.isReady()) {
      useMembershipStore.getState().reset(); // drop stale freeze status on logout
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [isAuthenticated, isLoading]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={handleStateChange}
      onStateChange={handleStateChange}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0D0D0D' },
        }}
      >
        {/* Auth flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ animation: 'fade' }}
        />

        {/* Main app (gated by membership freeze status) */}
        <Stack.Screen name="MainTabs" component={MainTabsGate} />

        {/* Hub destinations (formerly bottom tabs) */}
        <Stack.Screen name="Cafe" component={CafeScreen} />
        {/* Check-in opens as a Stitch bottom-sheet modal over Home (Home dims behind). */}
        <Stack.Screen
          name="Access"
          component={PresenceScreen}
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        {/* Real door-access screen (BLE + AxTraxPro). Reached via a temp chip on
            PresenceScreen for now; the live route is swapped Presence → Access later. */}
        <Stack.Screen name="AccessControl" component={AccessScreen} />
        <Stack.Screen
          name="AccessGranted"
          component={AccessGrantedScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="AccessDenied"
          component={AccessDeniedScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />

        {/* Cafe sub screens */}
        <Stack.Screen
          name="ItemDetail"
          component={ItemDetailScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="OrderConfirmation"
          component={OrderConfirmationScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="CafeOrderFailed"
          component={CafeOrderFailedScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="OrderTracking"
          component={OrderTrackingScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="OrderHistory"
          component={OrderHistoryScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="CafeRewards"
          component={CafeRewardsScreen}
          options={{ animation: 'slide_from_right' }}
        />

        {/* Profile sub screens */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Membership" component={MembershipScreen} />
        <Stack.Screen name="MembershipPlans" component={MembershipPlansScreen} />
        <Stack.Screen
          name="PauseSubscription"
          component={PauseSubscriptionScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="BuildCoinTransactions" component={BuildCoinTransactionsScreen} />
        <Stack.Screen
          name="AddBuildCoins"
          component={AddBuildCoinsScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="PaymentSuccess"
          component={PaymentSuccessScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="PaymentFailed"
          component={PaymentFailedScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="TransactionDetail"
          component={TransactionDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="Activity" component={ActivityDashboardScreen} />
        <Stack.Screen name="Complaint" component={ComplaintScreen} />
        <Stack.Screen name="MyComplaints" component={MyComplaintsScreen} />
        <Stack.Screen name="MyComplaintDetail" component={MyComplaintDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
        <Stack.Screen name="HealthEmergency" component={HealthEmergencyScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ConsentPreferences" component={ConsentPreferencesScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />

        {/* Detail screens */}
        <Stack.Screen name="TrainerDetail" component={TrainerDetailScreen} />
        <Stack.Screen
          name="AnnouncementDetail"
          component={AnnouncementDetailScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        {/* Community & Leaderboard */}
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Activities" component={ActivitiesScreen} />
        <Stack.Screen
          name="ActivityDetail"
          component={ActivityDetailScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="MyBookings"
          component={MyBookingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="BookingDetail"
          component={BookingDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="TrialDetail"
          component={TrialDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="BookingCancelled"
          component={BookingCancelledScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="BookingConfirmation"
          component={BookingConfirmationScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="BookingQR"
          component={BookingQRScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Trainers" component={TrainersScreen} />

        {/* Workout screens */}
        <Stack.Screen name="WorkoutHome" component={WorkoutHomeScreen} />
        <Stack.Screen name="WorkoutSession" component={WorkoutSessionScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="MuscleGroupPicker" component={MuscleGroupPickerScreen} />
        <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} />
        <Stack.Screen name="WorkoutStats" component={WorkoutStatsScreen} />
        <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
        <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
        <Stack.Screen name="PersonalRecords" component={PersonalRecordsScreen} />
        <Stack.Screen name="MuscleDistribution" component={MuscleDistributionScreen} />
        <Stack.Screen name="StreakDetail" component={StreakDetailScreen} />
        <Stack.Screen
          name="ArticleReader"
          component={ArticleReaderScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="BlogList"
          component={BlogListScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="BlogFeed"
          component={BlogFeedScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="CommunityFeed"
          component={CommunityFeedScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="CreatePost"
          component={CreatePostScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="PostDetail"
          component={PostDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
