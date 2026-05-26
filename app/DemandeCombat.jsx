import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';

export default function DemandeCombatScreen({ navigation, route }) {
  const { boxer, adversaire } = route.params || {};

  if (!boxer || !adversaire) {
    return (
      <View style={styles.container}>
        <Text>Informations manquantes pour la demande</Text>
      </View>
    );
  }

  // Form states
  const [monClub, setMonClub] = useState('Boxing Paris 15');
  const [clubAdversaire, setClubAdversaire] = useState(adversaire.club || 'Ozoir Boxing');
  const [typeCombat, setTypeCombat] = useState('Gala'); // 'Gala' or 'Sparring'
  const [dateSouhaitee, setDateSouhaitee] = useState('');
  const [dateDemande] = useState('26/05/2026'); // Pre-filled with today's date
  const [adresse, setAdresse] = useState('89 rue du landy');
  const [message, setMessage] = useState('');

  const handleSendRequest = () => {
    Alert.alert(
      "Demande envoyée !",
      `Votre demande de combat entre ${boxer.nom} et ${adversaire.nom} a bien été transmise au coach adverse.`,
      [{ text: "Super", onPress: () => navigation.pop(2) }] // Go back to Boxer Profile
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
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
        {/* ── VS CARD COMPARISON ────────────────────────────────────── */}
        <View style={styles.vsCard}>
          {/* Left Boxer (My Boxer) */}
          <View style={styles.boxerProfile}>
            <Image source={{ uri: boxer.avatar }} style={styles.avatar} />
            <Text style={styles.boxerName} numberOfLines={2}>{boxer.nom}</Text>
            <View style={styles.statsMiniRow}>
              <View style={styles.statMiniItem}>
                <Text style={styles.statMiniVal}>{boxer.vic}</Text>
                <Text style={styles.statMiniLbl}>VIC.</Text>
              </View>
              <View style={styles.statMiniItem}>
                <Text style={styles.statMiniVal}>{boxer.def}</Text>
                <Text style={styles.statMiniLbl}>DEF.</Text>
              </View>
              <View style={styles.statMiniItem}>
                <Text style={styles.statMiniVal}>{boxer.nuls}</Text>
                <Text style={styles.statMiniLbl}>NULS</Text>
              </View>
            </View>
          </View>

          {/* VS Divider */}
          <View style={styles.vsBadgeContainer}>
            <View style={styles.vsCircle}>
              <Text style={styles.vsText}>VS</Text>
            </View>
          </View>

          {/* Right Boxer (Adversary) */}
          <View style={styles.boxerProfile}>
            <Image source={{ uri: adversaire.avatar }} style={styles.avatar} />
            <Text style={styles.boxerName} numberOfLines={2}>{adversaire.nom}</Text>
            <View style={styles.statsMiniRow}>
              <View style={styles.statMiniItem}>
                <Text style={styles.statMiniVal}>{adversaire.vic}</Text>
                <Text style={styles.statMiniLbl}>VIC.</Text>
              </View>
              <View style={styles.statMiniItem}>
                <Text style={styles.statMiniVal}>{adversaire.def}</Text>
                <Text style={styles.statMiniLbl}>DEF.</Text>
              </View>
              <View style={styles.statMiniItem}>
                <Text style={styles.statMiniVal}>{adversaire.nuls}</Text>
                <Text style={styles.statMiniLbl}>NULS</Text>
              </View>
              {adversaire.ko !== undefined && (
                <View style={styles.statMiniItem}>
                  <Text style={styles.statMiniVal}>{adversaire.ko}</Text>
                  <Text style={styles.statMiniLbl}>K.O</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── SECTION CLUBS ────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>CLUBS</Text>
        
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Mon club</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={monClub}
            editable={false}
            placeholder="Nom de votre club"
            placeholderTextColor="#A1A1A6"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Club adversaire</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={clubAdversaire}
            editable={false}
            placeholder="Nom du club adverse"
            placeholderTextColor="#A1A1A6"
          />
        </View>

        {/* ── SECTION DETAILS ──────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>DETAIL DU COMBAT</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Type de combat</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTypeCombat('Gala')}
              style={[
                styles.toggleBtn,
                typeCombat === 'Gala' && styles.toggleBtnActive
              ]}
            >
              <Text style={[
                styles.toggleBtnTxt,
                typeCombat === 'Gala' && styles.toggleBtnTxtActive
              ]}>
                Gala
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTypeCombat('Sparring')}
              style={[
                styles.toggleBtn,
                typeCombat === 'Sparring' && styles.toggleBtnActive
              ]}
            >
              <Text style={[
                styles.toggleBtnTxt,
                typeCombat === 'Sparring' && styles.toggleBtnTxtActive
              ]}>
                Sparring
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dates Row */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.fieldLabel}>Date souhaitée</Text>
            <View style={styles.inputWithIconContainer}>
              <TextInput
                style={[styles.input, { flex: 1, paddingRight: 35 }]}
                value={dateSouhaitee}
                onChangeText={setDateSouhaitee}
                placeholder="jj/mm/aaaa"
                placeholderTextColor="#C7C7CC"
              />
              <Text style={styles.calendarIcon}>📅</Text>
            </View>
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Date de demande</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={dateDemande}
              editable={false}
              placeholderTextColor="#A1A1A6"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Adresse du combat</Text>
          <TextInput
            style={styles.input}
            value={adresse}
            onChangeText={setAdresse}
            placeholder="Adresse de la salle"
            placeholderTextColor="#C7C7CC"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Ajouter un message pour le coach adverse"
            placeholderTextColor="#C7C7CC"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.sendBtn}
          onPress={handleSendRequest}
        >
          <Text style={styles.sendBtnTxt}>Envoyer la demande</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
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
  
  // VS Card Comparison
  vsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#E8E8E8',
    borderTopWidth: 5,
    borderTopColor: '#C2185B', // Pink-red top border as template
  },
  boxerProfile: {
    flex: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  boxerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    height: 38,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  statsMiniRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  statMiniItem: {
    alignItems: 'center',
    minWidth: 26,
  },
  statMiniVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#333',
  },
  statMiniLbl: {
    fontSize: 8,
    fontWeight: '700',
    color: '#999',
    marginTop: 1,
  },
  vsBadgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20, // offset names height alignment
  },
  vsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },

  // Sections
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8A8F',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A3A3C',
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1C1C1E',
  },
  disabledInput: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
    color: '#8E8E93',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  inputWithIconContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  calendarIcon: {
    position: 'absolute',
    right: 14,
    fontSize: 16,
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
  },
  toggleBtnActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#42A5F5',
  },
  toggleBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
  },
  toggleBtnTxtActive: {
    color: '#42A5F5',
  },

  // Send Button
  sendBtn: {
    backgroundColor: '#B71C1C',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#B71C1C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
