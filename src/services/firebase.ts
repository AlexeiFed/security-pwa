/**
 * @file: firebase.ts
 * @description: Конфигурация Firebase для проекта Security PWA
 * @dependencies: firebase
 * @created: 2025-06-27
 */

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Экспорт сервисов
export const auth = getAuth(app);
export const db = getFirestore(app);

// Улучшенная настройка персистентности авторизации
const initializeAuthPersistence = async () => {
    try {
        // Пытаемся установить локальную персистентность
        await setPersistence(auth, browserLocalPersistence);
        console.log('Персистентность авторизации настроена: LOCAL');
        return true;
    } catch (error) {
        console.warn('Не удалось установить локальную персистентность, пробуем сессионную:', error);
        try {
            // Fallback на сессионную персистентность
            await setPersistence(auth, browserSessionPersistence);
            console.log('Персистентность авторизации настроена: SESSION');
            return true;
        } catch (sessionError) {
            console.error('Ошибка настройки персистентности:', sessionError);
            return false;
        }
    }
};

// Инициализируем персистентность при загрузке модуля
initializeAuthPersistence();

export default app; 