// ==========================================
// 1. IMPORTS & INITIALISATION (Une seule fois)
// ==========================================
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Airtable = require("airtable");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// ==========================================
// 2. FONCTION : INSCRIPTION & VERROUILLAGE CLUB
// ==========================================
// CORRECTION ICI : Ajout de la région Europe et des nouveaux noms de secrets
exports.registerCoachAndLockClub = onRequest({ 
  region: "europe-west9", 
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"] 
}, async (req, res) => {
  
  // Gestion des CORS pour autoriser ton appli mobile à appeler la fonction
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).send("");
  }

  // Vérification de la sécurité (Jeton Firebase Auth)
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).send("Non autorisé : Token manquant");
  }
  const idToken = authorizationHeader.split("Bearer ")[1];

  try {
    // Validation du token utilisateur auprès de Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // Récupération des données envoyées par l'application
    const { clubId, email, prenom } = req.body;

    if (!clubId || !email) {
      return res.status(400).send("Données manquantes (clubId ou email)");
    }

    // CORRECTION ICI : Connexion à Airtable avec les variables secrètes d'Europe
    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    // Mise à jour de la table "Clubs" sur Airtable
    await base("Clubs").update(clubId, {
      "isTaken": true,
      "ManagedBy_UID": firebaseUid,
      "Coach_Email": email,
      "Coach_Prenom": prenom
    });

    return res.status(200).json({ success: true, message: "Club verrouillé avec succès !" });

  } catch (error) {
    console.error("Erreur dans la fonction registerCoachAndLockClub :", error);
    return res.status(500).send("Erreur interne du serveur");
  }
});