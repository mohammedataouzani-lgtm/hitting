const util = require('util');
global.util = util;

const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
const axios = require("axios");
const Airtable = require("airtable");

admin.initializeApp();

setGlobalOptions({ region: "europe-west9" });

// ===== CLOUD FUNCTION v2: getClubs =====
exports.getClubs = onRequest({
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    
    console.log('🔄 Envoi de la requête à Airtable...');
    
    const response = await axios.get(
      `https://api.airtable.com/v0/${baseId}/Club`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    const records = response.data.records || [];
    
    const clubs = records.map(record => {
      const f = record.fields || {};
      let regionRaw = f['Région'] || '';
      let regionClean = Array.isArray(regionRaw) ? (regionRaw[0] || '') : regionRaw;
      return {
        id: record.id,
        name: f['Nom du club'] ? String(f['Nom du club']) : 'Sans nom',
        ville: f['Ville'] ? String(f['Ville']) : '',
        codePostal: f['Code postal'] ? String(f['Code postal']) : '',
        region: String(regionClean)
      };
    });
    
    console.log(`✅ ${clubs.length} clubs prêts.`);
    return res.status(200).json({ clubs });
    
  } catch (error) {
    console.error('❌ Erreur getClubs :', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: "Erreur lors de la récupération des clubs" });
  }
});

// ===== CLOUD FUNCTION v2: syncCoachToAirtableV2 =====
exports.syncCoachToAirtableV2 = onDocumentCreated({
  document: 'coaches/{coachId}',
  secrets: ["AIRTABLE_SECRET_KEY", "AIRTABLE_BASE_ID_SECURE"]
}, async (event) => {
  try {
    const apiKey = process.env.AIRTABLE_SECRET_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SECURE;
    
    const coachData = event.data.data();
    const coachId = event.params.coachId;
    console.log('👉 DONNÉES REÇUES DE FIRESTORE :', JSON.stringify(coachData));
    console.log(`📝 Syncing coach ${coachId} to Airtable...`);
    
    const clubArray = coachData.clubId ? [String(coachData.clubId)] : [];
    const finalFirstName = coachData.prenom || coachData.firstName || '';
    const finalLastName = coachData.nom || coachData.lastName || '';
    const finalTelephone = coachData.telephone || coachData.phone || '';
    const finalLicence = coachData.numeroLicence || '';
    
    const response = await axios.post(
      `https://api.airtable.com/v0/${baseId}/Coach`,
      {
        fields: {
          'Email': coachData.email || '',
          'Nom': finalLastName,
          'Prénom': finalFirstName,
          'Téléphone': String(finalTelephone),
          'Numéro d\'affiliation': String(finalLicence),
          'Club': clubArray,
          'Firebase UID': coachId
        }
      },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    console.log(`✅ Coach synced successfully: ${response.data.id}`);
    
  } catch (error) {
    console.error('❌ Error syncing to Airtable:', error.response ? error.response.data : error.message);
  }
});

// ===== CLOUD FUNCTION v2: addBoxeurEnAttente =====
exports.addBoxeurEnAttente = onRequest({
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
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    await admin.auth().verifyIdToken(authorizationHeader.split("Bearer ")[1]);

    const { nom, prenom, dateNaissance, sexe, categorie, categoriePoids,
            poids, niveau, numeroLicence, coachEmail, clubName, clubId } = req.body;

    const base = new Airtable({ apiKey: process.env.AIRTABLE_SECRET_KEY })
      .base(process.env.AIRTABLE_BASE_ID_SECURE);

const record = await base("Boxeurs en attente").create({
  "Nom": nom || "",
  "Prénom": prenom || "",
  "Date de naissance": dateNaissance ? (() => {
    const parts = dateNaissance.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateNaissance;
  })() : "",
  "Sexe": sexe || "",
  "Catégorie de poids": categoriePoids || "",
  "Poids": poids ? parseFloat(poids) : null,
  "Niveau": niveau || "",
  "Numéro de licence": numeroLicence ? parseInt(numeroLicence) : null,
  "Liaison vers Club": clubId ? [clubId] : [],
});

    return res.status(200).json({ success: true, id: record.id });

  } catch (error) {
    console.error("Erreur addBoxeurEnAttente:", error.response ? error.response.data : error.message);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});
f