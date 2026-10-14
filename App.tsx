// App.tsx – Dashboard header always visible, other tabs guarded
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
import Constants from 'expo-constants';
import * as SystemUI from 'expo-system-ui';

// One-time env check — 'storeClient' = Expo Go, 'standalone'/'bare' = real build
console.log('[EnvCheck] executionEnvironment:', Constants.executionEnvironment);

// Android's root window background is white by default, and nothing was
// ever setting it past the one-time splash screen — so a 'fade' transition
// between two screens (where both are briefly semi-transparent) exposed
// that white window underneath for a frame or two. Matching the app's own
// maroon (every screen's own header band, not the pale body background —
// a near-white fill would still read as "white" during a fast flash).
SystemUI.setBackgroundColorAsync('#8E1C1C');
// Native stack (not @react-navigation/stack's JS-rendered one): transitions
// run through the OS's own navigation APIs — UINavigationController push/pop
// on iOS, Fragment transitions on Android — the same primitives WhatsApp,
// Instagram and Reddit's native screens use. This is what the JS stack was
// only ever approximating with Animated + a hand-built card shadow, which is
// also what was causing the white sliver glitch at the corner on back nav —
// there's no custom-drawn shadow layer here to glitch in the first place.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { set403Callback, setForceLogoutCallback, clearAuthTokens, loadStoredTokens } from './hooks/useAuthApi';
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
import MyProgressScreen      from './screens/MyProgressScreen';
import AddUserScreen         from './screens/AddUserScreen';
import EditUserScreen        from './screens/EditUserScreen';
import LeadsScreen           from './screens/LeadsScreen';
import AddEditLeadScreen     from './screens/Addeditleadscreen';
import ProjectsScreen        from './screens/ProjectsScreen';
import AddEditProjectScreen  from './screens/AddEditProjectScreen';
import AddEditServiceScreen  from './screens/AddEditServiceScreen';
import ProjectTrackingScreen from './screens/ProjectTrackingScreen';
import ManagePaymentsScreen  from './screens/ManagePaymentsScreen';
import NoAccessScreen        from './screens/NoAccessScreen';
import NotificationsScreen   from './screens/NotificationsScreen';
import ProfileScreen         from './screens/ProfileScreen';
import EditProfileScreen     from './screens/EditProfileScreen';
import ChangePasswordScreen  from './screens/ChangePasswordScreen';
import SplashScreenView      from './components/SplashScreenView';
import { AppScreenSkeleton } from './components/Skeleton';

// Remove browser focus outlines on all inputs for web
if (Platform.OS === 'web') {
  const s = document.createElement('style');
  s.textContent = 'input, textarea { outline: none !important; box-shadow: none !important; }';
  document.head.appendChild(s);
}

// ── Navigation ref (used by notification deep-links outside React tree) ──
export const navigationRef = createNavigationContainerRef();

// ── Set foreground notification display behaviour once at module load ──
setupForegroundHandler();

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
const queryClient = new QueryClient();

function LoadingScreen({ title }: { title?: string }) {
  return <AppScreenSkeleton title={title} />;
}

function SplashScreen() {
  const navigation = useNavigation<any>();
  const hasTokensRef = useRef<boolean>(false);
  const storedUserRef = useRef<any>(null);

  useEffect(() => {
    loadStoredTokens().then(result => {
      hasTokensRef.current = result.valid;
      storedUserRef.current = result.user ?? null;
    });
  }, []);

  const handleFinish = () => {
    if (hasTokensRef.current) {
      navigation.replace('MainTabs', {
        screen: 'Dashboard',
        params: { user: storedUserRef.current },
      });
    } else {
      navigation.replace('Login');
    }
  };

  return <SplashScreenView onFinish={handleFinish} />;
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

// This tab is "Users" for a superuser (or anyone explicitly granted user
// management), and "My Progress" — a personal snapshot of their own leads/
// projects/service tickets — for everyone else, instead of a permanently
// locked tab that led nowhere.
function GuardedUsers(props: any) {
  const { canAccess, isSuperuser, loading } = usePermissionContext();
  if (loading) return <LoadingScreen title={isSuperuser ? 'Users' : 'My Progress'} />;
  if (isSuperuser || canAccess('users')) return <UsersScreen {...props} />;
  return <MyProgressScreen {...props} />;
}

// ── TabGroup ──
function TabGroup() {
  const { canAccess, hasPermission, isSuperuser, loading, refreshPermissions } = usePermissions();

  return (
    <PermissionContext.Provider value={{ canAccess, hasPermission, isSuperuser, loading, refreshPermissions }}>
      <Tab.Navigator
        tabBar={(props) => <BottomNavBar {...props} />}
        sceneContainerStyle={{ backgroundColor: '#F5F6F8' }}
        // No cross-fade here — several tab screens paint a full-height
        // maroon root, so a fade briefly overlaps two of those and reads
        // as a solid red flash. An instant switch (standard for bottom
        // tabs, since they're independent sections, not a stack) avoids it.
        // lazy: false — mount every tab (and kick off its first data fetch)
        // right away instead of waiting for its first visit. Previously
        // each tab only mounted (and showed its loading skeleton) the
        // moment you first tapped it, which read as "a loading screen
        // between modules" even though it was really just that tab's
        // first-ever fetch. Pre-warming them all in the background means
        // by the time you actually switch, the data's already there.
        screenOptions={{ headerShown: false, animation: 'none', lazy: false }}
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

  useEffect(() => {
    setForceLogoutCallback((msg: string) => {
      clearAuthTokens();
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Login' as never, params: { forceLogoutMessage: msg } }],
        });
      }
    });
    return () => setForceLogoutCallback(null);
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
        // Fade instead of any slide — the "Material fade-through" pattern
        // a lot of modern apps use. No horizontal motion to feel slow;
        // just a quick native cross-fade between screens.
        animation: 'fade',
        // Fills any gap the transition briefly exposes between screens —
        // matches the SystemUI root window color set above, so both the
        // native-window layer and this JS-level layer agree, rather than
        // one being maroon and the other a pale near-white gray.
        contentStyle: { backgroundColor: '#8E1C1C' },
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
      <Stack.Screen name="ManagePayments"        component={ManagePaymentsScreen} />
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
  const app = (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          handleInitialNotification(navigationRef);
        }}
      >
        <MainApp />
      </NavigationContainer>
    </QueryClientProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={webShell.outer}>
        <View style={webShell.phone}>{app}</View>
      </View>
    );
  }
  return app;
}

const webShell = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 390,
    height: '100%' as any,
    maxHeight: 844,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
  },
});
