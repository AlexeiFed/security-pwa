/**
 * @file: auth.ts
 * @description: Сервис аутентификации с Firebase Auth
 * @dependencies: firebase, types
 * @created: 2025-06-27
 */

import {
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    UserCredential,
    updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole, Inspector, InspectorStatus, Curator } from '../types';

// Создание пользователя в Firestore
const createUserInFirestore = async (uid: string, userData: Omit<User, 'uid'>): Promise<User> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userToSave = {
            ...userData,
            createdAt: new Date()
        };
        await setDoc(userRef, userToSave);

        return {
            uid,
            ...userData,
            createdAt: new Date()
        };
    } catch (error) {
        console.error('Ошибка создания пользователя в Firestore:', error);
        throw error;
    }
};

// Получение пользователя из Firestore
const getUserFromFirestore = async (uid: string): Promise<User | null> => {
    try {
        console.log('getUserFromFirestore: ищем пользователя с uid', uid);
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            console.log('getUserFromFirestore: пользователь не найден');
            return null;
        }

        const data = userDoc.data();
        console.log('getUserFromFirestore: данные пользователя', data);
        return {
            uid: userDoc.id,
            email: data.email,
            role: data.role,
            name: data.name,
            createdAt: data.createdAt?.toDate() || new Date()
        };
    } catch (error) {
        console.error('Ошибка получения пользователя из Firestore:', error);
        throw error;
    }
};

// Методы для работы с инспекторами
export const getInspectors = async (): Promise<Inspector[]> => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'inspector'));
        const querySnapshot = await getDocs(q);

        const inspectors: Inspector[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            inspectors.push({
                uid: doc.id,
                email: data.email,
                role: 'inspector',
                name: data.name,
                status: data.status || 'working',
                createdAt: data.createdAt?.toDate() || new Date(),
                tasks: data.tasks || []
            });
        });

        return inspectors;
    } catch (error) {
        console.error('Ошибка получения инспекторов:', error);
        throw error;
    }
};

export const updateInspectorStatus = async (uid: string, status: InspectorStatus): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { status });
        console.log(`Статус инспектора ${uid} обновлен на ${status}`);
    } catch (error) {
        console.error('Ошибка обновления статуса инспектора:', error);
        throw error;
    }
};

export const deleteInspector = async (uid: string): Promise<void> => {
    try {
        // Удаляем пользователя из Firebase Auth через API
        try {
            const response = await fetch(`https://push-server-b8p6.onrender.com/deleteUser/${uid}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                console.log(`Инспектор ${uid} удален из Firebase Auth`);
            } else {
                console.warn('Не удалось удалить пользователя из Firebase Auth');
            }
        } catch (authError) {
            console.warn('Не удалось удалить пользователя из Firebase Auth:', authError);
        }

        // Удаляем пользователя из Firestore
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
        console.log(`Инспектор ${uid} удален из базы данных`);

        // Удаляем подписку на уведомления
        try {
            const { removeUserSubscription } = await import('./notifications');
            await removeUserSubscription(uid);
            console.log(`Подписка инспектора ${uid} удалена`);
        } catch (subscriptionError) {
            console.warn('Не удалось удалить подписку на уведомления:', subscriptionError);
        }

        // Удаляем учетные данные
        try {
            const credentialsRef = doc(db, 'user_credentials', uid);
            await deleteDoc(credentialsRef);
            console.log(`Учетные данные инспектора ${uid} удалены`);
        } catch (credentialsError) {
            console.warn('Не удалось удалить учетные данные:', credentialsError);
        }
    } catch (error) {
        console.error('Ошибка удаления инспектора:', error);
        throw error;
    }
};

export const getInspectorById = async (uid: string): Promise<Inspector | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return null;
        }

        const data = userDoc.data();
        return {
            uid: userDoc.id,
            email: data.email,
            role: 'inspector',
            name: data.name,
            status: data.status || 'working',
            createdAt: data.createdAt?.toDate() || new Date(),
            tasks: data.tasks || []
        };
    } catch (error) {
        console.error('Ошибка получения инспектора:', error);
        throw error;
    }
};

// Методы для работы с кураторами
export const getCurators = async (): Promise<Curator[]> => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'curator'));
        const querySnapshot = await getDocs(q);

        const curators: Curator[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            curators.push({
                uid: doc.id,
                email: data.email,
                role: 'curator',
                name: data.name,
                assignedObjects: data.assignedObjects || [],
                status: data.status || 'working',
                createdAt: data.createdAt?.toDate() || new Date(),
                phone: data.phone || '',
            });
        });

        return curators;
    } catch (error) {
        console.error('Ошибка получения кураторов:', error);
        throw error;
    }
};

export const updateCuratorObjects = async (uid: string, assignedObjects: string[]): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { assignedObjects });
        console.log(`Объекты куратора ${uid} обновлены`);
    } catch (error) {
        console.error('Ошибка обновления объектов куратора:', error);
        throw error;
    }
};

export const updateCuratorStatus = async (uid: string, status: InspectorStatus): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { status });
        console.log(`Статус куратора ${uid} обновлен на ${status}`);
    } catch (error) {
        console.error('Ошибка обновления статуса куратора:', error);
        throw error;
    }
};

export const getCuratorById = async (uid: string): Promise<Curator | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return null;
        }

        const data = userDoc.data();
        return {
            uid: userDoc.id,
            email: data.email,
            role: 'curator',
            name: data.name,
            assignedObjects: data.assignedObjects || [],
            status: data.status || 'working',
            createdAt: data.createdAt?.toDate() || new Date(),
            phone: data.phone || '',
            position: data.position || '',
        };
    } catch (error) {
        console.error('Ошибка получения куратора:', error);
        throw error;
    }
};

export const getCuratorCredentials = async (uid: string): Promise<{ email: string; password: string } | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return null;
        }

        const data = userDoc.data();

        // В реальном приложении пароль должен быть зашифрован
        // Здесь используем временное решение - пароль хранится в поле password
        const password = data.password || 'curator123'; // fallback пароль

        return {
            email: data.email || '',
            password: password
        };
    } catch (error) {
        console.error('Ошибка получения учетных данных куратора:', error);
        throw error;
    }
};

export const updateCuratorCredentials = async (uid: string, email: string, password: string): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);

        // Обновляем данные в Firestore
        await updateDoc(userRef, {
            email: email,
            password: password, // В реальном приложении пароль должен быть зашифрован
            updatedAt: new Date()
        });

        console.log(`Учетные данные куратора ${uid} обновлены`);
    } catch (error) {
        console.error('Ошибка обновления учетных данных куратора:', error);
        throw error;
    }
};

export const updateCuratorProfile = async (uid: string, profileData: { name: string; email: string; phone: string; position: string }): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);

        // Обновляем данные профиля в Firestore
        await updateDoc(userRef, {
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            position: profileData.position,
            updatedAt: new Date()
        });

        console.log(`Профиль куратора ${uid} обновлен`);
    } catch (error) {
        console.error('Ошибка обновления профиля куратора:', error);
        throw error;
    }
};

export const deleteCurator = async (uid: string): Promise<void> => {
    try {
        // Удаляем пользователя из Firebase Auth через API
        try {
            const response = await fetch(`https://push-server-b8p6.onrender.com/deleteUser/${uid}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                console.log(`Куратор ${uid} удален из Firebase Auth`);
            } else {
                console.warn('Не удалось удалить пользователя из Firebase Auth');
            }
        } catch (authError) {
            console.warn('Не удалось удалить пользователя из Firebase Auth:', authError);
        }

        // Удаляем пользователя из Firestore
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
        console.log(`Куратор ${uid} удален из базы данных`);

        // Удаляем подписку на уведомления
        try {
            const { removeUserSubscription } = await import('./notifications');
            await removeUserSubscription(uid);
            console.log(`Подписка куратора ${uid} удалена`);
        } catch (subscriptionError) {
            console.warn('Не удалось удалить подписку на уведомления:', subscriptionError);
        }

        // Удаляем учетные данные
        try {
            const credentialsRef = doc(db, 'user_credentials', uid);
            await deleteDoc(credentialsRef);
            console.log(`Учетные данные куратора ${uid} удалены`);
        } catch (credentialsError) {
            console.warn('Не удалось удалить учетные данные:', credentialsError);
        }
    } catch (error) {
        console.error('Ошибка удаления куратора:', error);
        throw error;
    }
};

export const getInspectorCredentials = async (uid: string): Promise<{ email: string; password: string } | null> => {
    try {
        // Получаем учетные данные из коллекции user_credentials
        const credentialsRef = doc(db, 'user_credentials', uid);
        const credentialsDoc = await getDoc(credentialsRef);

        if (!credentialsDoc.exists()) {
            // Если учетные данные не найдены, получаем email из основной коллекции
            const userRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                return null;
            }

            const userData = userDoc.data();
            return {
                email: userData.email || '',
                password: '••••••••' // Маскируем пароль если не найден
            };
        }

        const credentialsData = credentialsDoc.data();
        return {
            email: credentialsData.email || '',
            password: credentialsData.password || '••••••••'
        };
    } catch (error) {
        console.error('Ошибка получения учетных данных инспектора:', error);
        throw error;
    }
};

export const updateInspectorCredentials = async (uid: string, credentials: { email: string; password: string }): Promise<void> => {
    try {
        // Обновляем учетные данные в коллекции user_credentials
        const credentialsRef = doc(db, 'user_credentials', uid);
        await setDoc(credentialsRef, {
            email: credentials.email,
            password: credentials.password,
            updatedAt: new Date()
        }, { merge: true });

        // Также обновляем email в основной коллекции users
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            email: credentials.email,
            updatedAt: new Date()
        });

        console.log(`Учетные данные инспектора ${uid} обновлены`);
    } catch (error) {
        console.error('Ошибка обновления учетных данных инспектора:', error);
        throw error;
    }
};

export const getAdmins = async (): Promise<User[]> => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'admin'));
        const querySnapshot = await getDocs(q);
        const admins: User[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            admins.push({
                uid: doc.id,
                email: data.email,
                role: 'admin',
                name: data.name,
                createdAt: data.createdAt?.toDate() || new Date()
            });
        });
        return admins;
    } catch (error) {
        console.error('Ошибка получения админов:', error);
        throw error;
    }
};

export const authService = {
    async getUserData(uid: string): Promise<User | null> {
        return await getUserFromFirestore(uid);
    },

    async login(email: string, password: string): Promise<User> {
        console.log('Попытка входа в Firebase:', { email });

        try {
            const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            console.log('Firebase Auth успешен:', firebaseUser.uid);
            console.log('Firebase User объект:', {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
                isAnonymous: firebaseUser.isAnonymous
            });

            // Получаем данные пользователя из Firestore
            const userData = await getUserFromFirestore(firebaseUser.uid);

            if (!userData) {
                console.error('Данные пользователя не найдены в Firestore для uid:', firebaseUser.uid);
                throw new Error('Данные пользователя не найдены');
            }

            console.log('Данные пользователя получены:', userData);

            // Дополнительная проверка для продакшена
            if (process.env.NODE_ENV === 'production') {
                console.log('Продакшен режим: дополнительные проверки аутентификации');
                // Проверяем, что пользователь действительно авторизован
                if (!auth.currentUser) {
                    console.error('Пользователь не найден в auth.currentUser после входа');
                    throw new Error('Ошибка аутентификации');
                }
            }

            return userData;

        } catch (error: any) {
            console.error('Ошибка Firebase Auth:', error);

            if (error.code === 'auth/user-not-found') {
                throw new Error('Пользователь не найден');
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('Неверный пароль');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Неверный формат email');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('Слишком много попыток входа. Попробуйте позже');
            } else if (error.code === 'auth/network-request-failed') {
                throw new Error('Ошибка сети. Проверьте подключение к интернету');
            } else {
                throw new Error('Ошибка входа: ' + error.message);
            }
        }
    },

    async logout(): Promise<void> {
        console.log('Выход из Firebase');
        try {
            await signOut(auth);
            console.log('Выход успешен');
        } catch (error) {
            console.error('Ошибка выхода:', error);
            throw error;
        }
    },

    async createUser(email: string, password: string, role: UserRole, name: string): Promise<User> {
        console.log('Создание пользователя:', { email, role, name });

        try {
            const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Создаем запись в Firestore
            const userData: Omit<User, 'uid'> = {
                email: firebaseUser.email!,
                role,
                name,
                createdAt: new Date()
            };
            const user = await createUserInFirestore(firebaseUser.uid, userData);

            console.log('Пользователь создан:', user);
            return user;

        } catch (error: any) {
            console.error('Ошибка создания пользователя:', error);

            if (error.code === 'auth/email-already-in-use') {
                throw new Error('Пользователь с таким email уже существует');
            } else if (error.code === 'auth/weak-password') {
                throw new Error('Пароль слишком слабый');
            } else {
                throw new Error('Ошибка создания пользователя: ' + error.message);
            }
        }
    },

    async createUserWithoutLogin(email: string, password: string, role: UserRole, name: string): Promise<User> {
        console.log('Создание пользователя без входа в систему:', { email, role, name });

        try {
            // Сохраняем текущего пользователя
            const currentUser = auth.currentUser;

            // Создаем пользователя через Firebase Admin SDK (через Cloud Function)
            // Для этого используем обычный HTTP запрос к Cloud Function
            const response = await fetch('https://push-server-b8p6.onrender.com/createUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    role,
                    name
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка создания пользователя');
            }

            const userData = await response.json();
            console.log('Пользователь создан без входа:', userData);
            return userData;

        } catch (error: any) {
            console.error('Ошибка создания пользователя без входа:', error);

            if (error.message.includes('email-already-in-use')) {
                throw new Error('Пользователь с таким email уже существует');
            } else if (error.message.includes('weak-password')) {
                throw new Error('Пароль слишком слабый');
            } else {
                throw new Error('Ошибка создания пользователя: ' + error.message);
            }
        }
    },

    async updateCredentials(currentPassword: string, newPassword?: string): Promise<void> {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUser.email) {
                throw new Error('Пользователь не авторизован');
            }

            // Проверяем текущий пароль, пытаясь переавторизоваться
            await signInWithEmailAndPassword(auth, currentUser.email, currentPassword);

            // Если указан новый пароль, обновляем его
            if (newPassword) {
                await updatePassword(currentUser, newPassword);
                console.log('Пароль успешно обновлен');
            }

            console.log('Учетные данные успешно обновлены');
        } catch (error: any) {
            console.error('Ошибка обновления учетных данных:', error);

            if (error.code === 'auth/wrong-password') {
                throw new Error('Неверный текущий пароль');
            } else if (error.code === 'auth/weak-password') {
                throw new Error('Новый пароль слишком слабый');
            } else {
                throw new Error('Ошибка обновления учетных данных: ' + error.message);
            }
        }
    }
}; 