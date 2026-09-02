import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotifications } from '../../NotificationContext';

const ANDROID_NAV_BAR_HEIGHT = 34;

export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 64 + ANDROID_NAV_BAR_HEIGHT;

const TABS = [
  { key: 'dashboard', icon: '🏠', route: 'Dashboard' },
  { key: 'boxeurs',   icon: '👥', route: 'MesBoxeurs' },
  { key: 'plus',      icon: '+',  route: null },
  { key: 'profil',    icon: '👤', route: 'Profil' },
  { key: 'notifs',    icon: '🔔', route: 'Notifications' },
];

export default function BottomTabBar({ activeTab, navigation, onPlusPress }) {
  const { notifCount } = useNotifications();
  return (
    <View style={styles.tabBar}>
      <View style={styles.iconsRow}>
        {TABS.map((tab) => {
          if (tab.key === 'plus') {
            return (
              <TouchableOpacity
                key="plus"
                style={styles.tabPlusBtn}
                activeOpacity={0.85}
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
              onPress={() => tab.route && navigation?.navigate(tab.route)}
            >
              <View>
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                  {tab.icon}
                </Text>
                {/* ✅ Badge compteur sur la cloche */}
                {tab.key === 'notifs' && notifCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>
                      {notifCount > 99 ? '99+' : notifCount}
                    </Text>
                  </View>
                )}
              </View>
              {isActive && <View style={styles.tabActiveDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {Platform.OS === 'android' && (
        <View style={styles.androidSafeArea} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: Platform.OS === 'ios' ? 64 : 60,
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    flex: 1,
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
    marginBottom: Platform.OS === 'ios' ? 10 : 4,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    flex: 1,
    alignItems: 'center',
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
  androidSafeArea: {
    height: ANDROID_NAV_BAR_HEIGHT,
    backgroundColor: '#fff',
  },
  // ✅ Badge
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#E53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});