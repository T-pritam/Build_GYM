import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { navigationRef } from './navigationRef';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Main Tab Screens
import HomeScreen from '../screens/main/HomeScreen';
import CafeScreen from '../screens/main/CafeScreen';
import AccessScreen from '../screens/main/AccessScreen';

// Cafe sub-screens
import ItemDetailScreen from '../screens/cafe/ItemDetailScreen';
import CartScreen from '../screens/cafe/CartScreen';
import OrderConfirmationScreen from '../screens/cafe/OrderConfirmationScreen';
import OrderTrackingScreen from '../screens/cafe/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/cafe/OrderHistoryScreen';
import CafeRewardsScreen from '../screens/cafe/RewardsScreen';

// Profile screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import MembershipScreen from '../screens/profile/MembershipScreen';
import MembershipPlansScreen from '../screens/profile/MembershipPlansScreen';
import PauseSubscriptionScreen from '../screens/profile/PauseSubscriptionScreen';
import BuildCoinTransactionsScreen from '../screens/profile/BuildCoinTransactionsScreen';
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
import BookingConfirmationScreen from '../screens/main/BookingConfirmationScreen';
import BookingQRScreen from '../screens/main/BookingQRScreen';
import TrainersScreen from '../screens/main/TrainersScreen';

// Custom tab bar
import CustomTabBar from '../components/CustomTabBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom tab navigator for main app
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cafe" component={CafeScreen} />
      <Tab.Screen name="Access" component={AccessScreen} />
      {/* Extra tabs handled by custom bar (navigated programmatically) */}
      <Tab.Screen name="NotificationsTab" component={NotificationsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const initialize      = useAuthStore((s) => s.initialize);

  // Bootstrap: read SecureStore once on mount before any navigation decision.
  useEffect(() => {
    initialize();
  }, []);

  /**
   * When the user is logged out from anywhere (token refresh failure, manual
   * logout, etc.) reset the stack back to the Login screen so they can't
   * navigate back into protected screens.
   * Guard with isLoading so we don't fire before SecureStore is read on launch.
   */
  useEffect(() => {
    if (!isLoading && !isAuthenticated && navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [isAuthenticated, isLoading]);

  return (
    <NavigationContainer ref={navigationRef}>
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

        {/* Main app */}
        <Stack.Screen name="MainTabs" component={MainTabs} />

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
