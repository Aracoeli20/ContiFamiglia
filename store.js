import { firebaseConfig, isConfigured } from './firebase-config.js';

const MEMBER_COLORS = ['#3E6B63','#B07D3F','#9A5640','#6E7B4F','#5A6473','#7A5566'];
function colorFor(k){ let h=0; for(const c of String(k)) h=(h*31+c.charCodeAt(0))>>>0; return MEMBER_COLORS[h % MEMBER_COLORS.length]; }
function rid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/* ---------------- Modalità LOCALE (localStorage) ---------------- */
function makeLocalStore(){
  const NS='conti:';
  const read=(k,d)=>{ try{ const v=localStorage.getItem(NS+k); return v==null?d:JSON.parse(v); }catch{ return d; } };
  const write=(k,v)=>{ try{ localStorage.setItem(NS+k, JSON.stringify(v)); }catch{} };
  const subs={}; const catSubs=[];
  const sortC=(c,a)=> (c==='transactions'||c==='snapshots')
    ? [...a].sort((x,y)=>(y.date||'').localeCompare(x.date||'')||(y.createdAt||0)-(x.createdAt||0))
    : a;
  const emit=c=>(subs[c]||[]).forEach(cb=>cb(sortC(c, read(c,[]))));
  let authCb=null, current=null;
  const setCur=m=>{ current=m; write('current', m?m.uid:null); authCb && authCb(current); };
  return {
    mode:'local',
    onAuth(cb){ authCb=cb; const id=read('current',null); current=read('members',[]).find(m=>m.uid===id)||null; cb(current); return ()=>{ authCb=null; }; },
    async logout(){ setCur(null); },
    local:{
      members(){ return read('members',[]); },
      select(id){ const m=read('members',[]).find(x=>x.uid===id); if(m) setCur(m); },
      create(name){
        const m={ uid:rid(), name:(name||'Utente').trim()||'Utente', color:colorFor((name||'')+rid()) };
        const ms=read('members',[]); ms.push(m); write('members',ms); emit('members'); setCur(m); return m;
      }
    },
    subscribe(c,cb){ (subs[c]=subs[c]||[]).push(cb); cb(sortC(c, read(c,[]))); return ()=>{ subs[c]=(subs[c]||[]).filter(f=>f!==cb); }; },
    async add(c,data){ const id=rid(); const a=read(c,[]); a.push({ id, createdAt:Date.now(), ...data }); write(c,a); emit(c); return id; },
    async update(c,id,data){ write(c, read(c,[]).map(x=>x.id===id?{...x,...data}:x)); emit(c); },
    async remove(c,id){ write(c, read(c,[]).filter(x=>x.id!==id)); emit(c); },
    async adjustAccount(id,delta){ write('accounts', read('accounts',[]).map(x=>x.id===id?{...x,balance:(+x.balance||0)+delta}:x)); emit('accounts'); },
    subscribeCategories(cb){ catSubs.push(cb); cb(read('categories',null)); return ()=>{ const i=catSubs.indexOf(cb); if(i>=0) catSubs.splice(i,1); }; },
    async saveCategories(o){ write('categories',o); catSubs.forEach(cb=>cb(o)); }
  };
}

/* ---------------- Modalità FIREBASE (Firestore + Auth) ---------------- */
async function makeFirebaseStore(){
  const V='https://www.gstatic.com/firebasejs/10.14.1';
  const [appM, authM, fsM] = await Promise.all([
    import(`${V}/firebase-app.js`),
    import(`${V}/firebase-auth.js`),
    import(`${V}/firebase-firestore.js`)
  ]);
  const { initializeApp } = appM;
  const { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
          signOut, updateProfile, setPersistence, browserLocalPersistence } = authM;
  const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore,
          collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, increment } = fsM;

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(()=>{});

  let db;
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch(e){ try { db = getFirestore(app); } catch(_){ db = initializeFirestore(app, {}); } }

  const memberDoc = async u => { try { const s=await getDoc(doc(db,'members',u)); return s.exists()?s.data():null; } catch { return null; } };

  return {
    mode:'firebase',
    onAuth(cb){
      return onAuthStateChanged(auth, async u=>{
        if(!u){ cb(null); return; }
        let m = await memberDoc(u.uid);
        if(!m){
          m={ uid:u.uid, name:u.displayName||(u.email||'Utente').split('@')[0], email:u.email||'', color:colorFor(u.uid) };
          setDoc(doc(db,'members',u.uid), { ...m, createdAt:serverTimestamp() }).catch(()=>{});
        }
        cb({ uid:u.uid, email:u.email||'', name:m.name, color:m.color||colorFor(u.uid) });
      });
    },
    async register({ email, password, name }){
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const nm = ((name||email.split('@')[0])||'Utente').trim();
      const color = colorFor(cred.user.uid);
      updateProfile(cred.user, { displayName:nm }).catch(()=>{});
      await setDoc(doc(db,'members',cred.user.uid), { uid:cred.user.uid, name:nm, email:email.trim(), color, createdAt:serverTimestamp() });
      return { uid:cred.user.uid, email:email.trim(), name:nm, color };
    },
    async login({ email, password }){ await signInWithEmailAndPassword(auth, email.trim(), password); },
    async logout(){ await signOut(auth); },
    subscribe(c,cb){
      const ref = (c==='transactions'||c==='snapshots') ? query(collection(db,c), orderBy('date','desc')) : collection(db,c);
      return onSnapshot(ref, s=>cb(s.docs.map(d=>({ id:d.id, ...d.data() }))), e=>{ console.warn('subscribe',c,e&&e.code); cb([]); });
    },
    async add(c,data){ const r=await addDoc(collection(db,c), { ...data, createdAt:serverTimestamp() }); return r.id; },
    async update(c,id,data){ await updateDoc(doc(db,c,id), data); },
    async remove(c,id){ await deleteDoc(doc(db,c,id)); },
    async adjustAccount(id,delta){ try{ await updateDoc(doc(db,'accounts',id), { balance: increment(delta) }); }catch(e){ console.warn('adjustAccount',e&&e.code); } },
    subscribeCategories(cb){ return onSnapshot(doc(db,'config','categories'), s=>cb(s.exists()?s.data():null), e=>{ console.warn('cat',e&&e.code); cb(null); }); },
    async saveCategories(o){ await setDoc(doc(db,'config','categories'), o); }
  };
}

export const CONFIGURED = isConfigured;
export async function initStore(){ return isConfigured ? await makeFirebaseStore() : makeLocalStore(); }
