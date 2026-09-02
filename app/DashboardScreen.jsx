import React, { useState, useRef, useCallback, useEffect } from 'react';
import BottomTabBar from './components/BottomTabBar';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  PanResponder,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Pressable,
  FlatList,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useNotifications } from '../NotificationContext';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;


const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const EVENT_STYLE = {
  gala: { bg: '#EF5350', text: '#fff' },
  sparring: { bg: '#4CAF50', text: '#fff' },
  combat: { bg: '#42A5F5', text: '#fff' },
  evenement: { bg: '#5C6BC0', text: '#fff' }, // générique, tant qu'il n'existe pas de champ "Type" sur les Événements
};

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month, year) {
  return new Date(year, month, 1).getDay();
}

function buildCalendarGrid(month, year) {
  const firstDay = getFirstDayOfMonth(month, year);
  const daysInMonth = getDaysInMonth(month, year);
  const daysInPrev = getDaysInMonth(month - 1 < 0 ? 11 : month - 1, month - 1 < 0 ? year - 1 : year);

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ day: next++, current: false });
  return cells;
}

function formatDateSouhaitee(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// ─────────────────────────────────────────────
// ACTION SHEET (bouton +)
// ─────────────────────────────────────────────
function ActionSheet({ visible, onClose, onAddBoxeur, onAddEvenement }) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[as.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[as.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={as.handle} />
        <Text style={as.title}>Que voulez-vous ajouter ?</Text>

        {/* Ajouter un boxeur */}
        <TouchableOpacity style={as.option} activeOpacity={0.7} onPress={onAddBoxeur}>
          <LinearGradient colors={['#3949AB', '#5C6BC0']} style={as.optionIcon}>
            <Text style={as.optionEmoji}>👥</Text>
          </LinearGradient>
          <View style={as.optionTexts}>
            <Text style={as.optionTitle}>Ajouter un boxeur</Text>
            <Text style={as.optionSub}>Enregistrer un nouveau boxeur dans votre club</Text>
          </View>
          <Text style={as.optionArrow}>›</Text>
        </TouchableOpacity>

        {/* Ajouter un événement */}
        <TouchableOpacity style={as.option} activeOpacity={0.7} onPress={onAddEvenement}>
          <LinearGradient colors={['#E53935', '#EF5350']} style={as.optionIcon}>
            <Text style={as.optionEmoji}>🥊</Text>
          </LinearGradient>
          <View style={as.optionTexts}>
            <Text style={as.optionTitle}>Ajouter un événement</Text>
            <Text style={as.optionSub}>Créer un gala, sparring ou combat</Text>
          </View>
          <Text style={as.optionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={as.cancelBtn} onPress={onClose}>
          <Text style={as.cancelTxt}>Annuler</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// BILAN BOTTOM SHEET
// ─────────────────────────────────────────────
function BilanBottomSheet({ visible, onClose, stats }) {
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;

  const open = useCallback(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [translateY]);

  const close = useCallback(() => {
    Animated.timing(translateY, { toValue: BOTTOM_SHEET_MAX_HEIGHT, duration: 250, useNativeDriver: true }).start(() => onClose());
  }, [translateY, onClose]);

  useEffect(() => {
    if (visible) { translateY.setValue(BOTTOM_SHEET_MAX_HEIGHT); open(); }
  }, [visible, open, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => { if (g.dy > 120 || g.vy > 0.5) close(); else open(); },
    })
  ).current;

  if (!visible) return null;

  const victoryPct = stats.victoryRate || 0;
  const defeatPct = stats.defeatRate || 0;
  const drawPct = stats.drawRate || 0;
  const koPct = stats.koRate || 0;

  const rings = [
    { color: '#43A047', pct: victoryPct, r: 70, stroke: 14 },
    { color: '#EF5350', pct: defeatPct, r: 52, stroke: 12 },
    { color: '#FFC107', pct: drawPct, r: 36, stroke: 10 },
    { color: '#42A5F5', pct: koPct, r: 20, stroke: 8 },
  ];

  const svgSize = 180;
  const center = svgSize / 2;

  const statCards = [
    { emoji: '🏆', label: 'Victoires', count: stats.totalWins || 0, pct: victoryPct, bg: '#E8F5E9', barColor: '#43A047' },
    { emoji: '⚠️', label: 'Défaites', count: stats.totalDefeats || 0, pct: defeatPct, bg: '#FFEBEE', barColor: '#EF5350' },
   { emoji: '🤝', label: 'Nuls', count: stats.totalDraws || 0, pct: drawPct, bg: '#FFF8E1', barColor: '#FFC107' },
    { emoji: '⚡', label: 'K.O', count: stats.totalKos || 0, pct: koPct, bg: '#E3F2FD', barColor: '#42A5F5' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={bs.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[bs.sheet, { height: BOTTOM_SHEET_MAX_HEIGHT, transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <View style={bs.handleRow}><View style={bs.handle} /></View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={bs.scrollContent}>
          <Text style={bs.title}>Bilan saison</Text>
          <Text style={bs.subtitle}>{stats.saison || '2025 -- 2026'} • {stats.totalBoxeurs || 0} boxeurs</Text>

          <View style={bs.chartRow}>
            <Svg width={svgSize} height={svgSize}>
              {rings.map(({ color, pct, r, stroke }, idx) => {
                const circumference = 2 * Math.PI * r;
                const offset = circumference * (1 - pct / 100);
                return (
                  <React.Fragment key={idx}>
                    <Circle cx={center} cy={center} r={r} stroke="#E8E8E8" strokeWidth={stroke} fill="none" />
                    <Circle cx={center} cy={center} r={r} stroke={color} strokeWidth={stroke} fill="none"
                      strokeDasharray={`${circumference}`} strokeDashoffset={offset}
                      strokeLinecap="round" rotation="-90" origin={`${center}, ${center}`} />
                  </React.Fragment>
                );
              })}
            </Svg>
            <View style={bs.legend}>
             {[{ color: '#43A047', label: 'Victoires' }, { color: '#EF5350', label: 'Défaites' }, { color: '#FFC107', label: 'Nuls' }, { color: '#42A5F5', label: 'K.O' }].map(({ color, label }) => (
                <View key={label} style={bs.legendItem}>
                  <View style={[bs.legendDot, { borderColor: color }]} />
                  <Text style={bs.legendTxt}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={bs.cardsGrid}>
            {statCards.map(({ emoji, label, count, pct, bg, barColor }) => (
              <View key={label} style={[bs.card, { backgroundColor: bg }]}>
                <View style={bs.cardTopRow}>
                  <Text style={bs.cardEmoji}>{emoji}</Text>
                  <Text style={[bs.cardPct, { color: barColor }]}>{pct}%</Text>
                </View>
                <Text style={bs.cardCount}>{count}</Text>
                <Text style={bs.cardLabel}>{label}</Text>
                <View style={bs.cardBarBg}>
                  <View style={[bs.cardBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
// ─────────────────────────────────────────────
// DÉTAIL ÉVÉNEMENT BOTTOM SHEET
// ─────────────────────────────────────────────
const TYPE_LABEL = {
  gala: 'Gala',
  sparring: 'Sparring',
  combat: 'Combat',
  evenement: 'Événement',
};

function EvenementDetailBottomSheet({ visible, onClose, eventInfo, onVoirEvenements, onVoirDemandes }) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const open = useCallback(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [translateY]);

  const close = useCallback(() => {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => onClose());
  }, [translateY, onClose]);

  useEffect(() => {
    if (visible) { translateY.setValue(SCREEN_HEIGHT); open(); }
  }, [visible, open, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => { if (g.dy > 120 || g.vy > 0.5) close(); else open(); },
    })
  ).current;

  if (!visible || !eventInfo) return null;

  const { type, data } = eventInfo;
  const evStyle = EVENT_STYLE[type] || EVENT_STYLE.evenement;
  const isCombat = type !== 'evenement';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={eds.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[eds.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <View style={eds.handleRow}><View style={eds.handle} /></View>

        <View style={eds.badgeRow}>
          <View style={[eds.typeBadge, { backgroundColor: evStyle.bg }]}>
            <Text style={[eds.typeBadgeTxt, { color: evStyle.text }]}>{TYPE_LABEL[type] || 'Événement'}</Text>
          </View>
        </View>

        {isCombat ? (
          <>
            <Text style={eds.title}>{data.titre || 'Combat'}</Text>
            {data.dateFormatee ? (
              <View style={eds.infoRow}>
                <Text style={eds.infoIcon}>📅</Text>
                <Text style={eds.infoTxt}>{data.dateFormatee}</Text>
              </View>
            ) : null}
            {data.lieu ? (
              <View style={eds.infoRow}>
                <Text style={eds.infoIcon}>📍</Text>
                <Text style={eds.infoTxt}>{data.lieu}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {data.photo ? <Image source={{ uri: data.photo }} style={eds.image} /> : null}
            <Text style={eds.title}>{data.titre}</Text>
            <View style={eds.infoRow}>
              <Text style={eds.infoIcon}>📅</Text>
              <Text style={eds.infoTxt}>{data.dateFormatee}</Text>
            </View>
            <View style={eds.infoRow}>
              <Text style={eds.infoIcon}>📍</Text>
              <Text style={eds.infoTxt}>{data.adresse}</Text>
            </View>
            {data.prix ? (
              <View style={eds.infoRow}>
                <Text style={eds.infoIcon}>💶</Text>
                <Text style={eds.infoTxt}>{data.prix}</Text>
              </View>
            ) : null}
          </>
        )}

      <TouchableOpacity
          style={eds.voirBtn}
          activeOpacity={0.85}
          onPress={() => {
            close();
            if (isCombat) {
              onVoirDemandes && onVoirDemandes();
            } else {
              onVoirEvenements && onVoirEvenements();
            }
          }}
        >
          <Text style={eds.voirBtnTxt}>
            {isCombat ? 'Voir mes demandes' : 'Voir tous les événements'}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </Animated.View>
    </Modal>
  );
}

const eds = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 20 },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CCC' },
  badgeRow: { flexDirection: 'row', marginBottom: 12 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  typeBadgeTxt: { fontSize: 12, fontWeight: '700' },
  image: { width: '100%', height: 140, borderRadius: 12, marginBottom: 14, resizeMode: 'cover' },
  title: { fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 14, letterSpacing: -0.3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoIcon: { fontSize: 15 },
  infoTxt: { fontSize: 14, color: '#555', fontWeight: '500' },
  voirBtn: { marginTop: 12, backgroundColor: '#2B5BB8', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  voirBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─────────────────────────────────────────────
// DASHBOARD SCREEN
// ─────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { refreshNotifCount } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      refreshNotifCount();
    }, [])
  );

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [bilanVisible, setBilanVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evenements, setEvenements] = useState([]);
  const carouselRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [combats, setCombats] = useState([]);
  const [eventDetailVisible, setEventDetailVisible] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const demandesCarouselRef = useRef(null);
  const [activeDemandeSlide, setActiveDemandeSlide] = useState(0);
  const [coachData, setCoachData] = useState({
    firstName: 'Coach',
    clubName: 'Chargement du club...',
    totalFights: 0,
    victoryRate: 0,
    nextEvent: null,
  });


   useFocusEffect(
    useCallback(() => {
    const fetchDashboardData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const db = getFirestore();
        const snapshot = await getDoc(doc(db, 'coaches', user.uid));
        const idToken = await user.getIdToken();

        let baseData = {
          firstName: 'Coach',
          clubName: 'Pas de club associé',
        };
        if (snapshot.exists()) {
          const data = snapshot.data();
          baseData = {
            firstName: data.firstName || 'Coach',
            clubName: data.clubName || 'Pas de club associé',
          };
        }

        // Fetch stats dynamiques (combats, taux de victoire, bilan saison)
        const statsResponse = await fetch(
          'https://europe-west9-hitting-23de9.cloudfunctions.net/getDashboardStats',
          { headers: { 'Authorization': `Bearer ${idToken}` } }
        );
        const statsData = await statsResponse.json();
        const stats = statsData.success ? statsData.stats : {};

        setCoachData({
          ...baseData,
          totalFights: stats.totalFights ?? 0,
          victoryRate: stats.victoryRate ?? 0,
          defeatRate: stats.defeatRate ?? 0,
          drawRate: stats.drawRate ?? 0,
          koRate: stats.koRate ?? 0,
          totalWins: stats.totalWins ?? 0,
          totalDefeats: stats.totalDefeats ?? 0,
          totalDraws: stats.totalDraws ?? 0,
              totalKos: stats.totalKos ?? 0,
          activeBoxers: stats.activeBoxers ?? 0,
          totalBoxeurs: stats.totalBoxeurs ?? 0,
          saison: '2025 -- 2026',
        });

          
const evtResponse = await fetch(
  'https://europe-west9-hitting-23de9.cloudfunctions.net/getEvenements',
  { headers: { 'Authorization': `Bearer ${idToken}` } }
);
const evtData = await evtResponse.json();
console.log('📅 combats reçus:', JSON.stringify(evtData.combats));
if (evtData.success) {
  const now = new Date();
  const evenementsAVenir = (evtData.evenements || []).filter(e => {
    if (!e.dateRaw) return true;
    const d = new Date(e.dateRaw);
    return isNaN(d) || d >= now;
  });
  setEvenements(evenementsAVenir);
  setCombats(evtData.combats || []);
}
const notifResponse = await fetch(
  'https://europe-west9-hitting-23de9.cloudfunctions.net/getNotifications',
  { headers: { 'Authorization': `Bearer ${idToken}` } }
);
const notifData = await notifResponse.json();
console.log('🔍 Demandes reçues:', JSON.stringify(notifData.demandesEnAttente));
if (notifData.success) {
  setDemandes(notifData.demandesEnAttente || []);
}
      } catch (error) {
        console.error("Erreur Dashboard:", error);
      } finally {
         setLoading(false);
        }
       };
      fetchDashboardData();
    }, [])
  );

  
  const calCells = buildCalendarGrid(month, year);
const activeEvents = evenements
  .filter(e => e.dateRaw)
  .map(e => {
    const d = new Date(e.dateRaw);
    return { day: d.getDate(), evMonth: d.getMonth(), evYear: d.getFullYear(), type: 'evenement', data: e };
  })
  .filter(e => e.evMonth === month && e.evYear === year);
  const activeCombats = combats
  .filter(c => c.dateRaw)
  .map(c => {
    const d = new Date(c.dateRaw);
    return { day: d.getDate(), evMonth: d.getMonth(), evYear: d.getFullYear(), type: c.typeCombat, data: c };
  })
  .filter(c => c.evMonth === month && c.evYear === year);

const allCalendarEvents = [...activeEvents, ...activeCombats];
const getEventType = (day) => {
  const found = allCalendarEvents.find(e => e.day === day);
  return found ? found.type : null;
};
const getEventForDay = (day) => allCalendarEvents.find(e => e.day === day) || null;

  const isToday = (day, current) =>
    current && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleAddBoxeur = () => {
    setActionSheetVisible(false);
    // Petit délai pour laisser le sheet se fermer avant la navigation
    setTimeout(() => navigation.navigate('MesBoxeurs', { openAddSheet: true }), 300);
  };

  const handleAddEvenement = () => {
    setActionSheetVisible(false);
    setTimeout(() => navigation.navigate('Evenements', { openAddSheet: true }), 300);
  };

  if (loading) {
    return (
      <View style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#2B5BB8" />
        <Text style={styles.loadingText}>Préparation du ring...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#2B5BB8', '#5AA3E8']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.header}>
        <Text style={styles.greet}>Bonjour {coachData.firstName}, 👋</Text>
        <Text style={styles.clubName}>{coachData.clubName}</Text>

       <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statLabel}>Total combats</Text>
              <Text style={styles.statValue}>{coachData.totalFights}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statLabel}>Taux victoire</Text>
              <Text style={[styles.statValue, styles.statGreen]}>{coachData.victoryRate}%</Text>
            </View>
          </View>
        <LinearGradient colors={['#F44336', '#FF9800', '#FFC107', '#43A047']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.progressBar} />
          <View style={styles.statsActionsRow}>
            <TouchableOpacity onPress={() => setBilanVisible(true)}>
              <Text style={styles.detailsTxt}>Détails</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('HistoriqueCombats')}>
              <Text style={styles.detailsTxt}>Voir l'historique</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.content}>

          {/* ÉVÉNEMENTS — CARROUSEL */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Événements</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Evenements')} style={styles.voirRow}>
                <Text style={styles.voirTxt}>Voir tous</Text>
                <View style={styles.avatarCircle}><Text style={styles.avatarEmoji}>🥊</Text></View>
              </TouchableOpacity>
            </View>

            {evenements.length === 0 ? (
              <View style={styles.noEventCard}>
                <Text style={styles.noEventText}>Aucun événement à venir. ☕</Text>
              </View>
            ) : (
              <>
                <FlatList
                  ref={carouselRef}
                  data={evenements}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  onScroll={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 36));
                    setActiveSlide(idx);
                  }}
                  scrollEventThrottle={16}
                 renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.eventCard, { width: width - 36 }]}
                      onPress={() => {
                        setSelectedEventDetail({ type: 'evenement', data: item });
                        setEventDetailVisible(true);
                      }}
                    >
                      {item.photo ? (
                        <Image source={{ uri: item.photo }} style={styles.eventCardImage} />
                      ) : null}
                      <View style={styles.eventBadges}>
                        <View style={styles.badgeGala}>
                          <Text style={styles.badgeGalaTxt}>{item.statut?.toUpperCase() || 'À VENIR'}</Text>
                        </View>
                        <View style={styles.badgePrice}>
                          <Text style={styles.badgePriceTxt}>{item.prix}</Text>
                        </View>
                      </View>
                      <Text style={styles.eventTitle}>{item.titre}</Text>
                      <View style={styles.eventRow}>
                        <Text style={styles.eventIcon}>📅</Text>
                        <Text style={styles.eventMeta}>{item.dateFormatee}</Text>
                      </View>
                      <View style={[styles.eventRow, styles.eventRowLast]}>
                        <Text style={styles.eventIcon}>📍</Text>
                        <Text style={styles.eventMeta}>{item.adresse}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
                {/* Indicateurs pagination */}
                {evenements.length > 1 && (
                  <View style={styles.carouselDots}>
                    {evenements.map((_, i) => (
                      <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
{/* SUIVI DE DEMANDE — CARROUSEL */}
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Suivi de demande</Text>
    <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('DemandesMatch')} style={styles.voirRow}>
      <Text style={styles.voirTxt}>Voir tout</Text>
      <View style={styles.avatarCircle}><Text style={styles.avatarEmoji}>🤝</Text></View>
    </TouchableOpacity>
  </View>

  {demandes.length === 0 ? (
    <View style={styles.noEventCard}>
      <Text style={styles.noEventText}>Aucune demande en cours. 🥊</Text>
    </View>
  ) : (
    <>
      <FlatList
        ref={demandesCarouselRef}
        data={demandes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 36));
          setActiveDemandeSlide(idx);
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const isRecue = item.type === 'recue';
          return (
         <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.demandeCard, { width: width - 36 }]}
              onPress={() => navigation.navigate('DemandesMatch')}
            >
              <View style={styles.demandeBadges}>
                <View style={[styles.badgeType, { backgroundColor: isRecue ? '#FFF8E1' : '#E3F2FD' }]}>
                  <Text style={[styles.badgeTypeTxt, { color: isRecue ? '#F9A825' : '#1976D2' }]}>
                    {isRecue ? '🥊 Demande reçue' : '📤 Demande envoyée'}
                  </Text>
                </View>
               <View style={[styles.badgeStatut, item.statut === 'Accepté' && styles.badgeStatutAccepte]}>
                  <Text style={[styles.badgeStatutTxt, item.statut === 'Accepté' && styles.badgeStatutTxtAccepte]}>
                    {item.statut === 'Accepté' ? 'ACCEPTÉ' : 'EN ATTENTE'}
                  </Text>
                </View>
              </View>

              <Text style={styles.demandeTitle}>{item.prenomBoxeur} {item.nomBoxeur}</Text>
              <Text style={styles.demandeVsTxt}>vs</Text>
              <Text style={styles.demandeAdversaire}>{item.prenomAdversaire} {item.nomAdversaire}</Text>

                {item.dateSouhaitee && (
                <View style={styles.demandeDateRow}>
                  <Text style={styles.demandeDateIcon}>📅</Text>
                  <Text style={styles.demandeDateTxt}>{formatDateSouhaitee(item.dateSouhaitee)}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
      {demandes.length > 1 && (
        <View style={styles.carouselDots}>
          {demandes.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeDemandeSlide && styles.dotActive]} />
          ))}
        </View>
      )}
    </>
  )}
</View>
          {/* CALENDRIER */}
          <View style={styles.calSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Calendrier</Text>
              <View style={styles.legendPills}>
  <View style={styles.pillEvenement}><Text style={styles.pillEvenementTxt}>Événement</Text></View>
  <View style={[styles.pillEvenement, { backgroundColor: '#FFEBEE' }]}>
    <Text style={[styles.pillEvenementTxt, { color: '#EF5350' }]}>Gala</Text>
  </View>
  <View style={[styles.pillEvenement, { backgroundColor: '#E8F5E9' }]}>
    <Text style={[styles.pillEvenementTxt, { color: '#4CAF50' }]}>Sparring</Text>
  </View>
</View>
            </View>

            <View style={styles.calWidget}>
              <View style={styles.calNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
                <View style={styles.calNavCenter}>
                  <View style={styles.calSelect}><Text style={styles.calSelectTxt}>{MONTHS_FR[month]}</Text></View>
                  <View style={styles.calSelect}><Text style={styles.calSelectTxt}>{year}</Text></View>
                </View>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
              </View>

              <View style={styles.daysHeader}>
                {DAYS_SHORT.map(d => (
                  <View key={d} style={styles.dayHeaderCell}><Text style={styles.dayHeaderTxt}>{d}</Text></View>
                ))}
              </View>

              <View style={styles.calGrid}>
                {calCells.map(({ day, current }, i) => {
                  const evType = current ? getEventType(day) : null;
                  const evStyle = evType ? EVENT_STYLE[evType] : null;
                  const todayCell = isToday(day, current);
                  return (
                  <TouchableOpacity key={i} activeOpacity={evStyle ? 0.7 : 1} disabled={!evStyle}
                      onPress={() => {
                        if (!evStyle) return;
                        const found = getEventForDay(day);
                        if (found) {
                          setSelectedEventDetail(found);
                          setEventDetailVisible(true);
                        }
                      }} style={styles.calCell}>
                      <View style={[
                        styles.calNum,
                        evStyle && { backgroundColor: evStyle.bg },
                        todayCell && !evStyle && styles.calNumToday,
                      ]}>
                        <Text style={[
                          styles.calNumTxt,
                          !current && styles.calNumOther,
                          evStyle && { color: evStyle.text, fontWeight: '700' },
                          todayCell && !evStyle && styles.calNumTodayTxt,
                        ]}>
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

        </View>
      </ScrollView>

      <BottomTabBar
        activeTab="dashboard"
        navigation={navigation}
        onPlusPress={() => setActionSheetVisible(true)}
      />

      <BilanBottomSheet visible={bilanVisible} onClose={() => setBilanVisible(false)} stats={coachData} />
    <EvenementDetailBottomSheet
        visible={eventDetailVisible}
        onClose={() => setEventDetailVisible(false)}
        eventInfo={selectedEventDetail}
        onVoirEvenements={() => navigation.navigate('Evenements')}
        onVoirDemandes={() => navigation.navigate('DemandesMatch')}
      />
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        onAddBoxeur={handleAddBoxeur}
        onAddEvenement={handleAddEvenement}
        
      />
    </View>
  );
}

// ─── Styles Dashboard ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, color: '#666', fontWeight: '500' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16, paddingHorizontal: 20, paddingBottom: 26 },
  greet: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 3 },
  clubName: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 20 },
  statsCard: { backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 18, padding: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
   statBlock: { flex: 1 },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 36, fontWeight: '800', color: '#111', lineHeight: 40 },
  statGreen: { color: '#43A047' },
  progressBar: { height: 8, borderRadius: 4, marginBottom: 11 },
  detailsTxt: { textAlign: 'center', fontSize: 13, color: '#888', fontWeight: '600', paddingTop: 2 },
  statsActionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2 },
  content: { backgroundColor: '#fff', paddingBottom: 30 },
  section: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.4 },
  voirRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voirTxt: { fontSize: 13, color: '#555', fontWeight: '600' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 22 },
  eventCard: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 14, marginRight: 0 },
  eventCardImage: { width: '100%', height: 120, borderRadius: 10, marginBottom: 10, resizeMode: 'cover' },
  carouselDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ccc' },
  dotActive: { backgroundColor: '#E53935', width: 18 },
  noEventCard: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
  demandeCard: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 16, marginRight: 0 },
  demandeBadges: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  badgeType: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTypeTxt: { fontSize: 11, fontWeight: '700' },
  badgeStatut: { backgroundColor: '#EAEBF8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeStatutAccepte: { backgroundColor: '#E8F5E9' },
  badgeStatutTxtAccepte: { color: '#2E7D32' },
  badgeStatutTxt: { fontSize: 11, fontWeight: '700', color: '#5C6BC0' },
  demandeTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 2 },
  demandeVsTxt: { fontSize: 13, color: '#999', fontWeight: '600', marginBottom: 2 },
  demandeAdversaire: { fontSize: 17, fontWeight: '800', color: '#111' },
  demandeDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  demandeDateIcon: { fontSize: 13 },
  demandeDateTxt: { fontSize: 13, color: '#888', fontWeight: '500' },
  noEventText: { color: '#666', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  eventBadges: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  badgeGala: { backgroundColor: '#EAEBF8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeGalaTxt: { fontSize: 11, fontWeight: '700', color: '#5C6BC0' },
  badgePrice: { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgePriceTxt: { fontSize: 11, fontWeight: '700', color: '#EF6C00' },
  eventTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 10 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  eventRowLast: { marginBottom: 16 },
  eventIcon: { fontSize: 15 },
  eventMeta: { fontSize: 14, color: '#555' },
  countdownRow: { flexDirection: 'row', alignItems: 'center' },
  countdownLabel: { fontSize: 14, color: '#999', fontWeight: '700', marginRight: 16 },
  countdownItem: { marginRight: 16, alignItems: 'center' },
  countdownSub: { fontSize: 11, color: '#AAA' },
  countdownVal: { fontSize: 22, fontWeight: '800', color: '#111', lineHeight: 26 },
  infoCircle: { marginLeft: 'auto', width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center' },
  infoTxt: { fontSize: 13, color: '#999', fontWeight: '700' },
  calSection: { paddingHorizontal: 18, paddingBottom: 16 },
  legendPills: { flexDirection: 'row', gap: 6 },
  pillEvenement: { backgroundColor: '#EAEBF8', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillEvenementTxt: { fontSize: 10, fontWeight: '700', color: '#5C6BC0' },
  calWidget: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E5E5', padding: 14 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  navArrow: { fontSize: 24, color: '#555', fontWeight: '600', lineHeight: 28 },
  calNavCenter: { flexDirection: 'row', gap: 8 },
  calSelect: { borderWidth: 0.5, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  calSelectTxt: { fontSize: 14, fontWeight: '600', color: '#222' },
  daysHeader: { flexDirection: 'row', marginBottom: 2 },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayHeaderTxt: { fontSize: 12, color: '#AAA', fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  calNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calNumTxt: { fontSize: 14, color: '#222', fontWeight: '400' },
  calNumOther: { color: '#CCC' },
  calNumToday: { borderWidth: 2, borderColor: '#2B5BB8' },
  calNumTodayTxt: { color: '#2B5BB8', fontWeight: '700' },
});

// ─── Styles Bilan Sheet ───────────────────────────────────────────────────────
const bs = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FAFAFA', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 20 },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CCC' },
  scrollContent: { paddingHorizontal: 22, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: '#111', marginTop: 10, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4, marginBottom: 20, fontWeight: '500' },
  chartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28, gap: 20 },
  legend: { gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, backgroundColor: 'transparent' },
  legendTxt: { fontSize: 14, color: '#444', fontWeight: '500' },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  card: { width: (width - 44 - 14) / 2, borderRadius: 18, padding: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardEmoji: { fontSize: 20 },
  cardPct: { fontSize: 13, fontWeight: '700' },
  cardCount: { fontSize: 42, fontWeight: '900', color: '#111', lineHeight: 48 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 10 },
  cardBarBg: { height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3 },
  cardBarFill: { height: 6, borderRadius: 3 },
});

// ─── Styles Action Sheet ──────────────────────────────────────────────────────
const as = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 20, textAlign: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 },
  optionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionEmoji: { fontSize: 22 },
  optionTexts: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 3 },
  optionSub: { fontSize: 12, color: '#999', fontWeight: '400' },
  optionArrow: { fontSize: 22, color: '#CCC', fontWeight: '300' },
  cancelBtn: { marginTop: 4, alignItems: 'center', padding: 14 },
  cancelTxt: { fontSize: 15, color: '#999', fontWeight: '600' },
});