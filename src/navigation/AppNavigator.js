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

// Profile screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import MembershipScreen from '../screens/profile/MembershipScreen';
import BuildCoinTransactionsScreen from '../screens/profile/BuildCoinTransactionsScreen';
import ActivityDashboardScreen from '../screens/profile/ActivityDashboardScreen';
import ComplaintScreen from '../screens/profile/ComplaintScreen';
import MyComplaintsScreen from '../screens/profile/MyComplaintsScreen';
import MyComplaintDetailScreen from '../screens/profile/MyComplaintDetailScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import PersonalDetailsScreen from '../screens/profile/PersonalDetailsScreen';
import HealthEmergencyScreen from '../screens/profile/HealthEmergencyScreen';

// Detail screens
import TrainerDetailScreen from '../screens/detail/TrainerDetailScreen';
import ArticleReaderScreen from '../screens/community/ArticleReaderScreen';
import AnnouncementDetailScreen from '../screens/main/AnnouncementDetailScreen';

// Main extra screens
import CommunityScreen from '../screens/main/CommunityScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ActivitiesScreen from '../screens/main/ActivitiesScreen';
import ActivityDetailScreen from '../screens/main/ActivityDetailScreen';
import MyBookingsScreen from '../screens/main/MyBookingsScreen';
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

  /**
   * When the user is logged out from anywhere (token refresh failure, manual
   * logout, etc.) reset the stack back to the Login screen so they can't
   * navigate back into protected screens.
   */
  useEffect(() => {
    if (!isAuthenticated && navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [isAuthenticated]);

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

        {/* Profile sub screens */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Membership" component={MembershipScreen} />
        <Stack.Screen name="BuildCoinTransactions" component={BuildCoinTransactionsScreen} />
        <Stack.Screen name="Activity" component={ActivityDashboardScreen} />
        <Stack.Screen name="Complaint" component={ComplaintScreen} />
        <Stack.Screen name="MyComplaints" component={MyComplaintsScreen} />
        <Stack.Screen name="MyComplaintDetail" component={MyComplaintDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
        <Stack.Screen name="HealthEmergency" component={HealthEmergencyScreen} />

        {/* Detail screens */}
        <Stack.Screen name="TrainerDetail" component={TrainerDetailScreen} />
        <Stack.Screen
          name="AnnouncementDetail"
          component={AnnouncementDetailScreen}
          options={{ animation: 'slide_from_right' }}
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
        <Stack.Screen name="Trainers" component={TrainersScreen} />
        <Stack.Screen
          name="ArticleReader"
          component={ArticleReaderScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
