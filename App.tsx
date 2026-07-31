// App.tsx – Dashboard header always visible, other tabs guarded
import React, { useEffect, useState } from 'react';
import { View, Easing, Modal, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
import Constants from 'expo-constants';

// One-time env check — 'storeClient' = Expo Go, 'standalone'/'bare' = real build
console.log('[EnvCheck] executionEnvironment:', Constants.executionEnvironment);
import { createStackNavigator } from '@react-navigation/stack';
import { set403Callback } from './hooks/useAuthApi';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { BottomNavBar } from './components/BottomNavBar';
import { usePermissions } from './hooks/usePermissions';
import { PermissionContext, usePermissionContext } from './hooks/PermissionContext';
import {
  setupForegroundHandler,
  setupNotificationListeners,
  handleInitialNotification,
} from './hooks/useNotifications';

import LoginScreen           from './screens/LoginScreen';
import DashboardScreen       from './screens/DashboardScreen';
import ServiceScreen         from './screens/ServiceScreen';
import UsersScreen           from './screens/UsersScreen';
import AddUserScreen         from './screens/AddUserScreen';
import EditUserScreen        from './screens/EditUserScreen';
import LeadsScreen           from './screens/LeadsScreen';
import AddEditLeadScreen     from './screens/Addeditleadscreen';
import ProjectsScreen        from './screens/ProjectsScreen';
import AddEditProjectScreen  from './screens/AddEditProjectScreen';
import AddEditServiceScreen  from './screens/AddEditServiceScreen';
import ProjectTrackingScreen from './screens/ProjectTrackingScreen';
import NoAccessScreen        from './screens/NoAccessScreen';
import NotificationsScreen   from './screens/NotificationsScreen';
import ProfileScreen         from './screens/ProfileScreen';
import EditProfileScreen     from './screens/EditProfileScreen';
import ChangePasswordScreen  from './screens/ChangePasswordScreen';
import SplashScreenView      from './components/SplashScreenView';
import { AppScreenSkeleton } from './components/Skeleton';

// ── Navigation ref (used by notification deep-links outside React tree) ──
export const navigationRef = createNavigationContainerRef();

// ── Set foreground notification display behaviour once at module load ──
setupForegroundHandler();

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();
const queryClient = new QueryClient();

// Premium slide: incoming slides from right + subtle scale, outgoing dims + slides left
function premiumSlide({ current, next, layouts }: any) {
  const W = layouts.screen.width;
  return {
    cardStyle: next
      ? {
          // Screen being pushed behind: slide slightly left + dim
          transform: [{
            translateX: next.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -W * 0.22],
            }),
          }],
          opacity: next.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.88],
          }),
        }
      : {
          // Incoming screen: slide from right + fade + subtle grow
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [W, 0],
              }),
            },
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.12, 1],
            outputRange: [0, 1, 1],
          }),
        },
  };
}

function LoadingScreen({ title }: { title?: string }) {
  return <AppScreenSkeleton title={title} />;
}

function SplashScreen() {
  const navigation = useNavigation<any>();
  return (
    <SplashScreenView onFinish={() => navigation.replace('Login')} />
  );
}

// ── Guarded screens for all tabs EXCEPT Dashboard ──
function GuardedService(props: any) {
  const { canAccess, loading } = usePermissionContext();
  if (loading) return <LoadingScreen title="Service" />;
  if (!canAccess('service')) return <NoAccessScreen moduleName="Service" />;
  return <ServiceScreen {...props} />;
}

function GuardedProjects(props: any) {
  const { canAccess, loading } = usePermissionContext();
  if (loading) return <LoadingScreen title="Projects" />;
  if (!canAccess('project')) return <NoAccessScreen moduleName="Projects" />;
  return <ProjectsScreen {...props} />;
}

function GuardedLeads(props: any) {
  const { canAccess, loading } = usePermissionContext();
  if (loading) return <LoadingScreen title="Leads" />;
  if (!canAccess('lead')) return <NoAccessScreen moduleName="Leads" />;
  return <LeadsScreen {...props} />;
}

function GuardedUsers(props: any) {
  const { canAccess, loading } = usePermissionContext();
  if (loading) return <LoadingScreen title="Users" />;
  if (!canAccess('users')) return <NoAccessScreen moduleName="Users" />;
  return <UsersScreen {...props} />;
}

// ── TabGroup ──
function TabGroup() {
  const { canAccess, hasPermission, isSuperuser, loading, refreshPermissions } = usePermissions();

  return (
    <PermissionContext.Provider value={{ canAccess, hasPermission, isSuperuser, loading, refreshPermissions }}>
      <Tab.Navigator
        tabBar={(props) => <BottomNavBar {...props} />}
        sceneContainerStyle={{ backgroundColor: '#F5F6F8' }}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Service"   component={GuardedService} />
        <Tab.Screen name="Projects"  component={GuardedProjects} />
        <Tab.Screen name="Leads"     component={GuardedLeads} />
        <Tab.Screen name="Users"     component={GuardedUsers} />
      </Tab.Navigator>
    </PermissionContext.Provider>
  );
}

function MainApp() {
  const [forbidden, setForbidden] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  useEffect(() => {
    const cleanup = setupNotificationListeners(navigationRef);
    return cleanup;
  }, []);

  useEffect(() => {
    set403Callback(msg => setForbidden({ visible: true, message: msg }));
    return () => set403Callback(null);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Modal
        visible={forbidden.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setForbidden(f => ({ ...f, visible: false }))}
      >
        <View style={appStyles.overlay}>
          <View style={appStyles.forbiddenBox}>
            <View style={appStyles.forbiddenIcon}>
              <Text style={{ fontSize: 28 }}>🚫</Text>
            </View>
            <Text style={appStyles.forbiddenTitle}>Access Denied</Text>
            <Text style={appStyles.forbiddenMsg}>{forbidden.message}</Text>
            <TouchableOpacity
              style={appStyles.forbiddenBtn}
              onPress={() => setForbidden(f => ({ ...f, visible: false }))}
              activeOpacity={0.8}
            >
              <Text style={appStyles.forbiddenBtnTxt}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: premiumSlide,
        transitionSpec: {
          open:  { animation: 'timing', config: { duration: 340, easing: Easing.out(Easing.poly(4)) } },
          close: { animation: 'timing', config: { duration: 280, easing: Easing.inOut(Easing.poly(4)) } },
        },
      }}
    >
      <Stack.Screen name="Splash"                component={SplashScreen} />
      <Stack.Screen name="Login"                 component={LoginScreen} />
      <Stack.Screen name="MainTabs"              component={TabGroup} />
      <Stack.Screen name="AddUser"               component={AddUserScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditUser"              component={EditUserScreen} />
      <Stack.Screen name="AddEditLead"           component={AddEditLeadScreen} />
      <Stack.Screen name="AddEditProject"        component={AddEditProjectScreen} />
      <Stack.Screen name="ProjectTrackingScreen" component={ProjectTrackingScreen} />
      <Stack.Screen name="AddEditService"        component={AddEditServiceScreen} />
      <Stack.Screen name="Notifications"         component={NotificationsScreen} />
      <Stack.Screen name="Profile"               component={ProfileScreen} />
      <Stack.Screen name="EditProfile"           component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword"        component={ChangePasswordScreen} />
    </Stack.Navigator>
    </View>
  );
}

const appStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  forbiddenBox: { backgroundColor: '#FFF', borderRadius: 20, alignItems: 'center', padding: 28, width: '100%', maxWidth: 320, elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  forbiddenIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  forbiddenTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 8 },
  forbiddenMsg: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  forbiddenBtn: { backgroundColor: '#8E1C1C', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  forbiddenBtnTxt: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          // Handle the case where the app was closed when the notification
          // was tapped — navigate once the navigator is fully mounted.
          handleInitialNotification(navigationRef);
        }}
      >
        <MainApp />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
