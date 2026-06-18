import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../AuthContext'; // ⚠️ adapte le chemin/nom selon ton AuthContext

const API_URL = 'https://europe-west9-hitting-23de9.cloudfunctions.net/getHistoriqueCombats';

const RESULTAT_STYLES = {
  Victoire: { backgroundColor: '#DFF5E1', color: '#1E7A34', label: 'Victoire' },
  'Défaite': { backgroundColor: '#FBE0E0', color: '#B3261E', label: 'Défaite' },
  'Match nul': { backgroundColor: '#EFEFEF', color: '#555555', label: 'Match nul' },
};

function CombatCard({ combat }) {
  const badge = RESULTAT_STYLES[combat.resultat] || RESULTAT_STYLES['Match nul'];

  const dateFormatee = combat.date
    ? new Date(combat.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.titre} numberOfLines={1}>{combat.titre}</Text>
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={styles.date}>{dateFormatee}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.score}>{combat.monScore} - {combat.scoreAdverse}</Text>
        {combat.typeCombat ? <Text style={styles.tag}>{combat.typeCombat}</Text> : null}
        {combat.typeVictoire ? <Text style={styles.tag}>{combat.typeVictoire}</Text> : null}
      </View>
    </View>
  );
}

export default function HistoriqueCombatsScreen({ navigation }) {
  const { user } = useAuth();
  const [combats, setCombats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistorique = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setCombats(data.combats);
      }
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistorique();
  }, [fetchHistorique]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistorique();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backTxt}>Retour</Text>
          </TouchableOpacity>
        </View>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#C9A227" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backTxt}>Retour</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.header}>Historique des combats</Text>

      <FlatList
        data={combats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CombatCard combat={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun combat enregistré pour l'instant.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E6' }, // beige, à ajuster selon ta charte
  headerRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { fontSize: 20, color: '#222', fontWeight: '600' },
  backTxt: { fontSize: 16, color: '#222', fontWeight: '600' },
  header: { fontSize: 22, fontWeight: '700', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, color: '#222' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titre: { fontSize: 16, fontWeight: '600', color: '#222', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 13, color: '#777', marginTop: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  score: { fontSize: 15, fontWeight: '700', color: '#222' },
  tag: { fontSize: 12, color: '#555', backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});