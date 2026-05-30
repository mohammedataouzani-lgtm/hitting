import React, { createContext, useState, useContext } from 'react';
const { login } = useAuth();
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);

  const login = async (token) => {
    await SecureStore.setItemAsync('userToken', token);
    setUserToken(token); // Ça va réveiller App.js instantanément !
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, setUserToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);