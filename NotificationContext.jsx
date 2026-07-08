import React, { createContext, useContext, useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifCount, setNotifCount] = useState(0);

  const refreshNotifCount = useCallback(async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      const notifRes = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/getNotifications',
        { headers: { 'Authorization': `Bearer ${idToken}` } }
      );
      const notifData = await notifRes.json();

      if (notifData.success) {
        const lastSeen = notifData.notificationsLastSeenAt
          ? new Date(notifData.notificationsLastSeenAt)
          : null;

        const isNew = (item) => {
          if (!lastSeen) return true;
          if (!item.dateRaw) return false;
          return new Date(item.dateRaw) > lastSeen;
        };

        const count =
          (notifData.demandesEnAttente || []).filter(isNew).length +
          (notifData.boxeursEnAttente || []).filter(isNew).length +
          (notifData.boxeursRefuses || []).filter(isNew).length +
          (notifData.boxeursValides || []).filter(isNew).length;

        setNotifCount(count);
      }
    } catch (error) {
      console.error('❌ Erreur refreshNotifCount:', error);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifCount, refreshNotifCount, setNotifCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}