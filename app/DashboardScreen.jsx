import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../services/firebase';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [coachData, setCoachData] = useState({
    prenom: '',
    clubName: ''
  });

  useEffect(() => {
    loadCoachData();
  }, []);

  const loadCoachData = async () => {
    try {
      const prenom = await AsyncStorage.getItem('coachPrenom');
      const clubName = await AsyncStorage.getItem('clubName');
      
      setCoachData({
        prenom: prenom || 'Coach',
        clubName: clubName || 'Votre club'
      });
    } catch (error) {
      console.error('Error loading coach data:', error);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const result = await logout();
      if (result.success) {
        // Effacer les données locales
        await AsyncStorage.removeItem('coachId');
        await AsyncStorage.removeItem('coachEmail');
        await AsyncStorage.removeItem('firebaseUID');
        await AsyncStorage.removeItem('clubId');
        await AsyncStorage.removeItem('coachPrenom');
        await AsyncStorage.removeItem('clubName');
        
        navigation.replace('Login');
      } else {
        Alert.alert('Erreur', 'Impossible de se déconnecter');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Bonjour Coach 🔥</Text>
        <Text style={styles.clubName}>{coachData.clubName}</Text>
      </View>

      {/* Menu Buttons */}
      <View style={styles.menu}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => Alert.alert('Info', 'Mes boxeurs (à venir)')}
          disabled={loading}
        >
          <Text style={styles.menuButtonText}>📋 Mes boxeurs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => Alert.alert('Info', 'Mes combats (à venir)')}
          disabled={loading}
        >
          <Text style={styles.menuButtonText}>🥊 Mes combats</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => Alert.alert('Info', 'Paramètres (à venir)')}
          disabled={loading}
        >
          <Text style={styles.menuButtonText}>⚙️ Paramètres</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.logoutButton]}
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 8,
  },
  clubName: {
    fontSize: 18,
    color: '#666',
  },
  menu: {
    gap: 16,
  },
  menuButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a365d',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
    marginTop: 20,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});