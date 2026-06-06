import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from './context/AuthContext'; // ← Import du nouveau contexte

// Import de tes écrans
import LoginScreen from './app/auth/login.jsx';
import RegisterScreen from './app/auth/register';
import DashboardScreen from './app/DashboardScreen';
import OffresScreen from './app/Paiement';
import MesBoxeursScreen from './app/MesBoxeurs'; 
import FicheBoxeurScreen from './app/FicheBoxeur';
import MatchingBoxeurScreen from './app/MatchingBoxeur';
import DemandeCombatScreen from './app/DemandeCombat';
import EvenementsScreen from './app/Evenements';
import ProfilScreen from './app/ProfilScreen';

const Stack = createNativeStackNavigator();

function NavigationLayout() {
  const { userToken, loadingAuth } = useAuth();

  if (loadingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="MesBoxeurs" component={MesBoxeursScreen} />
            <Stack.Screen name="Offres" component={OffresScreen} />
            <Stack.Screen name="FicheBoxeur" component={FicheBoxeurScreen} />
            <Stack.Screen name="MatchingBoxeur" component={MatchingBoxeurScreen} />
            <Stack.Screen name="DemandeCombat" component={DemandeCombatScreen} />
            <Stack.Screen name="Evenements" component={EvenementsScreen} />
            <Stack.Screen name="Profil" component={ProfilScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationLayout />
    </AuthProvider>
  );
}