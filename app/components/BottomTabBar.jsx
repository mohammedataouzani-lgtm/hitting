import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * BottomTabBar — Barre de navigation réutilisable (Version React Navigation)
 */
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 88;

// On remet les noms de routes classiques (sans le slash "/")
const TABS = [
  { key: 'dashboard', icon: '🏠', route: 'Dashboard' }, 
  { key: 'boxeurs',   icon: '👥', route: 'MesBoxeurs' }, // Doit correspondre EXACTEMENT au 'name' dans ton App.js
  { key: 'plus',      icon: '+',  route: null },
  { key: 'profil',    icon: '👤', route: 'Profil' },
  { key: 'notifs',    icon: '🔔', route: null },
];

export default function BottomTabBar({ activeTab, navigation, onPlusPress }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        if (tab.key === 'plus') {
          return (
            <TouchableOpacity
              key="plus"
              style={styles.tabPlusBtn}
              activeOpacity={0.85}
              // Utilisation de la prop navigation classique transmise par le parent
              onPress={onPlusPress ?? (() => navigation?.navigate('MesBoxeurs'))}
            >
              <LinearGradient
                colors={['#EF5350', '#E53935']}
                style={styles.tabPlusGradient}
              >
                <Text style={styles.tabPlusIcon}>+</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            // Utilisation de la prop navigation classique
            onPress={() => tab.route && navigation?.navigate(tab.route)}
          >
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
              {tab.icon}
            </Text>
            {isActive && <View style={styles.tabActiveDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: TAB_BAR_HEIGHT,
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E53935',
    marginTop: 3,
  },
  tabPlusBtn: {
    marginBottom: Platform.OS === 'ios' ? 10 : 0,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tabPlusGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPlusIcon: {
    fontSize: 30,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 32,
    marginTop: -1,
  },
});