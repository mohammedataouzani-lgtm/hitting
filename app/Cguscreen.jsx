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
    heading: '1. Objet',
    body:
      "Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile Hitting, éditée par STREAM & CO (association loi 1901), 7 Bâtiment A, 16 B boulevard Aristide Briand, 93100 Montreuil. L'utilisation de l'application implique l'acceptation pleine et entière des présentes CGU.",
  },
  {
    heading: '2. Description du service',
    body:
      "Hitting est une application destinée aux coachs de boxe titulaires d'une licence/affiliation FFBoxe, permettant de :\n\n• Enregistrer les boxeurs de leur club\n• Rechercher des adversaires compatibles pour organiser des combats interclubs\n• Envoyer et recevoir des demandes de combat\n• Gérer des événements de boxe\n• Suivre l'historique des résultats",
  },
  {
    heading: '3. Accès au service',
    body:
      "L'accès à Hitting nécessite la création d'un compte coach (email, mot de passe) et la vérification de l'adresse email.\n\nHitting est proposée gratuitement jusqu'à la rentrée 2027. Passé cette date, l'accès sera soumis à un abonnement payant, dont les modalités seront précisées dans les Conditions Générales de Vente (CGV) et communiquées aux utilisateurs avant l'entrée en vigueur.\n\nL'utilisateur s'engage à fournir des informations exactes lors de son inscription et à les maintenir à jour.",
  },
  {
    heading: "4. Obligations de l'utilisateur",
    body:
      "L'utilisateur s'engage à :\n\n• Utiliser l'application dans le respect des lois en vigueur et des règlements de la FFBoxe\n• Ne renseigner que des informations exactes concernant les boxeurs qu'il enregistre\n• Ne pas usurper l'identité d'un tiers\n• Ne pas détourner l'application de sa finalité\n• Garder confidentiels ses identifiants de connexion",
  },
  {
    heading: '5. Compte et boxeurs enregistrés',
    body:
      "Chaque boxeur ajouté par un coach est soumis à validation avant d'apparaître comme disponible dans l'application. STREAM & CO se réserve le droit de refuser ou de suspendre l'enregistrement d'un boxeur en cas d'informations manifestement inexactes ou frauduleuses.",
  },
  {
    heading: '6. Demandes de combat',
    body:
      "Hitting met en relation des coachs pour faciliter l'organisation de combats. STREAM & CO n'est pas partie aux accords conclus entre coachs et n'intervient pas dans l'organisation matérielle, la sécurité ou la conformité réglementaire des combats organisés via l'application. Chaque coach reste seul responsable du respect des règles de la FFBoxe pour les combats qu'il organise.",
  },
  {
    heading: '7. Propriété intellectuelle',
    body:
      "L'application, son contenu, sa structure et ses fonctionnalités sont la propriété de STREAM & CO. Toute reproduction ou exploitation non autorisée est interdite.",
  },
  {
    heading: '8. Responsabilité',
    body:
      "STREAM & CO met tout en œuvre pour assurer la disponibilité et le bon fonctionnement de l'application, sans garantie d'absence d'interruption ou d'erreur. STREAM & CO ne saurait être tenu responsable des dommages résultant de l'usage de l'application, de l'exactitude des informations saisies par les utilisateurs, ou des combats organisés entre coachs via la mise en relation.",
  },
  {
    heading: '9. Suspension et résiliation',
    body:
      "STREAM & CO se réserve le droit de suspendre ou de résilier l'accès d'un utilisateur en cas de non-respect des présentes CGU.",
  },
  {
    heading: '10. Modification des CGU',
    body:
      "Ces CGU peuvent être modifiées à tout moment. Les utilisateurs seront informés de toute modification substantielle via l'application.",
  },
  {
    heading: '11. Droit applicable',
    body: 'Les présentes CGU sont soumises au droit français.',
  },
  {
    heading: '12. Contact',
    body: 'Pour toute question relative à ces CGU : hitting.contact@gmail.com',
  },
];

export default function CGUScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F6" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Conditions générales d'utilisation — Hitting</Text>

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