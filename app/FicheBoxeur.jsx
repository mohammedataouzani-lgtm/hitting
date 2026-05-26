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
import { LinearGradient } from 'expo-linear-gradient';

// ─── Données mock combats ────────────────────────────────────────────────────
const MOCK_COMBATS = [
  {
    id: '1',
    adversaire: 'Nassima Benali',
    date: '14 mar. 25',
    club: 'Boxing Paris 15',
    resultat: 'N',       // N = Nul, V = Victoire, D = Défaite
    detail: 'Par points',
    ville: 'Paris',
  },
  {
    id: '2',
    adversaire: 'Nora Girard',
    date: '02 jan. 25',
    club: 'ABC Marseille',
    resultat: 'V',
    detail: 'K.O 3e round',
    ville: 'Marseille',
  },
  {
    id: '3',
    adversaire: 'Maria Santos',
    date: '18 oct. 24',
    club: 'Boxing Lyon Nord',
    resultat: 'N',
    detail: 'Par points',
    ville: 'Lyon',
  },
  {
    id: '4',
    adversaire: 'Elise Duchamp',
    date: '05 sep. 24',
    club: 'Gym Bordeaux Sud',
    resultat: 'V',
    detail: 'Nul',
    ville: 'Bordeaux',
  },
  {
    id: '5',
    adversaire: 'Naima Ouzani',
    date: '26 aou. 24',
    club: 'Gym Bordeaux Sud',
    resultat: 'D',
    detail: 'Nul',
    ville: 'Bordeaux',
  },
];

// ─── Couleur du badge selon le résultat ──────────────────────────────────────
function getBadgeColor(resultat) {
  switch (resultat) {
    case 'V': return '#43A047'; // vert
    case 'D': return '#E53935'; // rouge
    case 'N': return '#FFC107'; // jaune/orange
    default:  return '#999';
  }
}

// ─── Composant ligne combat ──────────────────────────────────────────────────
function CombatRow({ combat }) {
  const badgeColor = getBadgeColor(combat.resultat);

  return (
    <View style={styles.combatRow}>
      {/* Badge résultat */}
      <View style={[styles.combatBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
        <Text style={[styles.combatBadgeTxt, { color: badgeColor }]}>{combat.resultat}</Text>
      </View>

      {/* Infos adversaire */}
      <View style={styles.combatInfo}>
        <Text style={styles.combatAdversaire}>{combat.adversaire}</Text>
        <Text style={styles.combatDetail}>
          {combat.club} · {combat.detail}, <Text style={styles.combatVille}>{combat.ville}</Text>
        </Text>
      </View>

      {/* Date */}
      <Text style={styles.combatDate}>{combat.date}</Text>
    </View>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function FicheBoxeurScreen({ navigation, route }) {
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fiche boxeur</Text>
        <TouchableOpacity style={styles.editHeaderBtn}>
          <Text style={styles.editHeaderIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── CARTE PROFIL ──────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <Image source={{ uri: boxer.avatar }} style={styles.profileAvatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{boxer.nom}</Text>
            <Text style={styles.profileMeta}>
              {boxer.categorie} · {boxer.poids} · {boxer.kg}
            </Text>
          </View>
        </View>

        {/* ── STATISTIQUES RAPIDES ───────────────────────────────────── */}
        <View style={styles.quickStats}>
          {[
            { label: 'VIC.', value: boxer.vic, color: '#43A047' },
            { label: 'DEF.', value: boxer.def, color: '#E53935' },
            { label: 'NULS', value: boxer.nuls, color: '#FFC107' },
            { label: 'K.O', value: boxer.ko, color: '#42A5F5' },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.quickStatItem}>
              <Text style={[styles.quickStatVal, { color }]}>{value}</Text>
              <Text style={styles.quickStatLbl}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── DERNIERS COMBATS ──────────────────────────────────────── */}
        <View style={styles.combatsSection}>
          <Text style={styles.combatsTitle}>Derniers combats</Text>

          {MOCK_COMBATS.map((combat) => (
            <CombatRow key={combat.id} combat={combat} />
          ))}
        </View>

        {/* ── BOUTON TROUVER UN ADVERSAIRE ──────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.findBtn}
          onPress={() => navigation.navigate('MatchingBoxeur', { boxer })}
        >
          <LinearGradient
            colors={['#EF5350', '#E53935']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.findGradient}
          >
            <Text style={styles.findTxt}>Trouver un adversaire</Text>
          </LinearGradient>
        </TouchableOpacity>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#FAF9F6',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#222',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.3,
  },
  editHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editHeaderIcon: {
    fontSize: 16,
  },

  scrollContent: {
    paddingHorizontal: 18,
  },

  // PROFIL CARD
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  profileMeta: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },

  // QUICK STATS
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatVal: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  quickStatLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#AAA',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // COMBATS SECTION
  combatsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  combatsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // COMBAT ROW
  combatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  combatBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  combatBadgeTxt: {
    fontSize: 13,
    fontWeight: '800',
  },
  combatInfo: {
    flex: 1,
  },
  combatAdversaire: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  combatDetail: {
    fontSize: 12,
    color: '#888',
    fontWeight: '400',
  },
  combatVille: {
    fontWeight: '700',
    color: '#555',
  },
  combatDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginLeft: 8,
  },

  // FIND BUTTON
  findBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  findGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
