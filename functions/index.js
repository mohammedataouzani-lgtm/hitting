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
exports.registerCoachAndLockClub = onRequest({ 
  region: "europe-west9", 
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"] 
}, async (req, res) => {
  
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).send("");
  }

  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).send("Non autorisé : Token manquant");
  }
  const idToken = authorizationHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    const { clubId, email, prenom } = req.body;

    if (!clubId || !email) {
      return res.status(400).send("Données manquantes (clubId ou email)");
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    await base("Club").update(clubId, {
      "isTaken": true,
      "ManagedBy_UID": firebaseUid,
      "Coach_Email": email,
      "Coach_Prenom": prenom
    });

    return res.status(200).json({ success: true, message: "Club verrouillé avec succès !" });

  } catch (error) {
    console.error("Erreur registerCoachAndLockClub :", error);
    return res.status(500).send("Erreur interne du serveur");
  }
});

// ==========================================
// 3. FONCTION : RÉCUPÉRATION DES CLUBS
// ==========================================
exports.getClubs = onRequest({
  region: "europe-west9",
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"] 
}, async (req, res) => {

  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

    const records = await base("Club").select().all();

 const clubs = records.map(record => ({
  id: record.id,
  name: record.fields["Nom du club"] || "",
  ville: record.fields["Ville"] || "",
  codePostal: record.fields["Code postal"] || ""
}));

    return res.status(200).json({ clubs });

  } catch (error) {
    console.error("Erreur getClubs :", error);
    return res.status(500).send("Erreur interne du serveur");
  }
});