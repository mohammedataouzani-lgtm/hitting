const util = require('util');
global.util = util;

// 1. Importation des déclencheurs Firebase Functions v2
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

// 2. Importation des modules tiers et Admin
const admin = require("firebase-admin");
const axios = require("axios");

// 3. Initialisation de l'application Admin
admin.initializeApp();

// 4. Fixer la région sur Paris par défaut pour éviter les conflits
setGlobalOptions({ region: "europe-west9" });

// ===== CLOUD FUNCTION v2: getClubs =====
exports.getClubs = onRequest(async (req, res) => {
  // En-têtes CORS indispensables pour l'app mobile
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const apiKey = process.env.AIRTABLE_API_KEY; 
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    console.log('🔄 Envoi de la requête à Airtable...');
    
    const response = await axios.get(
      `https://api.airtable.com/v0/${baseId}/Club`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    const records = response.data.records || [];
    
    // Reconstruction propre et tolérante de la liste des clubs
    const clubs = records.map(record => {
      const f = record.fields || {};
      
      // Extraction sécurisée de la région (texte ou premier élément d'un tableau)
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
    
    console.log(`✅ Traitement terminé avec succès. ${clubs.length} clubs prêts.`);
    return res.status(200).json({ success: true, clubs });
    
  } catch (error) {
    console.error('❌ Erreur attrapée dans getClubs :', error.response ? error.response.data : error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la récupération des clubs" 
    });
  }
});

// ===== CLOUD FUNCTION v2: syncCoachToAirtableV2 =====
exports.syncCoachToAirtableV2 = onDocumentCreated('coaches/{coachId}', async (event) => {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID || "appFpW8x2U7v7m2y6";
    
    const coachData = event.data.data(); 
    const coachId = event.params.coachId;
    
    console.log(`📝 Syncing coach ${coachId} to Airtable...`);
    
    const response = await axios.post(
      `https://api.airtable.com/v0/${baseId}/Coach`,
      {
        fields: {
          'Email': coachData.email,
          'Nom': coachData.firstName,
          'Prénom': coachData.lastName,
          'Club': coachData.clubId,
          'Firebase UID': coachId
        }
      },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    console.log(`✅ Coach synced successfully: ${response.data.id}`);
    
  } catch (error) {
    console.error('❌ Error syncing to Airtable:', error.message);
  }
});