import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, getDocs, updateDoc,
  collection, writeBatch, query, where
} from 'firebase/firestore';

const AppContext = createContext();

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const isMockEnabled = firebaseConfig.apiKey === "YOUR_API_KEY" || !firebaseConfig.apiKey;

let auth, db;
if (!isMockEnabled) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const mockDb = {
  getDoc: (path) => {
    const data = localStorage.getItem(`aura_${path.join('/')}`);
    return { exists: () => !!data, data: () => JSON.parse(data) };
  },
  setDoc: (path, data) => {
    localStorage.setItem(`aura_${path.join('/')}`, JSON.stringify(data));
  },
  updateDoc: (path, data) => {
    const existing = JSON.parse(localStorage.getItem(`aura_${path.join('/')}`) || '{}');
    localStorage.setItem(`aura_${path.join('/')}`, JSON.stringify({ ...existing, ...data }));
  },
  getDocs: (path) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(`aura_${path.join('/')}`));
    return { docs: keys.map(k => ({ id: k.split('/').pop(), data: () => JSON.parse(localStorage.getItem(k)) })) };
  }
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('aura_theme') || 'dark');
  const [setupComplete, setSetupComplete] = useState(false);
  const [avatarGender, setAvatarGender] = useState(localStorage.getItem('aura_avatar_gender') || null);

  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ xp: 0, level: 1, streak: 1, lastActive: null });
  const [totalHours, setTotalHours] = useState(8);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem('aura_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (avatarGender) {
      localStorage.setItem('aura_avatar_gender', avatarGender);
    }
  }, [avatarGender]);

  useEffect(() => {
    if (isMockEnabled) {
      const savedUser = localStorage.getItem('aura_mock_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        setUser(u);
        syncData(u.uid);
      } else {
        setLoading(false);
      }
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); syncData(u.uid); }
      else { setUser(null); setLoading(false); }
    });
  }, []);

  const calculateStreak = (lastActive) => {
    if (!lastActive) return 1;
    const last = new Date(lastActive);
    const now = new Date();
    const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (diff === 1) return (stats.streak || 0) + 1;
    if (diff === 0) return stats.streak || 1;
    return 1;
  };

  const syncData = async (uid) => {
    try {
      let userSnap, subjectsSnap, tasksSnap;
      if (isMockEnabled) {
        userSnap = mockDb.getDoc(['artifacts', 'AuraStudy', 'users', uid]);
        subjectsSnap = mockDb.getDocs(['artifacts', 'AuraStudy', 'users', uid, 'subjects']);
        tasksSnap = mockDb.getDocs(['artifacts', 'AuraStudy', 'users', uid, 'tasks']);
      } else {
        const userRef = doc(db, 'artifacts', 'AuraStudy', 'users', uid);
        const subjectsRef = collection(db, 'artifacts', 'AuraStudy', 'users', uid, 'subjects');
        const tasksRef = collection(db, 'artifacts', 'AuraStudy', 'users', uid, 'tasks');
        [userSnap, subjectsSnap, tasksSnap] = await Promise.all([
          getDoc(userRef), getDocs(subjectsRef), getDocs(tasksRef)
        ]);
      }

      if (userSnap.exists()) {
        const data = userSnap.data();
        setSetupComplete(data.setupComplete || false);
        setTotalHours(data.totalHours || 8);
        if (data.avatarGender) setAvatarGender(data.avatarGender);

        const currentStats = data.stats || { xp: 0, level: 1, streak: 1, lastActive: new Date().toISOString() };
        const newStreak = calculateStreak(currentStats.lastActive);
        const updatedStats = { ...currentStats, streak: newStreak, lastActive: new Date().toISOString() };
        setStats(updatedStats);

        if (isMockEnabled) {
          mockDb.updateDoc(['artifacts', 'AuraStudy', 'users', uid], { stats: updatedStats });
        } else {
          updateDoc(doc(db, 'artifacts', 'AuraStudy', 'users', uid), { stats: updatedStats });
        }
      }
      setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const login = async (email, password) => {
    if (isMockEnabled) {
      const u = { uid: 'mock_user_123', email: email || 'demo@aurastudy.com' };
      localStorage.setItem('aura_mock_user', JSON.stringify(u));
      setUser(u);
      syncData(u.uid);
      return u;
    }
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  };

  const register = async (email, password) => {
    if (isMockEnabled) {
      const u = { uid: 'mock_user_123', email };
      localStorage.setItem('aura_mock_user', JSON.stringify(u));
      setUser(u);
      return u;
    }
    const res = await createUserWithEmailAndPassword(auth, email, password);
    return res.user;
  };

  const logout = async () => {
    if (isMockEnabled) {
      localStorage.removeItem('aura_mock_user');
      window.location.reload();
    } else {
      await signOut(auth);
    }
  };

  const completeSetup = async (data) => {
    if (!user) return;
    const finalData = { ...data, setupComplete: true, avatarGender };
    if (isMockEnabled) {
      mockDb.setDoc(['artifacts', 'AuraStudy', 'users', user.uid], finalData);
      if (data.subjects) {
          data.subjects.forEach(sub => {
              mockDb.setDoc(['artifacts', 'AuraStudy', 'users', user.uid, 'subjects', sub.id], sub);
          });
      }
    } else {
        const batch = writeBatch(db);
        batch.set(doc(db, 'artifacts', 'AuraStudy', 'users', user.uid), finalData);
        if (data.subjects) {
            data.subjects.forEach(sub => {
                batch.set(doc(db, 'artifacts', 'AuraStudy', 'users', user.uid, 'subjects', sub.id), sub);
            });
        }
        await batch.commit();
    }
    setSetupComplete(true);
    setSubjects(data.subjects || []);
    setTotalHours(data.totalHours || 8);
  };

  const updateSubject = async (sub) => {
      setSubjects(prev => prev.map(s => s.id === sub.id ? sub : s));
      if (isMockEnabled) {
          mockDb.updateDoc(['artifacts', 'AuraStudy', 'users', user.uid, 'subjects', sub.id], sub);
      } else {
          await updateDoc(doc(db, 'artifacts', 'AuraStudy', 'users', user.uid, 'subjects', sub.id), sub);
      }
  };

  const updateTask = async (task) => {
      setTasks(prev => {
          const exists = prev.find(t => t.id === task.id);
          return exists ? prev.map(t => t.id === task.id ? task : t) : [...prev, task];
      });
      if (isMockEnabled) {
          mockDb.setDoc(['artifacts', 'AuraStudy', 'users', user.uid, 'tasks', task.id], task);
      } else {
          await setDoc(doc(db, 'artifacts', 'AuraStudy', 'users', user.uid, 'tasks', task.id), task);
      }
  };

  const addXP = (amount) => {
      setStats(prev => {
          const newXP = prev.xp + amount;
          const updated = { ...prev, xp: newXP, level: Math.floor(newXP / 1000) + 1 };
          if (isMockEnabled) {
              mockDb.updateDoc(['artifacts', 'AuraStudy', 'users', user.uid], { stats: updated });
          } else {
              updateDoc(doc(db, 'artifacts', 'AuraStudy', 'users', user.uid), { stats: updated });
          }
          return updated;
      });
  };

  return (
    <AppContext.Provider value={{
      user, loading, theme, setTheme, setupComplete, avatarGender, setAvatarGender,
      subjects, tasks, stats, totalHours, setTotalHours,
      selectedDate, setSelectedDate,
      login, register, logout, completeSetup, updateSubject, updateTask, addXP
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
