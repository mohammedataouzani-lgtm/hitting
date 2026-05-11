import axios from 'axios';

// Configuration Airtable
const AIRTABLE_BASE_ID = 'appnvQK108GDiTjiJ'; 
const AIRTABLE_API_KEY = 'patuTkCmoRxNB9Wsq.63f777915249ad2cdb31695442458449f92b560316f1461181bf2b00fdbe6315';
const AIRTABLE_API_URL = 'https://cors-anywhere.herokuapp.com/https://api.airtable.com/v0';

const TABLES = {
  CLUB: 'Club',
  COACH: 'Coach',
  BOXER: 'Boxeur',
  EVENT: 'Événements'
};

const airtableClient = axios.create({
  baseURL: `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}`,
  headers: {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// ===== CLUBS =====

// Récupérer tous les clubs
export const getClubs = async () => {
  try {
    console.log('Fetching clubs...');
    const response = await airtableClient.get(`/${TABLES.CLUB}`);
    console.log('Airtable response:', response.data);
    
    if (response.data.records) {
      return { 
        success: true, 
        clubs: response.data.records.map(record => ({
          id: record.id,
          name: record.fields['Nom du club'],
          ville: record.fields['Ville'],
          codePostal: record.fields['Code postal'],
          region: record.fields['Région']
        }))
      };
    }
    return { success: false, error: 'No clubs found' };
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return { success: false, error: error.message };
  }
};

// Créer un club
export const createClub = async (clubData) => {
  try {
    const response = await airtableClient.post(`/${TABLES.CLUB}`, {
      records: [{
        fields: {
          'Nom du club': clubData.nomClub,
          'Ville': clubData.ville,
          'Code postal': clubData.codePostal ? parseInt(clubData.codePostal) : null,
          'Région': clubData.region || null
        }
      }]
    });
    
    if (response.data.records.length > 0) {
      return { success: true, club: response.data.records[0] };
    }
    return { success: false, error: 'Club creation failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== COACHES =====

// Créer un coach
export const createCoach = async (coachData) => {
  try {
    const response = await airtableClient.post(`/${TABLES.COACH}`, {
      records: [{
        fields: {
          'Email': coachData.email,
          'Nom': coachData.nom,
          'Prénom': coachData.prenom,
          'Téléphone': coachData.telephone || null,
          'Numéro de licence': coachData.numeroLicence || null,
          'Firebase UID': coachData.firebaseUID,
          'Club': coachData.clubId ? [coachData.clubId] : []
        }
      }]
    });
    
    if (response.data.records.length > 0) {
      return { success: true, coach: response.data.records[0] };
    }
    return { success: false, error: 'Coach creation failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Trouver coach par Firebase UID
export const findCoachByFirebaseUID = async (uid) => {
  try {
    const response = await airtableClient.get(`/${TABLES.COACH}`, {
      params: {
        filterByFormula: `{Firebase UID} = "${uid}"`
      }
    });
    
    if (response.data.records.length > 0) {
      return { success: true, coach: response.data.records[0] };
    }
    return { success: false, error: 'Coach not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Trouver coach par email
export const findCoachByEmail = async (email) => {
  try {
    const response = await airtableClient.get(`/${TABLES.COACH}`, {
      params: {
        filterByFormula: `{Email} = "${email}"`
      }
    });
    
    if (response.data.records.length > 0) {
      return { success: true, coach: response.data.records[0] };
    }
    return { success: false, error: 'Coach not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Mettre à jour Firebase UID du coach
export const updateCoachFirebaseUID = async (coachId, firebaseUID) => {
  try {
    const response = await airtableClient.patch(`/${TABLES.COACH}/${coachId}`, {
      fields: {
        'Firebase UID': firebaseUID
      }
    });
    
    return { success: true, coach: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};