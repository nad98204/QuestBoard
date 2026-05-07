import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import googleServices from '../../google-services.json';

const client = googleServices.client?.[0];
if (!client) {
  throw new Error('google-services.json không có mục client.');
}

const clientInfo = client.client_info;
const projectInfo = googleServices.project_info;
const projectId = projectInfo.project_id;

export const firebaseConfig = {
  apiKey: client.api_key[0].current_key,
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: projectInfo.storage_bucket,
  messagingSenderId: String(projectInfo.project_number),
  appId: clientInfo.mobilesdk_app_id,
};

const app = initializeApp(firebaseConfig);

function getFirestoreForExpo() {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = getFirestoreForExpo();
