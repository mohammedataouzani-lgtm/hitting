import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  TextInput, Platform, StatusBar, Dimensions, Animated, PanResponder,
  Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Alert, ActivityIndicator,
} from 'react-native';
import BottomTabBar from './components/BottomTabBar';
import { getAuth } from 'firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.70;
const SAFE_AREA_TOP = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

// ─────────────────────────────────────────────
// CARTE ÉVÉNEMENT
// ─────────────────────────────────────────────
function EventCard({ event, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{event.jour}</Text>
          <Text style={styles.dateMonth}>{event.mois}</Text>
        </View>
        <Text style={styles.calendarIcon}>📅</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{event.status || event.statut}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{event.titre}</Text>
        <Text style={styles.cardSub}>{event.dateText || event.dateFormatee}</Text>
        <Text style={styles.cardSub}>{event.salle || event.adresse}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.cardFooter}>
        <Text style={styles.clubName}>{event.club || ''}</Text>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{event.prix || 'Gratuit'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// BOTTOM SHEET DÉTAILS
// ─────────────────────────────────────────────
function EventDetailsBottomSheet({ visible, event, onClose }) {
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;

  const open = useCallback(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [translateY]);

  const close = useCallback(() => {
    Animated.timing(translateY, { toValue: BOTTOM_SHEET_MAX_HEIGHT, duration: 250, useNativeDriver: true }).start(() => onClose());
  }, [translateY, onClose]);

  React.useEffect(() => {
    if (visible && event) { translateY.setValue(BOTTOM_SHEET_MAX_HEIGHT); open(); }
  }, [visible, event, open, translateY]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => { if (g.dy > 120 || g.vy > 0.5) close(); else open(); },
  })).current;

  if (!visible || !event) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={bs.overlay} />
      </TouchableWithoutFeedback>
      <Animated.View style={[bs.sheet, { height: BOTTOM_SHEET_MAX_HEIGHT, transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <View style={bs.handleRow}><View style={bs.handle} /></View>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={bs.scrollContent}>
          {(event.affiche || event.photo) ? <Image source={{ uri: event.affiche || event.photo }} style={bs.posterImage} /> : null}
          <View style={bs.detailsContainer}>
            <View style={bs.headerRow}>
              <View style={bs.statusBadge}><Text style={bs.statusText}>{event.status || event.statut}</Text></View>
              <View style={bs.priceBadge}><Text style={bs.priceText}>{event.prix || 'Gratuit'}</Text></View>
            </View>
            <Text style={bs.title}>{event.titre}</Text>
            <View style={bs.infoRow}><Text style={bs.infoIcon}>📅</Text><Text style={bs.infoTxt}>{event.dateText || event.dateFormatee}</Text></View>
            <View style={bs.infoRow}><Text style={bs.infoIcon}>📍</Text><Text style={bs.infoTxt}>{event.salle || event.adresse}</Text></View>
            {event.club ? (
              <View style={bs.infoRow}>
                <Text style={bs.infoIcon}>🛡️</Text>
                <Text style={bs.infoTxt}>Organisé par: <Text style={{ fontWeight: '700' }}>{event.club}</Text></Text>
              </View>
            ) : null}
            {event.description ? (
              <>
                <Text style={bs.sectionTitle}>À propos de l'événement</Text>
                <Text style={bs.description}>{event.description}</Text>
              </>
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// FORMULAIRE AJOUT ÉVÉNEMENT
// ─────────────────────────────────────────────
function AddEventSheet({ visible, onClose, onAdd }) {
  const [titre, setTitre] = useState('');
  const [salle, setSalle] = useState('');
  const [prix, setPrix] = useState('');
  const [contact, setContact] = useState('');
  const [affiche, setAffiche] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateObject, setDateObject] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setAffiche(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!titre || !salle) return Alert.alert("Erreur", "Remplissez au moins le Titre et le Lieu.");
    setLoading(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(
        "https://europe-west9-hitting-23de9.cloudfunctions.net/addEvenement",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
          body: JSON.stringify({
            titre, dateHeure: dateObject.toISOString(), adresse: salle,
            prix: prix || null, contact: contact || "", photoUrl: affiche || null,
          }),
        }
      );
      if (!response.ok) { const txt = await response.text(); console.log('❌', response.status, txt); throw new Error("Erreur serveur"); }
      Alert.alert("✅ Événement créé", "L'événement a bien été ajouté dans Airtable.");
      const months = ['JAN','FEV','MAR','AVR','MAI','JUN','JUL','AOU','SEP','OCT','NOV','DEC'];
      onAdd({
        id: `e_${Date.now()}`,
        titre,
        dateText: dateObject.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        dateFormatee: dateObject.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        jour: String(dateObject.getDate()).padStart(2, '0'),
        mois: months[dateObject.getMonth()],
        salle, adresse: salle, club: '', prix: prix || 'Gratuit',
        status: 'A venir', statut: 'A venir',
        affiche: affiche || null, photo: affiche || null,
        description: '',
      });
      setTitre(''); setSalle(''); setPrix(''); setContact('');
      setAffiche(null); setDateObject(new Date());
      onClose();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de créer l'événement. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.formCancelTxt}>Annuler</Text></TouchableOpacity>
          <Text style={styles.formHeaderTitle}>Nouvel événement</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#007AFF" /> : <Text style={styles.formCreateTxt}>Créer</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
          <Text style={styles.fieldLabel}>Titre *</Text>
          <TextInput style={styles.input} placeholder="Ex: Coupe de Paris" placeholderTextColor="#A1A1A6" value={titre} onChangeText={setTitre} />
          <Text style={styles.fieldLabel}>Date et heure</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
            <Text style={{ color: '#1C1C1E', fontSize: 15 }}>
              {dateObject.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} à {dateObject.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker value={dateObject} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => { setShowPicker(false); if (d) setDateObject(d); }} />
          )}
          <Text style={styles.fieldLabel}>Lieu / Salle *</Text>
          <TextInput style={styles.input} placeholder="Ex: Gymnase Carpentier" placeholderTextColor="#A1A1A6" value={salle} onChangeText={setSalle} />
          <Text style={styles.fieldLabel}>Contact</Text>
          <TextInput style={styles.input} placeholder="Ex: 06 12 34 56 78" placeholderTextColor="#A1A1A6" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
          <Text style={styles.fieldLabel}>Prix (€)</Text>
          <TextInput style={styles.input} placeholder="Ex: 15 (ou laisser vide si gratuit)" placeholderTextColor="#A1A1A6" value={prix} onChangeText={setPrix} keyboardType="numeric" />
          <Text style={styles.fieldLabel}>Affiche</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Text style={{ color: '#555' }}>{affiche ? "✅ Image sélectionnée — changer" : "📷 Choisir une image"}</Text>
          </TouchableOpacity>
          {affiche && <Image source={{ uri: affiche }} style={styles.preview} />}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// SCREEN PRINCIPAL
// ─────────────────────────────────────────────
export default function EvenementsScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  useEffect(() => {
    if (route?.params?.openAddSheet) setAddSheetVisible(true);
    fetchEvenements();
  }, []);

  const fetchEvenements = async () => {
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(
        'https://europe-west9-hitting-23de9.cloudfunctions.net/getEvenements',
        { headers: { 'Authorization': `Bearer ${idToken}` } }
      );
      const data = await response.json();
      if (data.success) {
        const months = ['JAN','FEV','MAR','AVR','MAI','JUN','JUL','AOU','SEP','OCT','NOV','DEC'];
        const mapped = data.evenements.map(e => {
          let jour = '--', mois = '---';
          if (e.dateFormatee) {
            const d = new Date(e.dateFormatee);
            if (!isNaN(d)) {
              jour = String(d.getDate()).padStart(2, '0');
              mois = months[d.getMonth()];
            }
          }
          return { ...e, jour, mois, dateText: e.dateFormatee, salle: e.adresse };
        });
        setEvents(mapped);
      }
    } catch (error) {
      console.error('❌ Erreur fetchEvenements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((e) =>
    (e.titre || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.club || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.adresse || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.floatingBackBtn}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} stickyHeaderIndices={[1]}>
        <View style={styles.imageHeaderContainer}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800' }} style={styles.headerImage} />
          <View style={styles.overlay} />
        </View>

        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <TextInput style={styles.searchInput} placeholder="Rechercher un événement" placeholderTextColor="#8E8E93" value={search} onChangeText={setSearch} />
            <Text style={styles.searchIcon}>🔍</Text>
          </View>
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#E53935" />
            </View>
          ) : filteredEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun événement trouvé</Text>
            </View>
          ) : (
            filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} onPress={() => { setSelectedEvent(event); setSheetVisible(true); }} />
            ))
          )}
        </View>
      </ScrollView>

      <BottomTabBar activeTab={null} navigation={navigation} onPlusPress={() => setAddSheetVisible(true)} />

      <EventDetailsBottomSheet visible={sheetVisible} event={selectedEvent} onClose={() => { setSheetVisible(false); setSelectedEvent(null); }} />

      <AddEventSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onAdd={(newEvent) => setEvents(prev => [newEvent, ...prev])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  scrollContent: { paddingBottom: 100 },
  imageHeaderContainer: { height: 220, position: 'relative' },
  headerImage: { width: '100%', height: 220, resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, height: 220, backgroundColor: 'rgba(0,0,0,0.3)' },
  floatingBackBtn: { position: 'absolute', top: SAFE_AREA_TOP + 8, left: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  backArrow: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  searchBarWrapper: { width: '100%', backgroundColor: '#FAF9F6', paddingHorizontal: 20, paddingTop: SAFE_AREA_TOP + 8, paddingBottom: 16, marginTop: -(SAFE_AREA_TOP + 24), zIndex: 100 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5, borderWidth: 1.5, borderColor: '#42A5F5' },
  searchInput: { flex: 1, fontSize: 15, color: '#1C1C1E', height: '100%' },
  searchIcon: { fontSize: 16, color: '#8E8E93' },
  listContainer: { paddingHorizontal: 18, gap: 16 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 0.5, borderColor: '#E5E5EA', overflow: 'hidden' },
  cardHeader: { height: 64, backgroundColor: '#5C6BC0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  dateBadge: { width: 44, height: 44, backgroundColor: '#FFCA28', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dateDay: { fontSize: 15, fontWeight: '900', color: '#1A237E', lineHeight: 16 },
  dateMonth: { fontSize: 9, fontWeight: '800', color: '#1A237E', marginTop: 1 },
  calendarIcon: { fontSize: 24 },
  statusBadge: { backgroundColor: '#FFCA28', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800', color: '#1A237E' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginBottom: 6 },
  cardSub: { fontSize: 13, color: '#8E8E93', fontWeight: '500', marginTop: 2 },
  divider: { height: 0.5, backgroundColor: '#E5E5EA', marginHorizontal: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  clubName: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  priceBadge: { backgroundColor: '#FFCA28', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  priceText: { fontSize: 11, fontWeight: '800', color: '#1A237E' },
  formContainer: { flex: 1, backgroundColor: '#FAF9F6' },
  formHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
  formHeaderTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
  formCancelTxt: { fontSize: 16, color: '#FF3B30', fontWeight: '500' },
  formCreateTxt: { fontSize: 16, color: '#007AFF', fontWeight: '700' },
  formScroll: { padding: 18 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#3A3A3C', marginBottom: 8, marginTop: 8 },
  input: { height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: '#1C1C1E', marginBottom: 8, justifyContent: 'center' },
  imagePicker: { padding: 15, backgroundColor: '#EEE', borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  preview: { width: '100%', height: 160, borderRadius: 10, marginTop: 8, resizeMode: 'cover' },
});

const bs = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#F7F7F7', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 24 },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  posterImage: { width: '100%', height: 200, borderRadius: 16, resizeMode: 'cover', backgroundColor: '#E0E0E0', marginBottom: 16 },
  detailsContainer: { paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { backgroundColor: '#FFCA28', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#1A237E' },
  priceBadge: { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  priceText: { fontSize: 13, fontWeight: '800', color: '#EF6C00' },
  title: { fontSize: 22, fontWeight: '900', color: '#1C1C1E', marginBottom: 16, letterSpacing: -0.3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoIcon: { fontSize: 16, marginRight: 10, width: 20, textAlign: 'center' },
  infoTxt: { fontSize: 14, color: '#3A3A3C', fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginTop: 20, marginBottom: 8 },
  description: { fontSize: 14, color: '#8E8E93', lineHeight: 20, marginBottom: 20 },
});