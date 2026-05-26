import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
} from 'react-native';

// ─── Données mock adversaires potentiels ─────────────────────────────────────
const MOCK_ADVERSAIRES = [
  {
    id: 'a1',
    nom: 'Lucas Voisin',
    categorie: 'Seniors H',
    poids: 'Super-welter',
    kg: '75 kg',
    club: 'Club Boxing Paris 15',
    vic: 19, def: 4, nuls: 2, ko: 10,
    match: 95,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: 'a2',
    nom: 'Karim Benslimane',
    categorie: 'Seniors H',
    poids: 'Super-welter',
    kg: '74 kg',
    club: 'Ring Olympique Marseille',
    vic: 15, def: 6, nuls: 1, ko: 8,
    match: 88,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: 'a3',
    nom: 'Thomas Dubois',
    categorie: 'Seniors H',
    poids: 'Super-welter',
    kg: '76 kg',
    club: 'Boxing Lyon Nord',
    vic: 12, def: 8, nuls: 3, ko: 5,
    match: 78,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: 'a4',
    nom: 'Maxime Leroy',
    categorie: 'Seniors H',
    poids: 'Super-welter',
    kg: '75 kg',
    club: 'BC Toulouse',
    vic: 10, def: 11, nuls: 0, ko: 4,
    match: 65,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  },
];

// ─── Carte adversaire ────────────────────────────────────────────────────────
function AdversaireCard({ adversaire, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.advCard}>
      <View style={styles.advCardLeft}>
        <Image source={{ uri: adversaire.avatar }} style={styles.advAvatar} />

        <View style={styles.advInfo}>
          <Text style={styles.advName}>{adversaire.nom}</Text>
          <Text style={styles.advMeta}>
            {adversaire.categorie} · {adversaire.poids} · {adversaire.kg}
          </Text>
          <Text style={styles.advClub}>{adversaire.club}</Text>

          <View style={styles.advStatsRow}>
            {[
              { label: 'VIC.', value: adversaire.vic },
              { label: 'DEF.', value: adversaire.def },
              { label: 'NULS', value: adversaire.nuls },
              { label: 'K.O', value: adversaire.ko },
            ].map(({ label, value }) => (
              <View key={label} style={styles.advStatItem}>
                <Text style={styles.advStatVal}>{value}</Text>
                <Text style={styles.advStatLbl}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Séparateur + Match % */}
      <View style={styles.advMatchWrap}>
        <View style={styles.advSeparator} />
        <View style={styles.advMatchContent}>
          <Text style={styles.advMatchPct}>{adversaire.match} %</Text>
          <Text style={styles.advMatchLabel}>MATCH</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function MatchingBoxeurScreen({ navigation, route }) {
  const boxer = route.params?.boxer;

  if (!boxer) {
    return (
      <View style={styles.container}>
        <Text>Aucun boxeur sélectionné</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backRow}
        >
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backTxt}>Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── MON BOXEUR (résumé compact) ───────────────────────────── */}
        <View style={styles.myBoxerCard}>
          <Image source={{ uri: boxer.avatar }} style={styles.myAvatar} />
          <View style={styles.myInfo}>
            <Text style={styles.myName}>{boxer.nom}</Text>
            <Text style={styles.myMeta}>
              {boxer.categorie} · {boxer.poids} · {boxer.kg}
            </Text>
            <View style={styles.myStatsRow}>
              {[
                { label: 'VIC.', value: boxer.vic },
                { label: 'DEF.', value: boxer.def },
                { label: 'NULS', value: boxer.nuls },
              ].map(({ label, value }) => (
                <View key={label} style={styles.myStatItem}>
                  <Text style={styles.myStatVal}>{value}</Text>
                  <Text style={styles.myStatLbl}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── TITRE SECTION ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Adversaires potentiels</Text>
          <Text style={styles.sectionCount}>
            {MOCK_ADVERSAIRES.length} résultats
          </Text>
        </View>

        {/* ── LISTE ADVERSAIRES ─────────────────────────────────────── */}
        {MOCK_ADVERSAIRES.map((adv) => (
          <AdversaireCard
            key={adv.id}
            adversaire={adv}
            onPress={() => navigation.navigate('DemandeCombat', { boxer, adversaire: adv })}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },

  // HEADER
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16,
    paddingHorizontal: 18,
    paddingBottom: 10,
    backgroundColor: '#FAF9F6',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backArrow: {
    fontSize: 22,
    color: '#222',
    fontWeight: '600',
  },
  backTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },

  scrollContent: {
    paddingHorizontal: 18,
  },

  // MON BOXEUR
  myBoxerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  myAvatar: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    marginRight: 14,
  },
  myInfo: {
    flex: 1,
  },
  myName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  myMeta: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    marginBottom: 8,
  },
  myStatsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  myStatItem: {
    alignItems: 'center',
  },
  myStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111',
    lineHeight: 22,
  },
  myStatLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: '#AAA',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.4,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },

  // ADVERSAIRE CARD
  advCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  advCardLeft: {
    flex: 1,
    flexDirection: 'row',
  },
  advAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  advInfo: {
    flex: 1,
  },
  advName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    marginBottom: 2,
  },
  advMeta: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    marginBottom: 1,
  },
  advClub: {
    fontSize: 11,
    color: '#42A5F5',
    fontWeight: '600',
    marginBottom: 8,
  },
  advStatsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  advStatItem: {
    alignItems: 'center',
  },
  advStatVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111',
    lineHeight: 18,
  },
  advStatLbl: {
    fontSize: 8,
    fontWeight: '600',
    color: '#AAA',
    letterSpacing: 0.4,
    marginTop: 1,
  },

  // MATCH %
  advMatchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  advSeparator: {
    width: 1,
    height: '80%',
    backgroundColor: '#E8E8E8',
    marginRight: 12,
  },
  advMatchContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  advMatchPct: {
    fontSize: 20,
    fontWeight: '900',
    color: '#42A5F5',
    lineHeight: 24,
  },
  advMatchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#42A5F5',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
