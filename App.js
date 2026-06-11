import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
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
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
