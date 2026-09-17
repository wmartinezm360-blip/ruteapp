import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

const app = initializeApp();
const db = getFirestore(app);

const colombiaData = {
  country: 'Colombia',
  countryCode: 'CO',
  order: 1,
  items: [
    {
      name: 'Línea 106 — Salud Mental (Minsalud)',
      phone: '106',
      availability: '24 horas, los 7 días de la semana',
      channels: 'Llamada telefónica y videollamada',
      coverage: 'Nacional'
    },
    {
      name: 'Línea 106 Bogotá — WhatsApp',
      phone: 'WhatsApp: 300 754 8933',
      availability: '24/7'
    },
    {
      name: 'Línea de emergencias',
      phone: '123',
      usage: 'Si hay riesgo inmediato para la vida, contactar directamente a emergencias.'
    }
  ]
};

const internationalData = {
  country: 'Internacional',
  countryCode: 'INT',
  order: 99,
  items: [
    {
      name: 'Befrienders Worldwide',
      url: 'https://www.befrienders.org/',
      usage: 'Red internacional de líneas de escucha en crisis.'
    },
    {
      name: 'IASP (International Association for Suicide Prevention)',
      url: 'https://www.iasp.info/resources/Crisis_Centres/',
      usage: 'Recursos y centros de crisis organizados por país.'
    }
  ]
};

async function seed() {
  await db.collection('crisis_resources').doc('CO').set(colombiaData);
  await db.collection('crisis_resources').doc('INT').set(internationalData);
  console.log('Seeded resources');
}
seed().catch(console.error);
