// ============================================================
//  CONFIGURAZIONE FIREBASE
//  Incolla qui i valori del TUO progetto Firebase.
//  Console Firebase -> Impostazioni progetto -> Le tue app
//  -> icona Web (</>) -> oggetto "firebaseConfig".
//  Finche' i valori restano "INCOLLA_QUI" l'app gira in
//  MODALITA' LOCALE (dati solo su questo dispositivo).
// ============================================================

export const firebaseConfig = {
  apiKey: "INCOLLA_QUI",
  authDomain: "INCOLLA_QUI",
  projectId: "INCOLLA_QUI",
  storageBucket: "INCOLLA_QUI",
  messagingSenderId: "INCOLLA_QUI",
  appId: "INCOLLA_QUI"
};

export const isConfigured =
  !Object.values(firebaseConfig).some(v => !v || String(v).startsWith("INCOLLA"));
