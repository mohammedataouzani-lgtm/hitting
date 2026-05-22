import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;
const BOTTOM_SHEET_MIN_HEIGHT = 0;

// ─── Données Bilan saison ────────────────────────────────────────────────────
const BILAN_DATA = {
  saison: '2025 --- 2026',
  boxeursActifs: 9,
  victoires: { count: 35, pct: 69 },
  defaites: { count: 8, pct: 23 },
  nuls: { count: 3, pct: 9 },
  ko: { count: 11, pct: 31 },
};


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

// Événements du mois (à dynamiser selon tes données)
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

  // Jours du mois précédent
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, current: false });
  }
  // Jours du mois courant
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true });
  }
  // Jours du mois suivant
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: next++, current: false });
  }

  return cells;
}

// ─── Composant Bottom Sheet « Bilan saison » ─────────────────────────────────
function BilanBottomSheet({ visible, onClose }) {
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

  // Open when visible becomes true
  React.useEffect(() => {
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

  // Concentric rings data
  const rings = [
    { color: '#43A047', pct: BILAN_DATA.victoires.pct, r: 70, stroke: 14 },
    { color: '#EF5350', pct: BILAN_DATA.defaites.pct, r: 52, stroke: 12 },
    { color: '#42A5F5', pct: BILAN_DATA.nuls.pct, r: 36, stroke: 10 },
    { color: '#FFC107', pct: BILAN_DATA.ko.pct, r: 20, stroke: 8 },
  ];

  const svgSize = 180;
  const center = svgSize / 2;

  const statCards = [
    { emoji: '🏆', label: 'Victoires', ...BILAN_DATA.victoires, bg: '#E8F5E9', barColor: '#43A047' },
    { emoji: '⚠️', label: 'Défaites', ...BILAN_DATA.defaites, bg: '#FFEBEE', barColor: '#EF5350' },
    { emoji: '🤝', label: 'Nuls', ...BILAN_DATA.nuls, bg: '#FFF8E1', barColor: '#FF9800' },
    { emoji: '⚡', label: 'K.O', ...BILAN_DATA.ko, bg: '#E3F2FD', barColor: '#42A5F5' },
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
        {/* Handle */}
        <View style={bs.handleRow}>
          <View style={bs.handle} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={bs.scrollContent}>
          {/* Titre */}
          <Text style={bs.title}>Bilan saison</Text>
          <Text style={bs.subtitle}>
            {BILAN_DATA.saison} {BILAN_DATA.boxeursActifs} boxeurs actifs
          </Text>

          {/* Graphique en anneaux concentriques */}
          <View style={bs.chartRow}>
            <Svg width={svgSize} height={svgSize}>
              {rings.map(({ color, pct, r, stroke }, idx) => {
                const circumference = 2 * Math.PI * r;
                const offset = circumference * (1 - pct / 100);
                return (
                  <React.Fragment key={idx}>
                    {/* Fond gris */}
                    <Circle
                      cx={center}
                      cy={center}
                      r={r}
                      stroke="#E8E8E8"
                      strokeWidth={stroke}
                      fill="none"
                    />
                    {/* Arc coloré */}
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

            {/* Légende */}
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

          {/* Cartes stats 2×2 */}
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
export default function DashboardScreen() {
  const [month, setMonth] = useState(2);   // Mars = index 2
  const [year, setYear] = useState(2026);
  const [bilanVisible, setBilanVisible] = useState(false);

  const calCells = buildCalendarGrid(month, year);

  // Événements actifs pour le mois affiché (ici on filtre pour Mars 2026)
  const activeEvents =
    month === 2 && year === 2026 ? MARCH_EVENTS : [];

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER GRADIENT ─────────────────────────────────────────── */}
        <LinearGradient
          colors={['#2B5BB8', '#5AA3E8']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.greet}>Bonjour Coach, 👋</Text>
          <Text style={styles.clubName}>Red Star Olympique Audonien</Text>

          {/* Carte stats */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statLabel}>Total combats</Text>
                <Text style={styles.statValue}>35</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.statLabel}>Taux victoire</Text>
                <Text style={[styles.statValue, styles.statGreen]}>69%</Text>
              </View>
            </View>

            {/* Barre de progression dégradée */}
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

        {/* ── CONTENU BLANC ───────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* ── PROCHAIN ÉVÉNEMENT ────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prochain événement</Text>
              <View style={styles.voirRow}>
                <Text style={styles.voirTxt}>Voir</Text>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>🥊</Text>
                </View>
              </View>
            </View>

            {/* Carte événement */}
            <View style={styles.eventCard}>
              {/* Badges */}
              <View style={styles.eventBadges}>
                <View style={styles.badgeGala}>
                  <Text style={styles.badgeGalaTxt}>GALA</Text>
                </View>
                <View style={styles.badgePrice}>
                  <Text style={styles.badgePriceTxt}>À partir de 10€</Text>
                </View>
              </View>

              <Text style={styles.eventTitle}>Coupe du Val d'Oise</Text>

              <View style={styles.eventRow}>
                <Text style={styles.eventIcon}>📅</Text>
                <Text style={styles.eventMeta}>Samedi 11 avril 2026</Text>
              </View>

              <View style={[styles.eventRow, styles.eventRowLast]}>
                <Text style={styles.eventIcon}>📍</Text>
                <Text style={styles.eventMeta}>Gymnase Jacques Duclos , Persan</Text>
              </View>

              {/* Compte à rebours */}
              <View style={styles.countdownRow}>
                <Text style={styles.countdownLabel}>Dans</Text>
                {[['Jours', '35'], ['Heures', '04'], ['Min', '00']].map(([lbl, val]) => (
                  <View key={lbl} style={styles.countdownItem}>
                    <Text style={styles.countdownSub}>{lbl}</Text>
                    <Text style={styles.countdownVal}>{val}</Text>
                  </View>
                ))}
                <View style={styles.infoCircle}>
                  <Text style={styles.infoTxt}>ℹ</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── CALENDRIER ────────────────────────────────────────────── */}
          <View style={styles.calSection}>
            {/* En-tête + légende */}
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

            {/* Widget calendrier */}
            <View style={styles.calWidget}>
              {/* Navigation mois */}
              <View style={styles.calNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>

                <View style={styles.calNavCenter}>
                  <View style={styles.calSelect}>
                    <Text style={styles.calSelectTxt}>{MONTHS_FR[month]}</Text>
                    {/* Remplacer par un Picker RN si besoin */}
                  </View>
                  <View style={styles.calSelect}>
                    <Text style={styles.calSelectTxt}>{year}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
              </View>

              {/* En-têtes jours */}
              <View style={styles.daysHeader}>
                {DAYS_SHORT.map(d => (
                  <View key={d} style={styles.dayHeaderCell}>
                    <Text style={styles.dayHeaderTxt}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Grille jours */}
              <View style={styles.calGrid}>
                {calCells.map(({ day, current }, i) => {
                  const evType = current ? getEventType(day) : null;
                  const evStyle = evType ? EVENT_STYLE[evType] : null;

                  return (
                    <View key={i} style={styles.calCell}>
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
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Bottom Sheet Bilan saison */}
      <BilanBottomSheet
        visible={bilanVisible}
        onClose={() => setBilanVisible(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // HEADER
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16,
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  greet: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  clubName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 20,
  },

  // Carte stats dans le header
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 18,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111',
    lineHeight: 40,
  },
  statGreen: {
    color: '#43A047',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 11,
  },
  detailsTxt: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    paddingTop: 2,
  },

  // CONTENU
  content: {
    backgroundColor: '#fff',
    paddingBottom: 30,
  },
  section: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.4,
  },

  // Voir + avatar
  voirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voirTxt: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#43A047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 22,
  },

  // Carte événement
  eventCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 14,
  },
  eventBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeGala: {
    backgroundColor: '#EAEBF8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGalaTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C6BC0',
  },
  badgePrice: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePriceTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF6C00',
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  eventRowLast: {
    marginBottom: 16,
  },
  eventIcon: {
    fontSize: 15,
  },
  eventMeta: {
    fontSize: 14,
    color: '#555',
  },

  // Compte à rebours
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '700',
    marginRight: 16,
  },
  countdownItem: {
    marginRight: 16,
    alignItems: 'center',
  },
  countdownSub: {
    fontSize: 11,
    color: '#AAA',
  },
  countdownVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    lineHeight: 26,
  },
  infoCircle: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTxt: {
    fontSize: 13,
    color: '#999',
    fontWeight: '700',
  },

  // CALENDRIER
  calSection: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  legendPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pillGala: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillGalaTxt: { fontSize: 10, fontWeight: '700', color: '#E53935' },
  pillSparring: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillSparringTxt: { fontSize: 10, fontWeight: '700', color: '#43A047' },
  pillCombat: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillCombatTxt: { fontSize: 10, fontWeight: '700', color: '#1E88E5' },

  // Widget calendrier
  calWidget: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E5E5E5',
    padding: 14,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  navArrow: {
    fontSize: 24,
    color: '#555',
    fontWeight: '600',
    lineHeight: 28,
  },
  calNavCenter: {
    flexDirection: 'row',
    gap: 8,
  },
  calSelect: {
    borderWidth: 0.5,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  calSelectTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },

  // Grille calendrier
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayHeaderTxt: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  calNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNumTxt: {
    fontSize: 14,
    color: '#222',
    fontWeight: '400',
  },
  calNumOther: {
    color: '#CCC',
  },
});

// ─── Styles Bottom Sheet ─────────────────────────────────────────────────────
const bs = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CCC',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111',
    marginTop: 10,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    marginBottom: 20,
    fontWeight: '500',
  },

  // Chart row
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 20,
  },
  legend: {
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  legendTxt: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },

  // Cards grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  card: {
    width: (width - 44 - 14) / 2,
    borderRadius: 18,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardCount: {
    fontSize: 42,
    fontWeight: '900',
    color: '#111',
    lineHeight: 48,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  cardBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
  },
  cardBarFill: {
    height: 6,
    borderRadius: 3,
  },
});