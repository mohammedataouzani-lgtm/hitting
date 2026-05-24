import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './app/auth/login.jsx';
import RegisterScreen from './app/auth/register';
import DashboardScreen from './app/DashboardScreen';
import OffresScreen from './app/Paiement';
import MesBoxeursScreen from './app/MesBoxeurs'; 

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}