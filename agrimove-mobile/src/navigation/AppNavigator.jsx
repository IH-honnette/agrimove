import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DriverListScreen from '../screens/DriverListScreen';
import DriverProfileScreen from '../screens/DriverProfileScreen';
import BookingFormScreen from '../screens/BookingFormScreen';
import BookingConfirmedScreen from '../screens/BookingConfirmedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import PriceEstimatorScreen from '../screens/PriceEstimatorScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="DriverList" component={DriverListScreen} />
            <Stack.Screen
              name="DriverProfile"
              component={DriverProfileScreen}
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="BookingForm" component={BookingFormScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="PriceEstimator" component={PriceEstimatorScreen} options={{ animation: 'slide_from_right' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
