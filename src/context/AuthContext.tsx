/**
 * @file: AuthContext.tsx
 * @description: React Context для управления состоянием аутентификации
 * @dependencies: react, auth service
 * @created: 2025-06-27
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { authService } from '../services/auth';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { subscribeUserToPush, restorePushSubscription } from '../services/webpush';
import { cacheManager } from '../services/cache';
import LoadingIndicator from '../components/common/LoadingIndicator';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

// Ключи для localStorage
const AUTH_CACHE_KEY = 'security_pwa_auth_cache';
const AUTH_TIMESTAMP_KEY = 'security_pwa_auth_timestamp';

// Функции для работы с кэшем
const saveUserToCache = (user: User) => {
    try {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
        localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
        console.log('Пользователь сохранен в кэш');
    } catch (error) {
        console.warn('Не удалось сохранить пользователя в кэш:', error);
    }
};

const getUserFromCache = (): User | null => {
    try {
        const cachedUser = localStorage.getItem(AUTH_CACHE_KEY);
        const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);

        if (!cachedUser || !timestamp) return null;

        // Проверяем, что кэш не старше 1 часа
        const cacheAge = Date.now() - parseInt(timestamp);
        if (cacheAge > 60 * 60 * 1000) {
            console.log('Кэш пользователя устарел, очищаем');
            clearUserCache();
            return null;
        }

        const user = JSON.parse(cachedUser);
        console.log('Пользователь загружен из кэша');
        return user;
    } catch (error) {
        console.warn('Ошибка загрузки пользователя из кэша:', error);
        return null;
    }
};

const clearUserCache = () => {
    try {
        localStorage.removeItem(AUTH_CACHE_KEY);
        localStorage.removeItem(AUTH_TIMESTAMP_KEY);
        console.log('Кэш пользователя очищен');
    } catch (error) {
        console.warn('Ошибка очистки кэша:', error);
    }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [preloadingData, setPreloadingData] = useState(false);

    // Функция для получения данных пользователя из Firestore
    const getUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
        try {
            const userData = await authService.getUserData(firebaseUser.uid);
            return userData;
        } catch (error) {
            console.error('Ошибка получения данных пользователя:', error);
            return null;
        }
    };

    // Проверка состояния авторизации при загрузке
    useEffect(() => {
        const initializeAuth = async () => {
            // Сначала пытаемся загрузить из кэша для быстрого отображения
            const cachedUser = getUserFromCache();
            if (cachedUser) {
                console.log('Загружаем пользователя из кэша:', cachedUser);
                setUser(cachedUser);

                // Восстанавливаем push-подписку при запуске PWA
                try {
                    await restorePushSubscription(cachedUser.uid);
                    console.log('✅ Push-подписка восстановлена при запуске');
                } catch (error) {
                    console.warn('❌ Ошибка восстановления push-подписки:', error);
                }

                setLoading(false);
            }
        };

        initializeAuth();

        // Добавляем обработчик сообщений от service worker для принудительного выхода
        const handleServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'FORCE_LOGOUT') {
                console.log('🚪 Получено сообщение о принудительном выходе в AuthContext:', event.data);

                // Принудительно выходим из системы
                const performForceLogout = async () => {
                    try {
                        console.log('🔄 AuthContext: выполняем принудительный выход...');

                        // Очищаем все данные
                        localStorage.clear();
                        sessionStorage.clear();

                        // Выходим из Firebase Auth
                        await authService.logout();

                        // Обновляем состояние
                        setUser(null);
                        clearUserCache();

                        console.log('✅ AuthContext: принудительный выход выполнен');

                        // Перенаправляем на страницу входа
                        window.location.href = '/login';
                    } catch (error) {
                        console.error('❌ AuthContext: ошибка при принудительном выходе:', error);
                        // Fallback
                        localStorage.clear();
                        sessionStorage.clear();
                        setUser(null);
                        window.location.reload();
                    }
                };

                performForceLogout();
            }
        };

        // Подписываемся на сообщения от service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('onAuthStateChanged:', firebaseUser);
            console.log('Состояние авторизации изменилось:', firebaseUser?.uid);

            if (firebaseUser) {
                // Пользователь авторизован в Firebase
                const userData = await getUserData(firebaseUser);
                if (userData) {
                    console.log('Пользователь автоматически авторизован:', userData);
                    setUser(userData);
                    saveUserToCache(userData);

                    // Предзагрузка всех данных в зависимости от роли
                    try {
                        setPreloadingData(true);
                        console.log('🚀 Начинаем предзагрузку данных для роли:', userData.role);

                        if (userData.role === 'admin') {
                            await cacheManager.preloadAllData();
                        } else if (userData.role === 'curator') {
                            await cacheManager.getObjects();
                        } else if (userData.role === 'inspector') {
                            // Для инспекторов загружаем только объекты
                            await cacheManager.getObjects();
                        }

                        console.log('✅ Предзагрузка данных завершена');
                    } catch (cacheError) {
                        console.warn('⚠️ Ошибка предзагрузки данных:', cacheError);
                    } finally {
                        setPreloadingData(false);
                    }

                    // Подписка на push
                    try {
                        await subscribeUserToPush(userData.uid);
                        console.log('Push-подписка успешно выполнена');
                    } catch (e) {
                        console.warn('Ошибка push-подписки:', e);

                        // Проверяем тип ошибки
                        if (e.message && e.message.includes('заблокированы')) {
                            console.warn('⚠️ Разрешения на уведомления заблокированы пользователем');
                            console.warn('💡 Пользователь может разрешить уведомления в настройках браузера');
                        } else if (e.message && e.message.includes('не предоставлены')) {
                            console.warn('⚠️ Разрешения на уведомления не предоставлены');
                            console.warn('💡 Пользователь должен разрешить уведомления');
                        } else if (e.message && e.message.includes('applicationServerKey')) {
                            console.log('🔄 Обнаружен конфликт подписок, обновляем...');
                            try {
                                // Принудительно обновляем подписку
                                const registration = await navigator.serviceWorker.ready;
                                const existingSubscription = await registration.pushManager.getSubscription();
                                if (existingSubscription) {
                                    await existingSubscription.unsubscribe();
                                    console.log('✅ Старая подписка удалена');
                                }

                                // Создаем новую подписку
                                await subscribeUserToPush(userData.uid);
                                console.log('✅ Подписка успешно обновлена');
                            } catch (updateError) {
                                console.error('❌ Ошибка обновления подписки:', updateError);
                            }
                        } else {
                            console.error('❌ Неизвестная ошибка push-подписки:', e);
                        }
                    }
                } else {
                    console.log('Данные пользователя не найдены, выход из системы');
                    await authService.logout();
                    setUser(null);
                    clearUserCache();
                }
            } else {
                // Пользователь не авторизован
                console.log('Пользователь не авторизован');
                setUser(null);
                clearUserCache();
            }

            setLoading(false);
        });

        return () => {
            unsubscribe();
            // Отписываемся от сообщений service worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            }
        };
    }, []);

    const login = async (email: string, password: string) => {
        console.log('AuthContext: начало входа');
        setLoading(true);
        try {
            const userData = await authService.login(email, password);
            console.log('AuthContext: успешный вход', userData);
            setUser(userData);
            saveUserToCache(userData);

            // Предзагрузка всех данных в зависимости от роли
            try {
                setPreloadingData(true);
                console.log('🚀 Начинаем предзагрузку данных для роли:', userData.role);

                if (userData.role === 'admin') {
                    await cacheManager.preloadAllData();
                } else if (userData.role === 'curator') {
                    await cacheManager.getObjects();
                } else if (userData.role === 'inspector') {
                    // Для инспекторов загружаем только объекты
                    await cacheManager.getObjects();
                }

                console.log('✅ Предзагрузка данных завершена');
            } catch (cacheError) {
                console.warn('⚠️ Ошибка предзагрузки данных:', cacheError);
            } finally {
                setPreloadingData(false);
            }

            try {
                await subscribeUserToPush(userData.uid);
                console.log('Push-подписка успешно выполнена');
            } catch (e) {
                console.warn('Ошибка push-подписки:', e);

                // Проверяем тип ошибки
                if (e.message && e.message.includes('заблокированы')) {
                    console.warn('⚠️ Разрешения на уведомления заблокированы пользователем');
                    console.warn('💡 Пользователь может разрешить уведомления в настройках браузера');
                } else if (e.message && e.message.includes('не предоставлены')) {
                    console.warn('⚠️ Разрешения на уведомления не предоставлены');
                    console.warn('💡 Пользователь должен разрешить уведомления');
                } else if (e.message && e.message.includes('applicationServerKey')) {
                    console.log('🔄 Обнаружен конфликт подписок, обновляем...');
                    try {
                        // Принудительно обновляем подписку
                        const registration = await navigator.serviceWorker.ready;
                        const existingSubscription = await registration.pushManager.getSubscription();
                        if (existingSubscription) {
                            await existingSubscription.unsubscribe();
                            console.log('✅ Старая подписка удалена');
                        }

                        // Создаем новую подписку
                        await subscribeUserToPush(userData.uid);
                        console.log('✅ Подписка успешно обновлена');
                    } catch (updateError) {
                        console.error('❌ Ошибка обновления подписки:', updateError);
                    }
                } else {
                    console.error('❌ Неизвестная ошибка push-подписки:', e);
                }
            }
            setTimeout(() => {
                setLoading(false);
            }, 100);
        } catch (error) {
            console.error('AuthContext: ошибка входа', error);
            setLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authService.logout();
            setUser(null);
            clearUserCache();

            // Очистка кэша данных при выходе
            cacheManager.clearCache();
            cacheManager.unsubscribeAll();
            console.log('🗑️ Кэш данных очищен при выходе');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateUserCredentials = async (currentPassword: string, newPassword?: string) => {
        try {
            await authService.updateCredentials(currentPassword, newPassword);
            console.log('✅ Учетные данные успешно обновлены');
        } catch (error) {
            console.error('❌ Ошибка обновления учетных данных:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        logout,
        updateUserCredentials,
        getUserData: authService.getUserData
    };

    return (
        <AuthContext.Provider value={value}>
            {preloadingData && (
                <LoadingIndicator
                    message="Загрузка данных..."
                    fullScreen={true}
                />
            )}
            {children}
        </AuthContext.Provider>
    ) as React.ReactElement;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth должен использоваться внутри AuthProvider');
    }
    return context;
}; 