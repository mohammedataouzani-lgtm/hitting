import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  PanResponder,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import BottomTabBar from './components/BottomTabBar';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.70;

// ─── Données mock initiales ──────────────────────────────────────────────────
const INITIAL_EVENTS = [
  {
    id: 'e1',
    titre: 'Gala de boxe Paris Nord',
    dateText: '15 fév 2026 - 20h00',
    jour: '15',
    mois: 'FEV',
    salle: 'Salle Carpentier, Paris 13e',
    club: 'Club Boxing Paris 19',
    prix: 'A partir de 15€',
    status: 'A venir',
    affiche: 'https://images.unsplash.com/photo-1599058918144-1f488e559901?w=800', // Gants blancs et casque
    description: 'Une soirée exceptionnelle réunissant les meilleurs espoirs régionaux. 8 combats amateurs et 2 combats professionnels au programme. Restauration sur place.',
  },
  {
    id: 'e2',
    titre: 'Championnat Île-de-France',
    dateText: '28 fév 2026 - 18h00',
    jour: '28',
    mois: 'FEV',
    salle: 'Halle Carpentier, Paris 13e',
    club: 'Ring Olympique Audonien',
    prix: '15 €',
    status: 'A venir',
    affiche: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800',
    description: 'Les phases finales du championnat régional d\'Île-de-France. Venez encourager les athlètes pour leur qualification aux championnats de France.',
  },
  {
    id: 'e3',
    titre: 'Tournoi Sparring Interclubs',
    dateText: '12 mar 2026 - 14h00',
    jour: '12',
    mois: 'MAR',
    salle: 'Gymnase Joliot Curie, Saint-Denis',
    club: 'Red Star Boxing Club',
    prix: 'Gratuit',
    status: 'A venir',
    affiche: 'https://images.unsplash.com/photo-1517438476312-10d79c07750d?w=800',
    description: 'Une après-midi de sparring amical ouverte à tous les clubs affiliés. Idéal pour mettre en pratique le travail technique dans une ambiance constructive.',
  },
];

// ─── Utils ───────────────────────────────────────────────────────────────────
function getMonthAbbreviation(monthStr) {
  const months = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'AVR', '05': 'MAI', '06': 'JUN',
    '07': 'JUL', '08': 'AOU', '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC'
  };
  // Si c'est déjà du texte abrégé
  if (isNaN(monthStr)) return monthStr.substring(0, 3).toUpperCase();
  return months[monthStr] || 'EVT';
}

// ─── Composant Carte Evénement ───────────────────────────────────────────────
function EventCard({ event, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {/* En-tête bleu/violet de la carte */}
      <View style={styles.cardHeader}>
        {/* Badge Date Jaune */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{event.jour}</Text>
          <Text style={styles.dateMonth}>{event.mois}</Text>
        </View>

        {/* Icône calendrier au centre */}
        <Text style={styles.calendarIcon}>📅</Text>

        {/* Statut "A venir" */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{event.status}</Text>
        </View>
      </View>

      {/* Contenu de la carte */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{event.titre}</Text>
        <Text style={styles.cardSub}>{event.dateText}</Text>
        <Text style={styles.cardSub}>{event.salle}</Text>
      </View>

      {/* Séparateur */}
      <View style={styles.divider} />

      {/* Pied de la carte */}
      <View style={styles.cardFooter}>
        <Text style={styles.clubName}>{event.club}</Text>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{event.prix}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Composant Bottom Sheet Détails Evénement ────────────────────────────────
function EventDetailsBottomSheet({ visible, event, onClose }) {
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;

  const open = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [translateY]);

  const close = useCallback(() => {
    Animated.timing(translateY, {
      toValue: BOTTOM_SHEET_MAX_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [translateY, onClose]);

  React.useEffect(() => {
    if (visible && event) {
      translateY.setValue(BOTTOM_SHEET_MAX_HEIGHT);
      open();
    }
  }, [visible, event, open, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.5) close();
        else open();
      },
    })
  ).current;

  if (!visible || !event) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={bs.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          bs.sheet,
          { height: BOTTOM_SHEET_MAX_HEIGHT, transform: [{ translateY }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle */}
        <View style={bs.handleRow}>
          <View style={bs.handle} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={{ flex: 1 }}
          contentContainerStyle={bs.scrollContent}
        >
          {/* Affiche de l'événement */}
          <Image source={{ uri: event.affiche }} style={bs.posterImage} />

          {/* Détails de l'événement */}
          <View style={bs.detailsContainer}>
            <View style={bs.headerRow}>
              <View style={bs.statusBadge}>
                <Text style={bs.statusText}>{event.status}</Text>
              </View>
              <View style={bs.priceBadge}>
                <Text style={bs.priceText}>{event.prix}</Text>
              </View>
            </View>

            <Text style={bs.title}>{event.titre}</Text>

            <View style={bs.infoRow}>
              <Text style={bs.infoIcon}>📅</Text>
              <Text style={bs.infoTxt}>{event.dateText}</Text>
            </View>

            <View style={bs.infoRow}>
              <Text style={bs.infoIcon}>📍</Text>
              <Text style={bs.infoTxt}>{event.salle}</Text>
            </View>

            <View style={bs.infoRow}>
              <Text style={bs.infoIcon}>🛡️</Text>
              <Text style={bs.infoTxt}>Organisé par: <Text style={{fontWeight: '700'}}>{event.club}</Text></Text>
            </View>

            <Text style={bs.sectionTitle}>À propos de l'événement</Text>
            <Text style={bs.description}>{event.description}</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Modèles d'affiches prédéfinis ───────────────────────────────────────────
const PRESET_IMAGES = [
  { id: 'p1', label: 'Gala', url: 'https://images.unsplash.com/photo-1599058918144-1f488e559901?w=800' },
  { id: 'p2', label: 'Combat', url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800' },
  { id: 'p3', label: 'Sparring', url: 'https://images.unsplash.com/photo-1517438476312-10d79c07750d?w=800' },
  { id: 'p4', label: 'Entraînement', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800' },
];

// ─── Composant Modal Ajout d'Evénement ───────────────────────────────────────
function AddEventSheet({ visible, onClose, onAdd }) {
  const [titre, setTitre] = useState('');
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [salle, setSalle] = useState('');
  const [club, setClub] = useState('Boxing Paris 19');
  const [prix, setPrix] = useState('');
  const [description, setDescription] = useState('');
  const [affiche, setAffiche] = useState(PRESET_IMAGES[0].url);

  const handleSubmit = () => {
    if (!titre || !date || !salle) {
      alert("Veuillez remplir au moins le titre, la date et la salle.");
      return;
    }
    onAdd({ titre, date, heure, salle, club, prix, description, affiche });
    // Reset form
    setTitre('');
    setDate('');
    setHeure('');
    setSalle('');
    setClub('Boxing Paris 19');
    setPrix('');
    setDescription('');
    setAffiche(PRESET_IMAGES[0].url);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
        {/* Header form */}
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.formCancelTxt}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.formHeaderTitle}>Nouvel événement</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.formCreateTxt}>Créer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Titre de l'événement</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Coupe de Paris"
              placeholderTextColor="#A1A1A6"
              value={titre}
              onChangeText={setTitre}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.fieldLabel}>Date (jj/mm/aaaa)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 18/06/2026"
                placeholderTextColor="#A1A1A6"
                value={date}
                onChangeText={setDate}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Heure</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 19h30"
                placeholderTextColor="#A1A1A6"
                value={heure}
                onChangeText={setHeure}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Salle / Lieu</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Gymnase Carpentier"
              placeholderTextColor="#A1A1A6"
              value={salle}
              onChangeText={setSalle}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Club Organisateur</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Boxing Paris 19"
              placeholderTextColor="#A1A1A6"
              value={club}
              onChangeText={setClub}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Prix (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 15 (ou 'Gratuit')"
              placeholderTextColor="#A1A1A6"
              value={prix}
              onChangeText={setPrix}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Affiche de l'événement</Text>
            
            {/* Aperçu de l'affiche */}
            <View style={styles.previewContainer}>
              <Image source={{ uri: affiche }} style={styles.formPosterPreview} />
            </View>

            {/* Liste de modèles */}
            <Text style={styles.subFieldLabel}>Choisir un modèle :</Text>
            <View style={styles.presetsRow}>
              {PRESET_IMAGES.map((img) => (
                <TouchableOpacity
                  key={img.id}
                  activeOpacity={0.8}
                  style={[
                    styles.presetThumbWrapper,
                    affiche === img.url && styles.presetThumbWrapperActive
                  ]}
                  onPress={() => setAffiche(img.url)}
                >
                  <Image source={{ uri: img.url }} style={styles.presetThumb} />
                  <Text style={styles.presetThumbLabel}>{img.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Lien d'image personnalisé */}
            <Text style={styles.subFieldLabel}>Ou coller le lien d'une image web :</Text>
            <TextInput
              style={styles.input}
              placeholder="https://exemple.com/affiche.jpg"
              placeholderTextColor="#A1A1A6"
              value={affiche}
              onChangeText={setAffiche}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ajouter les détails de la soirée, les combats..."
              placeholderTextColor="#A1A1A6"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Composant Principal ─────────────────────────────────────────────────────
export default function EvenementsScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  const filteredEvents = events.filter((e) =>
    e.titre.toLowerCase().includes(search.toLowerCase()) ||
    e.club.toLowerCase().includes(search.toLowerCase()) ||
    e.salle.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDetails = (event) => {
    setSelectedEvent(event);
    setSheetVisible(true);
  };

  const handleAddEvent = (newEvent) => {
    const dateParts = newEvent.date.split('/');
    const jourStr = dateParts[0] || '01';
    const monthNum = dateParts[1] || '01';
    const moisStr = getMonthAbbreviation(monthNum);

    const formattedEvent = {
      id: `e_${Date.now()}`,
      titre: newEvent.titre,
      dateText: `${newEvent.date}${newEvent.heure ? ' - ' + newEvent.heure : ''}`,
      jour: jourStr,
      mois: moisStr,
      salle: newEvent.salle,
      club: newEvent.club || 'Club Boxing Paris 19',
      prix: newEvent.prix ? (newEvent.prix.toLowerCase().includes('gratuit') ? 'Gratuit' : `${newEvent.prix} €`) : 'Gratuit',
      status: 'A venir',
      affiche: newEvent.affiche || 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800', // Affiche dynamique
      description: newEvent.description || 'Aucun détail supplémentaire disponible.',
    };

    setEvents([formattedEvent, ...events]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Bouton retour flottant FIXE */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.floatingBackBtn}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
      >
        {/* ── IMAGE EN-TÊTE ───────────────────────────────────────────── */}
        <View style={styles.imageHeaderContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800' }}
            style={styles.headerImage}
          />
          {/* Overlay sombre pour lisibilité */}
          <View style={styles.overlay} />
        </View>

        {/* ── BARRE DE RECHERCHE CHEVAUCHANTE ET STICKY ────────────────── */}
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un événement"
              placeholderTextColor="#8E8E93"
              value={search}
              onChangeText={setSearch}
            />
            <Text style={styles.searchIcon}>🔍</Text>
          </View>
        </View>

        {/* ── LISTE DES ÉVÉNEMENTS ─────────────────────────────────────── */}
        <View style={styles.listContainer}>
          {filteredEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun événement trouvé</Text>
            </View>
          ) : (
            filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => handleOpenDetails(event)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Barre de navigation du bas */}
      <BottomTabBar activeTab={null} navigation={navigation} onPlusPress={() => setAddSheetVisible(true)} />

      {/* Bottom Sheet des Détails de l'événement */}
      <EventDetailsBottomSheet
        visible={sheetVisible}
        event={selectedEvent}
        onClose={() => {
          setSheetVisible(false);
          setSelectedEvent(null);
        }}
      />

      {/* Modal d'ajout d'événement */}
      <AddEventSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onAdd={handleAddEvent}
      />
    </View>
  );
}

const SAFE_AREA_TOP = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Beige/crème background matching template
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Image Header
  imageHeaderContainer: {
    height: 220,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  floatingBackBtn: {
    position: 'absolute',
    top: SAFE_AREA_TOP + 8,
    left: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // High zIndex so it floats above the sticky header
  },
  backArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Search Bar
  searchBarWrapper: {
    width: '100%',
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 20,
    paddingTop: SAFE_AREA_TOP + 8, // Pousse la barre sous la caméra frontale/statut quand sticky
    paddingBottom: 16,
    marginTop: -(SAFE_AREA_TOP + 24), // Conserve la hauteur de l'image de 220px au départ
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#42A5F5', // Blue border matching selection in template
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    height: '100%',
  },
  searchIcon: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // List
  listContainer: {
    paddingHorizontal: 18,
    gap: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Event Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  cardHeader: {
    height: 64,
    backgroundColor: '#5C6BC0', // Blue/purple banner
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  dateBadge: {
    width: 44,
    height: 44,
    backgroundColor: '#FFCA28', // Yellow square badge
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A237E', // Dark blue text
    lineHeight: 16,
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A237E',
    marginTop: 1,
  },
  calendarIcon: {
    fontSize: 24,
  },
  statusBadge: {
    backgroundColor: '#FFCA28', // Yellow tag
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A237E',
  },

  // Card Body
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clubName: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: '#FFCA28', // Yellow capsule price badge
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A237E',
  },

  // ─── Styles Formulaire Ajout ───────────────────────────────────────────────
  formContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  formHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  formHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  formCancelTxt: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  formCreateTxt: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '700',
  },
  formScroll: {
    padding: 18,
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
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },

  // ─── Styles Modèles Affiches Formulaire ────────────────────────────────────
  previewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  formPosterPreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
    marginTop: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  presetThumbWrapper: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#FFFFFF',
  },
  presetThumbWrapperActive: {
    borderColor: '#007AFF',
  },
  presetThumb: {
    width: '100%',
    height: 50,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    resizeMode: 'cover',
  },
  presetThumbLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
});

// Styles pour le Bottom Sheet
const bs = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F7F7F7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C7C7CC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  posterImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    resizeMode: 'cover',
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  detailsContainer: {
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#FFCA28',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A237E',
  },
  priceBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF6C00',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  infoTxt: {
    fontSize: 14,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    fontWeight: '400',
    marginBottom: 20,
  },
});
