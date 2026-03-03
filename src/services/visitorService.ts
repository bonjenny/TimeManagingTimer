import {
  collection,
  doc,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/firebase';
import { getItem, setItem } from '../utils/storage';

export interface VisitorRecord {
  browser_id: string;
  timestamp: number;
}

const BROWSER_ID_KEY = 'timekeeper-browser-id';

const getBrowserId = (): string => {
  let id = getItem(BROWSER_ID_KEY);
  if (!id) {
    id = uuidv4();
    setItem(BROWSER_ID_KEY, id);
  }
  return id;
};

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const recordVisit = async (): Promise<void> => {
  try {
    const browser_id = getBrowserId();
    const date_key = todayKey();
    const doc_ref = doc(db, 'visitors', date_key, 'browsers', browser_id);
    await setDoc(doc_ref, { browser_id, timestamp: Date.now() }, { merge: true });
  } catch {
    // 실패 시 조용히 무시
  }
};

export const getTodayVisitors = async (): Promise<VisitorRecord[]> => {
  const date_key = todayKey();
  const col_ref = collection(db, 'visitors', date_key, 'browsers');
  const snapshot = await getDocs(col_ref);
  return snapshot.docs
    .map((d) => d.data() as VisitorRecord)
    .sort((a, b) => a.timestamp - b.timestamp);
};
