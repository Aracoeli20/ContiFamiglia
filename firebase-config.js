// ============================================================
//  CONFIGURAZIONE FIREBASE
//  Incolla qui i valori del TUO progetto Firebase.
//  Console Firebase -> Impostazioni progetto -> Le tue app
//  -> icona Web (</>) -> oggetto "firebaseConfig".
//  Finche' i valori restano "INCOLLA_QUI" l'app gira in
//  MODALITA' LOCALE (dati solo su questo dispositivo).
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCxqsYhfYeKbMWBmLBQ3ECBgZNJIFp_wyg",
  authDomain: "http://conti-di-famiglia.firebaseapp.com",
  databaseURL: "https://conti-di-famiglia-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "conti-di-famiglia",
  storageBucket: "http://conti-di-famiglia.firebasestorage.app",
  messagingSenderId: "457016106642",
  appId: "1:457016106642:web:9f0d52dbb6918b896e904b"
};

export const isConfigured =
  !Object.values(firebaseConfig).some(v => !v || String(v).startsWith("INCOLLA"));
