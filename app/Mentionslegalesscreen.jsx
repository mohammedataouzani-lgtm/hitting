import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';

const SECTIONS = [
  {
    heading: "Éditeur de l'application",
    body:
      "STREAM & CO\nStatut : Association loi 1901\nN° RNA : W931031000\nAdresse (siège social) : 7 Bâtiment A, 16 B boulevard Aristide Briand, 93100 Montreuil\nEmail de contact : hitting.contact@gmail.com",
  },
  {
    heading: 'Directrice de la publication',
    body: 'Wassila AMOURA, Présidente de STREAM & CO',
  },
  {
    heading: 'Hébergement',
    body:
      "Site web (mentions légales, politique de confidentialité, CGU) : IONOS SARL, 7 place de la Gare, 57200 Sarreguemines, France\n\nBackend et données de l'app : Firebase (Google Ireland Limited), Gordon House, Barrow Street, Dublin 4, Irlande\n\nBase de données boxeurs : Airtable Inc., 799 Market Street, San Francisco, CA 94103, États-Unis",
  },
  {
    heading: 'Propriété intellectuelle',
    body:
      "L'ensemble des contenus de l'application Hitting (textes, logo, interface, structure) est la propriété de STREAM & CO, sauf mention contraire. Toute reproduction, représentation ou exploitation, totale ou partielle, sans autorisation préalable est interdite.",
  },
  {
    heading: 'Données personnelles',
    body:
      "Le traitement des données personnelles est décrit dans la Politique de confidentialité, accessible depuis Mon Compte.",
  },
  {
    heading: 'Médiation de la consommation',
    body:
      "Conformément à l'article L.616-1 du Code de la consommation, en cas de litige non résolu directement avec STREAM & CO, tu peux recourir gratuitement à un médiateur de la consommation. (Coordonnées à venir avant la bascule vers l'abonnement payant en 2027.)",
  },
  {
    heading: 'Droit applicable',
    body: 'Les présentes mentions légales sont soumises au droit français.',
  },
  {
    heading: 'Contact',
    body: 'Pour toute question relative à ces mentions légales : hitting.contact@gmail.com',
  },
];

export default function MentionsLegalesScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentions légales</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Mentions légales — Hitting</Text>

        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 16,
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: '#FAF9F6',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 28, color: '#1C1C1E', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  mainTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 },
  sectionBody: { fontSize: 14, color: '#3C3C43', lineHeight: 21 },
});