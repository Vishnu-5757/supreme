import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { BottomNavBar } from './components/BottomNavBar';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ServiceScreen from './screens/ServiceScreen';
import UsersScreen from './screens/UsersScreen';
import AddUserScreen from './screens/AddUserScreen';
import EditUserScreen from './screens/EditUserScreen';
import LeadsScreen from './screens/LeadsScreen';
import AddEditLeadScreen from './screens/Addeditleadscreen';
import ProjectsScreen from './screens/ProjectsScreen';
import AddEditProjectScreen from './screens/AddEditProjectScreen';
import AddEditServiceScreen from './screens/AddEditServiceScreen'; // future

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

function TabGroup() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Service" component={ServiceScreen} />
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen name="Leads" component={LeadsScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false, gestureEnabled: true }}
        >{/* No newline here */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainTabs" component={TabGroup} />
          <Stack.Screen name="AddUser" component={AddUserScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="EditUser" component={EditUserScreen} />
          <Stack.Screen name="AddEditLead" component={AddEditLeadScreen} />
          <Stack.Screen name="AddEditProject" component={AddEditProjectScreen} />
          <Stack.Screen name="AddEditService" component={AddEditServiceScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}