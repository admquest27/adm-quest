import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Esta configuração não é secreta. A proteção dos dados vem das regras do Firestore.
const firebaseConfig = {
  apiKey: 'AIzaSyDKNTpLMBPRxNqHJMzyc0coz3JnazMs9-A',
  authDomain: 'adm-quest-2027.firebaseapp.com',
  projectId: 'adm-quest-2027',
  storageBucket: 'adm-quest-2027.firebasestorage.app',
  messagingSenderId: '747997211729',
  appId: '1:747997211729:web:cefc3fd8cb4864a2135c70',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provedorGoogle = new GoogleAuthProvider();
