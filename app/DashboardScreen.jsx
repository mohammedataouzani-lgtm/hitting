import React, { useState, useRef, useCallback, useEffect } from 'react'; // 🧠 Ajout de useEffect
// importation de mon fichier bottom tab bar
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
  ActivityIndicator, // 🧠 Ajouté pour l'indicateur de chargement
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

// ─── IMPORTS FIREBASE ────────────────────────────────────────────────────────
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

// ─── Constantes ──────────────────────────────────────────────────────────────
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const EVENT_STYLE = {
  gala: { bg: '#EF5350', text: '#fff' },
  sparring: { bg: '#4CAF50', text: '#fff' },
  combat: { bg: '#42A5F5', text: '#fff' },
};

const MARCH_EVENTS = [
  { day: 2, type: 'sparring' },
  { day: 11, type: 'gala' },
  { day: 15, type: 'combat' },
];

// ─── Utils calendrier ────────────────────────────────────────────────────────
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

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, current: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: next++, current: false });
  }

  return cells;
}

// ─── Composant Bottom Sheet « Bilan saison » ─────────────────────────────────
function BilanBottomSheet({ visible, onClose, stats }) { // 🧠 Ajout des stats dynamiques ici
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

  useEffect(() => {
    if (visible) {
      translateY.setValue(BOTTOM_SHEET_MAX_HEIGHT);
      open();
    }
  }, [visible, open, translateY]);

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

  if (!visible) return null;

  // Calcul des pourcentages du graphique circulaire avec des valeurs de repli (fallbacks)
  const victoryPct = stats.victoryRate || 0;
  const defeatPct = stats.defeatRate || 0;
  const drawPct = stats.drawRate || 0;
  const koPct = stats.koRate || 0;

  const rings = [
    { color: '#43A047', pct: victoryPct, r: 70, stroke: 14 },
    { color: '#EF5350', pct: defeatPct, r: 52, stroke: 12 },
    { color: '#42A5F5', pct: drawPct, r: 36, stroke: 10 },
    { color: '#FFC107', pct: koPct, r: 20, stroke: 8 },
  ];

  const svgSize = 180;
  const center = svgSize / 2;

  const statCards = [
    { emoji: '🏆', label: 'Victoires', count: stats.totalWins || 0, pct: victoryPct, bg: '#E8F5E9', barColor: '#43A047' },
    { emoji: '⚠️', label: 'Défaites', count: stats.totalDefeats || 0, pct: defeatPct, bg: '#FFEBEE', barColor: '#EF5350' },
    { emoji: '🤝', label: 'Nuls', count: stats.totalDraws || 0, pct: drawPct, bg: '#FFF8E1', barColor: '#FF9800' },
    { emoji: '⚡', label: 'K.O', count: stats.totalKos || 0, pct: koPct, bg: '#E3F2FD', barColor: '#42A5F5' },
  ];

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
        <View style={bs.handleRow}>
          <View style={bs.handle} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={bs.scrollContent}>
          <Text style={bs.title}>Bilan saison</Text>
          <Text style={bs.subtitle}>
            {stats.saison || '2025 --- 2026'} • {stats.activeBoxers || 0} boxeurs actifs
          </Text>

          <View style={bs.chartRow}>
            <Svg width={svgSize} height={svgSize}>
              {rings.map(({ color, pct, r, stroke }, idx) => {
                const circumference = 2 * Math.PI * r;
                const offset = circumference * (1 - pct / 100);
                return (
                  <React.Fragment key={idx}>
                    <Circle
                      cx={center}
                      cy={center}
                      r={r}
                      stroke="#E8E8E8"
                      strokeWidth={stroke}
                      fill="none"
                    />
                    <Circle
                      cx={center}
                      cy={center}
                      r={r}
                      stroke={color}
                      strokeWidth={stroke}
                      fill="none"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      rotation="-90"
                      origin={`${center}, ${center}`}
                    />
                  </React.Fragment>
                );
              })}
            </Svg>

            <View style={bs.legend}>
              {[
                { color: '#43A047', label: 'Victoires' },
                { color: '#EF5350', label: 'Défaites' },
                { color: '#42A5F5', label: 'Nuls' },
                { color: '#FFC107', label: 'K.O' },
              ].map(({ color, label }) => (
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

// ─── Composant principal ─────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) { 
  const [month, setMonth] = useState(2);   // Mars = index 2
  const [year, setYear] = useState(2026);
  const [bilanVisible, setBilanVisible] = useState(false);

  // 📦 États pour centraliser les données issues d'Airtable via Firestore
  const [loading, setLoading] = useState(true);
  const [coachData, setCoachData] = useState({
    firstName: 'Coach',
    clubName: 'Chargement du club...',
    totalFights: 0,
    victoryRate: 0,
    nextEvent: null
  });

  // 📡 Capteur d'ouverture : Lecture de la base de données Firestore
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          navigation.replace('Login');
          return;
        }

        const db = getFirestore();
        const docRef = doc(db, 'coaches', user.uid);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          
          setCoachData({
            firstName: data.firstName || 'Coach',
            clubName: data.clubName || 'Pas de club associé',
            totalFights: data.totalFights !== undefined ? data.totalFights : 0,
            victoryRate: data.victoryRate !== undefined ? data.victoryRate : 0,
            nextEvent: data.nextEvent || null, // Récupération de la map événementielle
            // Données complémentaires pour alimenter le volet Bilan
            defeatRate: data.defeatRate || 0,
            drawRate: data.drawRate || 0,
            koRate: data.koRate || 0,
            totalWins: data.totalWins || 0,
            totalDefeats: data.totalDefeats || 0,
            totalDraws: data.totalDraws || 0,
            totalKos: data.totalKos || 0,
            activeBoxers: data.activeBoxers || 0,
            saison: data.saison || '2025 --- 2026',
          });
        }
      } catch (error) {
        console.error("Erreur de récupération globale du Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigation]);

  const calCells = buildCalendarGrid(month, year);

  const activeEvents = month === 2 && year === 2026 ? MARCH_EVENTS : [];

  const getEventType = (day) => {
    const ev = activeEvents.find(e => e.day === day);
    return ev ? ev.type : null;
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // ⌛ Rendu d'un écran d'attente pendant la récupération réseau
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

      {/* ── HEADER GRADIENT (DYNAMIQUE) ─────────────────────────────────── */}
      <LinearGradient
        colors={['#2B5BB8', '#5AA3E8']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.header}
      >
        {/* Prénom et Club liés à Airtable/Firestore */}
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

          <LinearGradient
            colors={['#F44336', '#FF9800', '#FFC107', '#43A047']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressBar}
          />

          <TouchableOpacity onPress={() => setBilanVisible(true)}>
            <Text style={styles.detailsTxt}>Détails</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Zone de défilement principale */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.content}>

          {/* ── PROCHAIN ÉVÉNEMENT (DYNAMIQUE) ────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prochain événement</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Evenements')}
                style={styles.voirRow}
              >
                <Text style={styles.voirTxt}>Voir</Text>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>🥊</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Condition d'affichage : Si Airtable a renvoyé un événement futur */}
            {coachData.nextEvent ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Evenements')}
                style={styles.eventCard}
              >
                <View style={styles.eventBadges}>
                  <View style={styles.badgeGala}>
                    <Text style={styles.badgeGalaTxt}>{coachData.nextEvent.type?.toUpperCase() || 'GALA'}</Text>
                  </View>
                  <View style={styles.badgePrice}>
                    <Text style={styles.badgePriceTxt}>{coachData.nextEvent.priceText || 'Gratuit'}</Text>
                  </View>
                </View>

                {/* Nom, date et lieu issus de ta base de données */}
                <Text style={styles.eventTitle}>{coachData.nextEvent.title || 'Événement à venir'}</Text>

                <View style={styles.eventRow}>
                  <Text style={styles.eventIcon}>📅</Text>
                  <Text style={styles.eventMeta}>{coachData.nextEvent.dateText || 'Date non communiquée'}</Text>
                </View>

                <View style={[styles.eventRow, styles.eventRowLast]}>
                  <Text style={styles.eventIcon}>📍</Text>
                  <Text style={styles.eventMeta}>{coachData.nextEvent.location || 'Lieu à définir'}</Text>
                </View>

                {/* Compte à rebours dynamique basé sur Airtable */}
                <View style={styles.countdownRow}>
                  <Text style={styles.countdownLabel}>Dans</Text>
                  {[
                    ['Jours', coachData.nextEvent.days || '0'], 
                    ['Heures', coachData.nextEvent.hours || '00'], 
                    ['Min', coachData.nextEvent.minutes || '00']
                  ].map(([lbl, val]) => (
                    <View key={lbl} style={styles.countdownItem}>
                      <Text style={styles.countdownSub}>{lbl}</Text>
                      <Text style={styles.countdownVal}>{val}</Text>
                    </View>
                  ))}
                  <View style={styles.infoCircle}>
                    <Text style={styles.infoTxt}>ℹ</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              // S'il n'y a pas d'événement programmé dans Airtable
              <View style={styles.noEventCard}>
                <Text style={styles.noEventText}>Aucun gala ou combat de planifié pour le moment. ☕</Text>
              </View>
            )}
          </View>

          {/* ── CALENDRIER ────────────────────────────────────────────── */}
          <View style={styles.calSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Calendrier</Text>
              <View style={styles.legendPills}>
                <View style={styles.pillGala}>
                  <Text style={styles.pillGalaTxt}>Gala</Text>
                </View>
                <View style={styles.pillSparring}>
                  <Text style={styles.pillSparringTxt}>Sparring</Text>
                </View>
                <View style={styles.pillCombat}>
                  <Text style={styles.pillCombatTxt}>Combat</Text>
                </View>
              </View>
            </View>

            <View style={styles.calWidget}>
              <View style={styles.calNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>

                <View style={styles.calNavCenter}>
                  <View style={styles.calSelect}>
                    <Text style={styles.calSelectTxt}>{MONTHS_FR[month]}</Text>
                  </View>
                  <View style={styles.calSelect}>
                    <Text style={styles.calSelectTxt}>{year}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.daysHeader}>
                {DAYS_SHORT.map(d => (
                  <View key={d} style={styles.dayHeaderCell}>
                    <Text style={styles.dayHeaderTxt}>{d}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calGrid}>
                {calCells.map(({ day, current }, i) => {
                  const evType = current ? getEventType(day) : null;
                  const evStyle = evType ? EVENT_STYLE[evType] : null;

                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={evStyle ? 0.7 : 1}
                      disabled={!evStyle}
                      onPress={() => evStyle && navigation.navigate('Evenements')}
                      style={styles.calCell}
                    >
                      <View style={[
                        styles.calNum,
                        evStyle && { backgroundColor: evStyle.bg },
                      ]}>
                        <Text style={[
                          styles.calNumTxt,
                          !current && styles.calNumOther,
                          evStyle && { color: evStyle.text, fontWeight: '700' },
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

      {/* Barre de navigation basse */}
      <BottomTabBar activeTab="dashboard" navigation={navigation} />

      {/* Bottom Sheet Bilan saison raccordé aux stats dynamiques */}
      <BilanBottomSheet
        visible={bilanVisible}
        onClose={() => setBilanVisible(false)}
        stats={coachData}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, color: '#666', fontWeight: '500' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16, paddingHorizontal: 20, paddingBottom: 26 },
  greet: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 3 },
  clubName: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 20 },
  statsCard: { backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 18, padding: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 36, fontWeight: '800', color: '#111', lineHeight: 40 },
  statGreen: { color: '#43A047' },
  progressBar: { height: 8, borderRadius: 4, marginBottom: 11 },
  detailsTxt: { textAlign: 'center', fontSize: 13, color: '#888', fontWeight: '600', paddingTop: 2 },
  content: { backgroundColor: '#fff', paddingBottom: 30 },
  section: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.4 },
  voirRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voirTxt: { fontSize: 13, color: '#555', fontWeight: '600' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 22 },
  eventCard: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 14 },
  noEventCard: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
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
  pillGala: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillGalaTxt: { fontSize: 10, fontWeight: '700', color: '#E53935' },
  pillSparring: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillSparringTxt: { fontSize: 10, fontWeight: '700', color: '#43A047' },
  pillCombat: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillCombatTxt: { fontSize: 10, fontWeight: '700', color: '#1E88E5' },
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
});

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