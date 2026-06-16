import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getAuth } from 'firebase/auth';

const SAFE_AREA_TOP = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

// ─────────────────────────────────────────────
// CARTE NOTIFICATION - DEMANDE
// ─────────────────────────────────────────────
function DemandeNotifCard({ demande, onPress }) {
  const isRecue = demande.type === 'recue';
  return (
    <TouchableOpacity style={s.notifCard} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.notifIconWrap, { backgroundColor: isRecue ? '#FFF8E1' : '#E3F2FD' }]}>
        <Text style={s.notifIcon}>{isRecue ? '🥊' : '📤'}</Text>
      </View>
      <View style={s.notifTextWrap}>
        <Text style={s.notifTitle}>
          {isRecue ? 'Demande reçue' : 'Demande envoyée'} <Text style={s.notifStatutTag}>· En attente</Text>
        </Text>
        <Text style={s.notifSubtitle} numberOfLines={1}>
          {demande.prenomBoxeur} {demande.nomBoxeur} <Text style={s.notifVs}>vs</Text> {demande.prenomAdversaire} {demande.nomAdversaire}
        </Text>
      </View>
      <Text style={s.notifChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// CARTE NOTIFICATION - BOXEUR VALIDÉ
// ─────────────────────────────────────────────
function BoxeurValideCard({ boxeur }) {
  return (
    <View style={s.notifCard}>
      <View style={[s.notifIconWrap, { backgroundColor: '#E8F5E9' }]}>
        <Text style={s.notifIcon}>✅</Text>
      </View>
      <View style={s.notifTextWrap}>
        <Text style={s.notifTitle}>Boxeur validé</Text>
        <Text style={s.notifSubtitle} numberOfLines={1}>
          {boxeur.prenom} {boxeur.nom} a été ajouté à votre effectif
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// SCREEN PRINCIPAL
// ─────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [demandes, setDemandes] = useState([]);
  const [boxeursValides, setBoxeursValides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);

      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/getNotifications',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setDemandes(data.demandesEnAttente || []);
        setBoxeursValides(data.boxeursValides || []);
      }
    } catch (error) {
      console.error('❌ Erreur fetchNotifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const isEmpty = demandes.length === 0 && boxeursValides.length === 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0EB" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
          <Text style={s.backTxt}>Retour</Text>
        </TouchableOpacity>
      </View>

      <View style={s.titleRow}>
        <Text style={s.title}>Notifications</Text>
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={s.loadingTxt}>Chargement...</Text>
        </View>
      ) : isEmpty ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyEmoji}>🔔</Text>
          <Text style={s.emptyTxt}>Aucune notification</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#E53935" />
          }
        >
          {demandes.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>DEMANDES ({demandes.length})</Text>
              {demandes.map((demande) => (
                <DemandeNotifCard
                  key={demande.id}
                  demande={demande}
                  onPress={() => navigation.navigate('DemandesMatch')}
                />
              ))}
            </View>
          )}

          {boxeursValides.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>BOXEURS VALIDÉS ({boxeursValides.length})</Text>
              {boxeursValides.map((boxeur) => (
                <BoxeurValideCard key={boxeur.id} boxeur={boxeur} />
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EB' },

  header: { paddingTop: SAFE_AREA_TOP + 8, paddingHorizontal: 20, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { fontSize: 20, color: '#111', fontWeight: '600' },
  backTxt: { fontSize: 16, color: '#111', fontWeight: '600' },

  titleRow: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#111' },

  scrollContent: { paddingHorizontal: 16 },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9E9E9E',
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  notifIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifIcon: { fontSize: 20 },
  notifTextWrap: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '800', color: '#111', marginBottom: 2 },
  notifStatutTag: { fontSize: 12, fontWeight: '600', color: '#F9A825' },
  notifSubtitle: { fontSize: 13, color: '#888', fontWeight: '500' },
  notifVs: { color: '#bbb', fontWeight: '600' },
  notifChevron: { fontSize: 24, color: '#C7C7CC', fontWeight: '300', marginLeft: 8 },

  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingTxt: { color: '#888', fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: '#999', fontWeight: '600' },
});