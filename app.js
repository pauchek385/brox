import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, get, set, update, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyAr8MamzQhhvUjZ1VIWvytRheHWjNtiRIM",
  authDomain: "spark-9e768.firebaseapp.com",
  databaseURL: "https://spark-9e768-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "spark-9e768",
  storageBucket: "spark-9e768.firebasestorage.app",
  messagingSenderId: "660066059407",
  appId: "1:660066059407:web:0d87f09259e53563555cfa"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, get, set, update, onValue, serverTimestamp };

// ========== ОНЛАЙН СТАТУС ==========
export function checkUserOnlineStatus(nick) {
  const userRef = ref(db, `users/${nick}`);
  return get(userRef).then(snap => {
    if (!snap.exists()) return 'offline';
    const data = snap.val();
    if (!data.online) return 'offline';
    
    const lastSeen = data.lastSeen || 0;
    const now = Date.now();
    const OFFLINE_TIMEOUT = 120000; // 2 минуты без heartbeat = офлайн
    
    if (now - lastSeen > OFFLINE_TIMEOUT) {
      update(userRef, { online: false, status: 'offline' });
      return 'offline';
    }
    
    return data.status || 'online';
  });
}

// Запуск heartbeat
export function startOnlineHeartbeat(nick) {
  const userRef = ref(db, `users/${nick}`);
  
  // При входе — онлайн
  update(userRef, { online: true, lastSeen: Date.now(), status: 'online' });
  
  // Heartbeat каждые 30 секунд
  const heartbeat = setInterval(() => {
    update(userRef, { lastSeen: Date.now() });
  }, 30000);
  
  // АФК через 5 минут бездействия
  let afkTimer;
  function resetAfk() {
    clearTimeout(afkTimer);
    afkTimer = setTimeout(() => update(userRef, { status: 'afk' }), 300000);
  }
  resetAfk();
  
  ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(e => {
    document.addEventListener(e, () => {
      update(userRef, { status: 'online', lastSeen: Date.now() });
      resetAfk();
    });
  });
  
  // Уход со страницы
  const OFFLINE_URL = 'https://spark-9e768-default-rtdb.europe-west1.firebasedatabase.app/users/' + nick + '.json';
  
  window.addEventListener('beforeunload', () => {
    clearInterval(heartbeat);
    clearTimeout(afkTimer);
    navigator.sendBeacon(OFFLINE_URL, JSON.stringify({ online: false, status: 'offline', lastSeen: Date.now() }));
  });
  
  window.addEventListener('pagehide', () => {
    clearInterval(heartbeat);
    clearTimeout(afkTimer);
    navigator.sendBeacon(OFFLINE_URL, JSON.stringify({ online: false, status: 'offline', lastSeen: Date.now() }));
  });
  
  return { heartbeat, afkTimer };
}