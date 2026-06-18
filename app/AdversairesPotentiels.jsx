import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, StatusBar, Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { AdversaireSheet } from './DemandeScreen';

const { width } = Dimensions.get('window');
const SAFE_AREA_TOP = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

// ─────────────────────────────────────────────
// CARTE ADVERSAIRE
// ─────────────────────────────────────────────
function AdversaireCard({ match, onPress }) {
  const palmares = match.palmares || {};
  const vic = palmares.vic ?? palmares.victoires ?? '—';
  const def = palmares.def ?? palmares.defaites ?? '—';
  const nuls = palmares.nuls ?? '—';
  const ko = palmares.ko ?? '—';

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={onPress}>
      <Image
        source={{ uri: match.adversairePhoto || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' }}
        style={s.cardAvatar}
      />
      <View style={s.cardInfo}>
        <Text style={s.cardName}>{match.adversaireNom}</Text>
        <Text style={s.cardMeta}>{match.categoriePoids}</Text>
        <Text style={s.cardClub}>{match.adversaireClub}</Text>
        <View style={s.statsRow}>
          {[{ label: 'VIC.', value: vic }, { label: 'DÉF.', value: def }, { label: 'NULS', value: nuls }, { label: 'K.O', value: ko }].map(({ label, value }) => (
            <View key={label} style={s.statItem}>
              <Text style={s.statVal}>{value}</Text>
              <Text style={s.statLbl}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={s.matchScore}>
        <Text style={s.matchPct}>95 %</Text>
        <Text style={s.matchLbl}>MATCH</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// SCREEN PRINCIPAL
// ─────────────────────────────────────────────
export default function AdversairesPotentielsScreen({ navigation, route }) {
  const { boxer } = route.params;
  const [matchs, setMatchs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
 

  useEffect(() => {
    fetchMatchs();
  }, []);

  const fetchMatchs = async () => {
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
console.log('📤 Envoi de la requête avec boxeurId:', boxer.id);
      const response = await fetch(
        `https://europe-west9-hitting-23de9.cloudfunctions.net/getMatchsPossibles?boxeurId=${boxer.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.success) setMatchs(data.matchs);
    } catch (error) {
      console.error('❌ Erreur fetchMatchs:', error);
    } finally {
      setLoading(false);
    }
  };

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Carte boxeur en haut */}
        <View style={s.boxerCard}>
          <Image
            source={{ uri: boxer.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' }}
            style={s.boxerAvatar}
          />
          <View style={s.boxerInfo}>
            <Text style={s.boxerName}>{boxer.nom}</Text>
            <Text style={s.boxerMeta}>{boxer.categorie} · {boxer.poids} · {boxer.kg}</Text>
            <View style={s.statsRow}>
              {[{ label: 'VIC.', value: boxer.vic }, { label: 'DÉF.', value: boxer.def }, { label: 'NULS', value: boxer.nuls }].map(({ label, value }) => (
                <View key={label} style={s.statItem}>
                  <Text style={s.statVal}>{value}</Text>
                  <Text style={s.statLbl}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Titre + compteur */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Adversaires potentiels</Text>
          {!loading && <Text style={s.sectionCount}>{matchs.length} résultat{matchs.length > 1 ? 's' : ''}</Text>}
        </View>

        {/* Liste */}
        {loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color="#E53935" />
            <Text style={s.loadingTxt}>Recherche en cours...</Text>
          </View>
        ) : matchs.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyEmoji}>🥊</Text>
            <Text style={s.emptyTxt}>Aucun adversaire trouvé</Text>
          </View>
        ) : (
          <View style={s.list}>
            {matchs.map((match) => (
              <AdversaireCard key={match.id} match={match} onPress={() => { setSelectedMatch(match); setSheetVisible(true); }} />
            ))}
          </View>
        )}
      </ScrollView>
      <AdversaireSheet
        visible={sheetVisible}
        match={selectedMatch}
        boxer={boxer}
        onClose={() => setSheetVisible(false)}
        onDemandePress={(match) => { 
  setSheetVisible(false);
  navigation.navigate('DemandeCombat', { boxer, adversaire: match }); 
}}
      />
     
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EB' },

  // Header
  header: { paddingTop: SAFE_AREA_TOP + 8, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { fontSize: 20, color: '#111', fontWeight: '600' },
  backTxt: { fontSize: 16, color: '#111', fontWeight: '600' },

  // Carte boxeur
  boxerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 14, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  boxerAvatar: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#E0E0E0', marginRight: 14, resizeMode: 'cover' },
  boxerInfo: { flex: 1 },
  boxerName: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 3 },
  boxerMeta: { fontSize: 12, color: '#888', marginBottom: 10 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#111' },
  sectionCount: { fontSize: 14, color: '#888', fontWeight: '600' },

  // Liste
  list: { paddingHorizontal: 16, gap: 12 },

  // Carte adversaire
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardAvatar: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#E0E0E0', marginRight: 12, resizeMode: 'cover' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 2 },
  cardMeta: { fontSize: 11, color: '#888', marginBottom: 2 },
  cardClub: { fontSize: 11, color: '#888', marginBottom: 8 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 14 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '900', color: '#111', lineHeight: 18 },
  statLbl: { fontSize: 9, fontWeight: '600', color: '#AAA', letterSpacing: 0.5 },

  // Score match
  matchScore: { alignItems: 'center', paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#F0F0F0', marginLeft: 8 },
  matchPct: { fontSize: 20, fontWeight: '900', color: '#2196F3' },
  matchLbl: { fontSize: 9, fontWeight: '700', color: '#2196F3', letterSpacing: 1 },

  // États
  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingTxt: { color: '#888', fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: '#999', fontWeight: '600' },
});