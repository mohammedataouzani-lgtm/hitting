import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './AuthContext';
import LoginScreen from './app/auth/login.jsx';
import RegisterScreen from './app/auth/register';
import DashboardScreen from './app/DashboardScreen';
import MesBoxeursScreen from './app/MesBoxeurs';
import ProfilScreen from './app/ProfilScreen';
import PaiementScreen from './app/Paiement';
import FicheBoxeurScreen from './app/FicheBoxeur';
import EvenementsScreen from './app/Evenements';
import SplashScreen from './app/SplashScreen';
import AdversairesPotentielsScreen from './app/AdversairesPotentiels';
import DemandeCombatScreen from './app/DemandeCombat';
import DemandesMatchScreen from './app/DemandesMatchScreen';
import NotificationsScreen from './app/NotificationsScreen';
import HistoriqueCombatsScreen from './app/HistoriqueCombatsScreen';
import { NotificationProvider } from './NotificationContext';
import OnboardingScreen from './app/OnboardingScreen';

import PolitiqueConfidentialiteScreen from './app/PolitiqueConfidentialiteScreen.jsx';
import MentionsLegalesScreen from './app/MentionsLegalesScreen.jsx';
import CGUScreen from './app/CGUScreen.jsx';

import BottomTabBar from './app/components/BottomTabBar';
import ActionSheet from './app/components/ActionSheet';

const Stack = createNativeStackNavigator();

const TAB_BAR_ROUTES = {
  Dashboard: 'dashboard',
  MesBoxeurs: 'boxeurs',
  Profil: 'profil',
  Notifications: 'notifs',
};

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const [currentRoute, setCurrentRoute] = useState('Splash');
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const updateCurrentRoute = useCallback(() => {
    const routeName = navigationRef.current?.getCurrentRoute()?.name;
    if (routeName) setCurrentRoute(routeName);
  }, [navigationRef]);

  const activeTab = TAB_BAR_ROUTES[currentRoute] ?? null;
  const showTabBar = activeTab !== null;

  const tabBarNavigation = {
    navigate: (name, params) => navigationRef.current?.navigate(name, params),
  };

  const handleAddBoxeur = () => {
    setActionSheetVisible(false);
    setTimeout(() => tabBarNavigation.navigate('MesBoxeurs', { openAddSheet: true }), 300);
  };

  const handleAddEvenement = () => {
    setActionSheetVisible(false);
    setTimeout(() => tabBarNavigation.navigate('Evenements', { openAddSheet: true }), 300);
  };

  return (
    <AuthProvider>
      <NotificationProvider>
        <View style={styles.root}>
          <NavigationContainer
            ref={navigationRef}
            onReady={updateCurrentRoute}
            onStateChange={updateCurrentRoute}
          >
            <Stack.Navigator
              initialRouteName="Splash"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="MesBoxeurs" component={MesBoxeursScreen} />
              <Stack.Screen name="Profil" component={ProfilScreen} />
              <Stack.Screen name="Offres" component={PaiementScreen} />
              <Stack.Screen name="FicheBoxeur" component={FicheBoxeurScreen} />
              <Stack.Screen name="Evenements" component={EvenementsScreen} />
              <Stack.Screen name="AdversairesPotentiels" component={AdversairesPotentielsScreen} />
              <Stack.Screen name="DemandeCombat" component={DemandeCombatScreen} />
              <Stack.Screen name="DemandesMatch" component={DemandesMatchScreen} />
              <Stack.Screen name="HistoriqueCombats" component={HistoriqueCombatsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="PolitiqueConfidentialite" component={PolitiqueConfidentialiteScreen} />
              <Stack.Screen name="MentionsLegales" component={MentionsLegalesScreen} />
              <Stack.Screen name="CGU" component={CGUScreen} />
            </Stack.Navigator>
          </NavigationContainer>

          {showTabBar && (
            <View style={styles.tabBarWrapper} pointerEvents="box-none">
              <BottomTabBar
                activeTab={activeTab}
                navigation={tabBarNavigation}
                onPlusPress={() => setActionSheetVisible(true)}
              />
            </View>
          )}

          <ActionSheet
            visible={actionSheetVisible}
            onClose={() => setActionSheetVisible(false)}
            onAddBoxeur={handleAddBoxeur}
            onAddEvenement={handleAddEvenement}
          />
        </View>
      </NotificationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});