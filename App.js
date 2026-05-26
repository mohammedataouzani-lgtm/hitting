import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="MesBoxeurs" component={MesBoxeursScreen} />
        <Stack.Screen name="Offres" component={OffresScreen} />
        <Stack.Screen name="FicheBoxeur" component={FicheBoxeurScreen} />
        <Stack.Screen name="MatchingBoxeur" component={MatchingBoxeurScreen} />
        <Stack.Screen name="DemandeCombat" component={DemandeCombatScreen} />
        <Stack.Screen name="Evenements" component={EvenementsScreen} />
        <Stack.Screen name="Profil" component={ProfilScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}