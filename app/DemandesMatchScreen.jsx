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
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { getAuth } from 'firebase/auth';

const SAFE_AREA_TOP = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statutBadgeStyle(statut) {
  switch (statut) {
    case 'Accepté':
      return { bg: '#E8F5E9', color: '#2E7D32', label: '✅ Accepté' };
    case 'Refusé':
      return { bg: '#FFEBEE', color: '#C62828', label: '❌ Refusé' };
    default:
      return { bg: '#FFF8E1', color: '#F9A825', label: '🟡 En attente' };
  }
}

// ─────────────────────────────────────────────
// CARTE DEMANDE
// ─────────────────────────────────────────────
function DemandeCard({ demande, type, onAccept, onRefuse }) {
  const badge = statutBadgeStyle(demande.statut);
  const isRecue = type === 'recue';
  const isEnAttente = demande.statut === 'En attente';

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>
          {demande.prenomBoxeur} {demande.nomBoxeur}
          <Text style={s.cardVs}>  vs  </Text>
          {demande.prenomAdversaire} {demande.nomAdversaire}
        </Text>
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeTxt, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={s.cardInfoRow}>
        <Text style={s.cardInfoLabel}>📅 Date souhaitée</Text>
        <Text style={s.cardInfoValue}>{formatDate(demande.dateSouhaitee)}</Text>
      </View>

      <View style={s.cardInfoRow}>
        <Text style={s.cardInfoLabel}>🥊 Type</Text>
        <Text style={s.cardInfoValue}>{demande.typeCombat || '—'}</Text>
      </View>

      <View style={s.cardInfoRow}>
        <Text style={s.cardInfoLabel}>📍 Adresse</Text>
        <Text style={s.cardInfoValue} numberOfLines={1}>{demande.adresse || '—'}</Text>
      </View>

      <View style={s.cardInfoRow}>
        <Text style={s.cardInfoLabel}>🏟️ Club {isRecue ? 'demandeur' : 'adverse'}</Text>
        <Text style={s.cardInfoValue} numberOfLines={1}>
          {isRecue ? (demande.clubBoxeur || '—') : (demande.clubAdversaire || '—')}
        </Text>
      </View>

      {demande.message ? (
        <View style={s.messageBox}>
          <Text style={s.messageLabel}>💬 Message</Text>
          <Text style={s.messageTxt}>{demande.message}</Text>
        </View>
      ) : null}

      {demande.statut === 'Refusé' && demande.commentaireRefus ? (
        <View style={[s.messageBox, s.refusBox]}>
          <Text style={s.messageLabel}>💬 Commentaire du refus</Text>
          <Text style={s.messageTxt}>{demande.commentaireRefus}</Text>
        </View>
      ) : null}

      {isRecue && isEnAttente && (
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.refuseBtn} activeOpacity={0.85} onPress={() => onRefuse(demande)}>
            <Text style={s.refuseBtnTxt}>Refuser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acceptBtn} activeOpacity={0.85} onPress={() => onAccept(demande)}>
            <Text style={s.acceptBtnTxt}>Accepter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// MODAL REFUS (avec commentaire)
// ─────────────────────────────────────────────
function RefuseModal({ visible, onClose, onConfirm, loading }) {
  const [commentaire, setCommentaire] = useState('');

  const handleConfirm = () => {
    onConfirm(commentaire);
  };

  const handleClose = () => {
    setCommentaire('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>Refuser la demande</Text>
          <Text style={s.modalSubtitle}>Vous pouvez ajouter un commentaire pour expliquer votre décision (optionnel).</Text>

          <TextInput
            style={s.modalInput}
            placeholder="Ex : créneau indisponible, catégorie incompatible..."
            placeholderTextColor="#C7C7CC"
            value={commentaire}
            onChangeText={setCommentaire}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalCancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={s.modalCancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalConfirmBtn} onPress={handleConfirm} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.modalConfirmTxt}>Confirmer le refus</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// SCREEN PRINCIPAL
// ─────────────────────────────────────────────
export default function DemandesMatchScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('recues'); // 'recues' | 'envoyees'
  const [envoyees, setEnvoyees] = useState([]);
  const [recues, setRecues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [refuseModalVisible, setRefuseModalVisible] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDemandes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);

      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/getDemandesMatch',
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
        setEnvoyees(data.envoyees || []);
        setRecues(data.recues || []);
      }
    } catch (error) {
      console.error('❌ Erreur fetchDemandes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  const updateStatut = async (demande, statut, commentaireRefus = '') => {
    try {
      setActionLoading(true);
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/updateDemandeMatch',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            demandeId: demande.id,
            statut,
            commentaireRefus,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Mise à jour locale optimiste
        setRecues((prev) =>
          prev.map((d) => (d.id === demande.id ? { ...d, statut, commentaireRefus } : d))
        );
        if (statut === 'Refusé') {
          setRefuseModalVisible(false);
          setSelectedDemande(null);
        }
      } else {
        Alert.alert('Erreur', "L'action n'a pas pu être effectuée. Réessayez.");
      }
    } catch (error) {
      console.error('❌ Erreur updateStatut:', error);
      Alert.alert('Erreur', 'Une erreur est survenue. Vérifiez votre connexion.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = (demande) => {
    Alert.alert(
      'Accepter la demande',
      `Confirmer l'acceptation du combat ${demande.prenomBoxeur} ${demande.nomBoxeur} vs ${demande.prenomAdversaire} ${demande.nomAdversaire} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Accepter', onPress: () => updateStatut(demande, 'Accepté') },
      ]
    );
  };

  const handleRefuse = (demande) => {
    setSelectedDemande(demande);
    setRefuseModalVisible(true);
  };

  const confirmRefuse = (commentaire) => {
    if (selectedDemande) {
      updateStatut(selectedDemande, 'Refusé', commentaire);
    }
  };

  const currentList = activeTab === 'recues' ? recues : envoyees;
  const enAttenteCount = recues.filter((d) => d.statut === 'En attente').length;

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
        <Text style={s.title}>Demandes de combat</Text>
      </View>

      {/* Onglets */}
      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'recues' && s.tabBtnActive]}
          onPress={() => setActiveTab('recues')}
          activeOpacity={0.85}
        >
          <Text style={[s.tabBtnTxt, activeTab === 'recues' && s.tabBtnTxtActive]}>
            Reçues {enAttenteCount > 0 ? `(${enAttenteCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'envoyees' && s.tabBtnActive]}
          onPress={() => setActiveTab('envoyees')}
          activeOpacity={0.85}
        >
          <Text style={[s.tabBtnTxt, activeTab === 'envoyees' && s.tabBtnTxtActive]}>
            Envoyées
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={s.loadingTxt}>Chargement des demandes...</Text>
        </View>
      ) : currentList.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyTxt}>
            {activeTab === 'recues' ? 'Aucune demande reçue' : 'Aucune demande envoyée'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchDemandes(true)} tintColor="#E53935" />
          }
        >
          {currentList.map((demande) => (
            <DemandeCard
              key={demande.id}
              demande={demande}
              type={activeTab === 'recues' ? 'recue' : 'envoyee'}
              onAccept={handleAccept}
              onRefuse={handleRefuse}
            />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <RefuseModal
        visible={refuseModalVisible}
        onClose={() => setRefuseModalVisible(false)}
        onConfirm={confirmRefuse}
        loading={actionLoading}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EB' },

  // Header
  header: { paddingTop: SAFE_AREA_TOP + 8, paddingHorizontal: 20, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { fontSize: 20, color: '#111', fontWeight: '600' },
  backTxt: { fontSize: 16, color: '#111', fontWeight: '600' },

  titleRow: { paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: '#111' },

  // Onglets
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tabBtnActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  tabBtnTxt: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
  tabBtnTxtActive: { color: '#fff' },

  // Liste
  list: { paddingHorizontal: 16, gap: 12 },

  // Carte
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111', flex: 1, lineHeight: 20 },
  cardVs: { color: '#AAA', fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 11, fontWeight: '800' },

  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardInfoLabel: { fontSize: 12, color: '#999', fontWeight: '600' },
  cardInfoValue: { fontSize: 13, color: '#333', fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 12 },

  messageBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  refusBox: { backgroundColor: '#FFF5F5' },
  messageLabel: { fontSize: 11, fontWeight: '700', color: '#999', marginBottom: 4 },
  messageTxt: { fontSize: 13, color: '#333', lineHeight: 18 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  refuseBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  refuseBtnTxt: { fontSize: 14, fontWeight: '800', color: '#E53935' },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
  },
  acceptBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // États
  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingTxt: { color: '#888', fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: '#999', fontWeight: '600' },

  // Modal refus
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 18 },
  modalInput: {
    minHeight: 90,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelTxt: { fontSize: 14, fontWeight: '700', color: '#666' },
  modalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
