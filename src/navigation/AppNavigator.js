import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Main Tab Screens
import HomeScreen from '../screens/main/HomeScreen';
import CafeScreen from '../screens/main/CafeScreen';
import AccessScreen from '../screens/main/AccessScreen';

// Cafe sub-screens
import ItemDetailScreen from '../screens/cafe/ItemDetailScreen';
import CartScreen from '../screens/cafe/CartScreen';

// Profile screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import MembershipScreen from '../screens/profile/MembershipScreen';
import BuildCoinTransactionsScreen from '../screens/profile/BuildCoinTransactionsScreen';
import ActivityDashboardScreen from '../screens/profile/ActivityDashboardScreen';
import ComplaintScreen from '../screens/profile/ComplaintScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';

// Detail screens
import TrainerDetailScreen from '../screens/detail/TrainerDetailScreen';

// Main extra screens
import CommunityScreen from '../screens/main/CommunityScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ActivitiesScreen from '../screens/main/ActivitiesScreen';
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
  return (
    <NavigationContainer>
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

        {/* Profile sub screens */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Membership" component={MembershipScreen} />
        <Stack.Screen name="BuildCoinTransactions" component={BuildCoinTransactionsScreen} />
        <Stack.Screen name="Activity" component={ActivityDashboardScreen} />
        <Stack.Screen name="Complaint" component={ComplaintScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />

        {/* Detail screens */}
        <Stack.Screen name="TrainerDetail" component={TrainerDetailScreen} />

        {/* Community & Leaderboard */}
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Activities" component={ActivitiesScreen} />
        <Stack.Screen name="Trainers" component={TrainersScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
