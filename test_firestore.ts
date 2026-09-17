import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
  let projectId = 'modern-almanac-w07pf';
  let databaseId = 'ai-studio-ruta-6d898d5a-d098-407f-963b-6b9181527b36';
  
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (configData.projectId) projectId = configData.projectId;
      if (configData.firestoreDatabaseId) databaseId = configData.firestoreDatabaseId;
    }
  } catch (e) {}

  console.log('Testing Firestore connection with:');
  console.log('Project ID:', projectId);
  console.log('Database ID:', databaseId);

  try {
    const app = initializeApp({
      credential: applicationDefault(),
      projectId: projectId
    });
    const db = getFirestore(app, databaseId);
    console.log('Attempting to read from collection "rate_limits"...');
    const snap = await db.collection('rate_limits').limit(1).get();
    console.log('Firestore Read SUCCESS! Found documents:', snap.size);
  } catch (err: any) {
    console.error('Firestore Read FAILED:');
    console.error(err.stack || err);
  }
}

test();
