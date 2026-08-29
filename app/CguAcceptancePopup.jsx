import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

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

export default function CguAcceptancePopup({ visible, onAccept, onRefuse, navigation }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 24;
    if (isCloseToBottom && !scrolledToBottom) setScrolledToBottom(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Conditions générales d'utilisation</Text>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            showsVerticalScrollIndicator={true}
          >
            {SECTIONS.map((section, index) => (
              <View key={index} style={styles.section}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}

            <TouchableOpacity onPress={() => navigation.navigate('PolitiqueConfidentialite')}>
              <Text style={styles.privacyLink}>
                Consulte aussi notre Politique de confidentialité
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {!scrolledToBottom && (
            <Text style={styles.hint}>Fais défiler jusqu'en bas pour continuer ↓</Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.refuseBtn} onPress={onRefuse} activeOpacity={0.8}>
              <Text style={styles.refuseBtnText}>Refuser</Text>
            </TouchableOpacity>

            {scrolledToBottom && (
              <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
                <Text style={styles.acceptBtnText}>J'accepte</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#000', marginBottom: 14, textAlign: 'center' },
  scrollArea: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  section: { marginBottom: 18 },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: '#1C1C1E', marginBottom: 6 },
  sectionBody: { fontSize: 13, color: '#3C3C43', lineHeight: 19 },
  privacyLink: {
    fontSize: 13,
    color: '#d32f2f',
    fontWeight: '700',
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  refuseBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  refuseBtnText: { color: '#666', fontSize: 15, fontWeight: '700' },
  acceptBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#d32f2f',
  },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});