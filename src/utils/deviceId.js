import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

const DOC_ID_CACHE_KEY = '@questboard/user_firestore_doc_id';

function sanitizeDocId(raw) {
  const s = String(raw)
    .replace(/\//g, '_')
    .replace(/^\s+|\s+$/g, '');
  if (!s || /^\.{1,2}$/.test(s)) return null;
  return s.slice(0, 700);
}

async function resolveNewDocumentId() {
  try {
    if (Platform.OS === 'android') {
      const androidId = await Application.getAndroidIdAsync();
      const id = sanitizeDocId(androidId);
      if (id) return id;
    }
    if (Platform.OS === 'ios') {
      const idfv = await Application.getIosIdForVendorAsync();
      const id = sanitizeDocId(idfv);
      if (id) return id;
    }
  } catch {
    /* web / thiếu quyền / môi trường không hỗ trợ */
  }

  const scope = Device.isDevice ? 'device' : 'sim';
  const uuid = await Crypto.randomUUID();
  return `${scope}_${sanitizeDocId(uuid)}`;
}

export async function getUserDocumentId() {
  const cached = await AsyncStorage.getItem(DOC_ID_CACHE_KEY);
  if (cached) return cached;

  const id = await resolveNewDocumentId();
  await AsyncStorage.setItem(DOC_ID_CACHE_KEY, id);
  return id;
}
