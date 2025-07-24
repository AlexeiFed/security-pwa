/**
 * @file: oneSignal.ts
 * @description: Сервис для работы с OneSignal push-уведомлениями
 * @dependencies: react-onesignal
 * @created: 2025-06-27
 */

// OneSignal App ID (замените на ваш)
const ONESIGNAL_APP_ID = 'd0129f89-d19e-4587-ae17-30df11c2ec5d';

// OneSignal REST API Key
const ONESIGNAL_REST_API_KEY = 'os_v2_app_2ajj7cortzcyplqxgdprdqxmluqpxfh54bdecl4zaudgxlye26loozgulpyqvndhubeascngulm3uqj2iiqne47azzl3ecu76whmwwi';

// Динамическая загрузка OneSignal SDK
let OneSignal: any = null;
let oneSignalSDKLoading: Promise<any> | null = null;

const loadOneSignalSDK = async () => {
    if (OneSignal) return OneSignal;
    if (oneSignalSDKLoading) return oneSignalSDKLoading;

    oneSignalSDKLoading = new Promise((resolve, reject) => {
        if (window.OneSignal) {
            OneSignal = window.OneSignal;
            console.log('window.OneSignal при загрузке:', window.OneSignal);
            resolve(OneSignal);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            OneSignal = window.OneSignal;
            console.log('window.OneSignal после загрузки:', window.OneSignal);
            resolve(OneSignal);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
    return oneSignalSDKLoading;
};

// Инициализация OneSignal (push-стиль)
export const initializeOneSignal = async () => {
    try {
        console.log('🚀 Начинаем инициализацию OneSignal...');

        // Проверяем поддержку Service Worker
        if (!('serviceWorker' in navigator)) {
            console.error('❌ Service Worker не поддерживается в этом браузере');
            return false;
        }

        // Проверяем поддержку Push API
        if (!('PushManager' in window)) {
            console.error('❌ Push API не поддерживается в этом браузере');
            return false;
        }

        // Регистрируем наш Service Worker
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            console.log('✅ Service Worker зарегистрирован:', registration);
        } catch (error) {
            console.error('❌ Ошибка регистрации Service Worker:', error);
        }

        if (!window.OneSignal) {
            window.OneSignal = [];
        }

        window.OneSignal.push(function () {
            window.OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                allowLocalhostAsSecureOrigin: true,
                autoRegister: true,
                autoResubscribe: true,
                notifyButton: {
                    enable: false,
                },
                welcomeNotification: {
                    disable: true,
                },
                // Важно: указываем наш Service Worker
                serviceWorkerParam: {
                    scope: '/',
                },
                serviceWorkerPath: '/service-worker.js',
                // Добавляем настройки для push-уведомлений
                subdomainName: undefined, // Убираем subdomain для web push
            });
        });

        // Ждём события initialized
        await new Promise((resolve) => {
            window.OneSignal.push(function () {
                window.OneSignal.on('initialized', () => {
                    console.log('✅ OneSignal инициализирован успешно');
                    resolve(true);
                });
            });
        });

        // Проверяем состояние подписки после инициализации
        await checkSubscriptionStatus();

        console.log('✅ OneSignal инициализирован (push-стиль)');
        return true;
    } catch (error) {
        console.error('❌ Ошибка инициализации OneSignal:', error);
        return false;
    }
};

// Проверка состояния подписки
const checkSubscriptionStatus = async () => {
    try {
        window.OneSignal.push(function () {
            window.OneSignal.isPushNotificationsEnabled((isEnabled: boolean) => {
                console.log('📱 Push-уведомления включены:', isEnabled);

                if (isEnabled) {
                    window.OneSignal.getUserId((userId: string) => {
                        console.log('🆔 OneSignal User ID:', userId);
                    });

                    window.OneSignal.getRegistrationId((registrationId: string) => {
                        console.log('📋 OneSignal Registration ID:', registrationId);
                    });
                } else {
                    console.log('⚠️ Push-уведомления отключены - запрашиваем разрешение');
                    window.OneSignal.registerForPushNotifications();
                }
            });
        });
    } catch (error) {
        console.error('❌ Ошибка проверки состояния подписки:', error);
    }
};

// Принудительное обновление подписки
export const forceRefreshSubscription = async (): Promise<boolean> => {
    try {
        console.log('🔄 Принудительное обновление подписки OneSignal...');

        window.OneSignal.push(function () {
            // Отписываемся и подписываемся заново
            window.OneSignal.setSubscription(false);

            setTimeout(() => {
                window.OneSignal.setSubscription(true);
                console.log('✅ Подписка обновлена');
            }, 1000);
        });

        return true;
    } catch (error) {
        console.error('❌ Ошибка обновления подписки:', error);
        return false;
    }
};

// Диагностика OneSignal
export const diagnoseOneSignal = async () => {
    try {
        console.log('🔍 Диагностика OneSignal...');

        const results = {
            serviceWorker: false,
            pushManager: false,
            oneSignalLoaded: false,
            subscriptionEnabled: false,
            userId: null,
            registrationId: null
        };

        // Проверяем Service Worker
        if ('serviceWorker' in navigator) {
            results.serviceWorker = true;
            console.log('✅ Service Worker поддерживается');
        } else {
            console.log('❌ Service Worker не поддерживается');
        }

        // Проверяем Push API
        if ('PushManager' in window) {
            results.pushManager = true;
            console.log('✅ Push API поддерживается');
        } else {
            console.log('❌ Push API не поддерживается');
        }

        // Проверяем OneSignal
        if (window.OneSignal) {
            results.oneSignalLoaded = true;
            console.log('✅ OneSignal загружен');

            window.OneSignal.push(function () {
                window.OneSignal.isPushNotificationsEnabled((isEnabled: boolean) => {
                    results.subscriptionEnabled = isEnabled;
                    console.log('📱 Подписка активна:', isEnabled);

                    if (isEnabled) {
                        window.OneSignal.getUserId((userId: string) => {
                            results.userId = userId;
                            console.log('🆔 User ID:', userId);
                        });

                        window.OneSignal.getRegistrationId((registrationId: string) => {
                            results.registrationId = registrationId;
                            console.log('📋 Registration ID:', registrationId);
                        });
                    }
                });
            });
        } else {
            console.log('❌ OneSignal не загружен');
        }

        return results;
    } catch (error) {
        console.error('❌ Ошибка диагностики:', error);
        return null;
    }
};

// Вспомогательная функция для безопасного вызова методов после инициализации
const withOneSignal = (cb: (OneSignal: any) => void) => {
    if (!window.OneSignal) window.OneSignal = [];
    window.OneSignal.push(function () {
        cb(window.OneSignal);
    });
};

// Запрос разрешения на уведомления
export const requestNotificationPermission = async (): Promise<boolean> => {
    try {
        console.log('🔔 Запрос разрешения на уведомления...');

        const OneSignalSDK = await loadOneSignalSDK();
        if (!OneSignalSDK) {
            console.error('❌ OneSignal SDK не загружен');
            return false;
        }

        const permission = await OneSignalSDK.Notifications.requestPermission();
        console.log('📱 Результат запроса разрешения:', permission);

        // Проверяем текущее состояние разрешений
        const permissionState = await OneSignalSDK.Notifications.permission;
        console.log('📱 Текущее состояние разрешений:', permissionState);

        return permission;
    } catch (error) {
        console.error('❌ Ошибка запроса разрешения на уведомления:', error);
        return false;
    }
};

// Подписка на уведомления
export const subscribeToNotifications = async (): Promise<boolean> => {
    try {
        console.log('📡 Настройка подписки на уведомления...');

        const OneSignalSDK = await loadOneSignalSDK();
        if (!OneSignalSDK) {
            console.error('❌ OneSignal SDK не загружен');
            return false;
        }

        await OneSignalSDK.Notifications.setDefaultUrl('/');
        await OneSignalSDK.User.PushSubscription.optIn();

        // Проверяем состояние подписки
        const isSubscribed = await OneSignalSDK.User.PushSubscription.optedIn;
        console.log('📡 Состояние подписки:', isSubscribed);

        // Получаем Player ID
        const playerId = await OneSignalSDK.User.PushSubscription.id;
        console.log('🆔 Player ID:', playerId);

        if (!playerId) {
            console.error('❌ Player ID не получен - подписка не активна');
            return false;
        }

        console.log('✅ Подписка на уведомления активирована');
        return true;
    } catch (error) {
        console.error('❌ Ошибка подписки на уведомления:', error);
        return false;
    }
};

// Отписка от уведомления
export const unsubscribeFromNotifications = async (): Promise<boolean> => {
    try {
        const OneSignalSDK = await loadOneSignalSDK();
        if (!OneSignalSDK) return false;

        await OneSignalSDK.User.PushSubscription.optOut();
        console.log('📡 Отписка от уведомлений выполнена');
        return true;
    } catch (error) {
        console.error('❌ Ошибка отписки от уведомлений:', error);
        return false;
    }
};

// Отправка уведомления всем подписчикам (через OneSignal REST API)
export const sendNotificationToAll = async (title: string, message: string, data?: any) => {
    try {
        console.log('📤 Отправка push-уведомления всем пользователям:', { title, message, data });

        const requestBody = {
            app_id: ONESIGNAL_APP_ID,
            included_segments: ['All'],
            headings: { en: title },
            contents: { en: message },
            data: data || {},
            url: '/',
            chrome_web_icon: '/logo192.png',
            chrome_web_badge: '/logo192.png',
            // Добавляем звук для тревожных уведомлений
            chrome_web_sound: data?.type === 'alarm' ? '/alarm.mp3' : undefined,
            // Настройки для тревожных уведомлений
            priority: data?.type === 'alarm' ? 10 : 5,
            require_interaction: data?.type === 'alarm' ? true : false,
        };

        console.log('📤 Отправляем в OneSignal:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        console.log('📤 Ответ OneSignal:', response.status, responseText);

        if (response.ok) {
            console.log('✅ Уведомление отправлено всем подписчикам');
            return true;
        } else {
            console.error('❌ Ошибка отправки уведомления:', response.statusText);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка отправки уведомления:', error);
        return false;
    }
};

// Отправка уведомления конкретным пользователям
export const sendNotificationToUsers = async (
    userIds: string[],
    title: string,
    message: string,
    data?: any
) => {
    try {
        console.log('Отправка уведомления пользователям:', { userIds, title, message });

        // Пробуем отправить через внешние ID пользователей
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_external_user_ids: userIds,
                headings: { en: title },
                contents: { en: message },
                data: data || {},
                url: '/',
                chrome_web_icon: '/logo192.png',
                chrome_web_badge: '/logo192.png',
                // Добавляем звук для тревожных уведомлений
                chrome_web_sound: data?.type === 'alarm' ? '/alarm.mp3' : undefined,
                // Настройки для тревожных уведомлений
                priority: data?.type === 'alarm' ? 10 : 5,
                require_interaction: data?.type === 'alarm' ? true : false,
            }),
        });

        const responseText = await response.text();
        console.log('Ответ OneSignal (внешние ID):', response.status, responseText);

        if (response.ok) {
            console.log(`Уведомление отправлено ${userIds.length} пользователям через внешние ID`);
            return true;
        } else {
            console.error('Ошибка отправки уведомления через внешние ID:', response.status, responseText);

            // Если не получилось через внешние ID, пробуем отправить всем
            console.log('Пробуем отправить уведомление всем пользователям...');
            return await sendNotificationToAll(title, message, data);
        }
    } catch (error) {
        console.error('Ошибка отправки уведомления:', error);
        return false;
    }
};

// Установка внешнего ID пользователя (push-стиль)
export const setExternalUserId = async (userId: string) => {
    try {
        return await new Promise((resolve) => {
            withOneSignal((OneSignal) => {
                console.log('OneSignal.User:', OneSignal.User);
                if (OneSignal.User && typeof OneSignal.User.login === 'function') {
                    OneSignal.User.login(userId).then(() => {
                        console.log(`Внешний ID пользователя установлен (v16): ${userId}`);
                        resolve(true);
                    }).catch((e: any) => {
                        console.error('Ошибка login:', e);
                        resolve(false);
                    });
                } else if (OneSignal.User && OneSignal.User.Login && typeof OneSignal.User.Login.set === 'function') {
                    OneSignal.User.Login.set({ id: userId }).then(() => {
                        console.log(`Внешний ID пользователя установлен (fallback): ${userId}`);
                        resolve(true);
                    }).catch((e: any) => {
                        console.error('Ошибка Login.set:', e);
                        resolve(false);
                    });
                } else {
                    console.error('OneSignal: метод User.login/set не найден');
                    resolve(false);
                }
            });
        });
    } catch (error) {
        console.error('Ошибка установки внешнего ID пользователя (v16):', error);
        return false;
    }
};

// Получение состояния подписки
export const getSubscriptionState = async () => {
    try {
        const OneSignalSDK = await loadOneSignalSDK();
        if (!OneSignalSDK) return false;

        const isSubscribed = await OneSignalSDK.User.PushSubscription.optedIn;
        return isSubscribed;
    } catch (error) {
        console.error('Ошибка получения состояния подписки:', error);
        return false;
    }
};

// Получение Player ID пользователя
export const getPlayerId = async (): Promise<string | null> => {
    try {
        const OneSignalSDK = await loadOneSignalSDK();
        if (!OneSignalSDK) return null;

        const playerId = await OneSignalSDK.User.PushSubscription.id;
        console.log('Player ID получен:', playerId);
        return playerId;
    } catch (error) {
        console.error('Ошибка получения Player ID:', error);
        return null;
    }
};

// Получение внешнего ID пользователя
export const getExternalUserId = async (): Promise<string | null> => {
    try {
        const OneSignalSDK = await loadOneSignalSDK();
        if (!OneSignalSDK) return null;

        const externalUserId = await OneSignalSDK.User.PushSubscription.externalUserId;
        console.log('Внешний ID пользователя:', externalUserId);
        return externalUserId;
    } catch (error) {
        console.error('Ошибка получения внешнего ID пользователя:', error);
        return null;
    }
};

// Проверка состояния OneSignal
export const checkOneSignalStatus = async () => {
    try {
        console.log('🔍 Проверка состояния OneSignal...');

        const OneSignalSDK = await loadOneSignalSDK();
        if (!OneSignalSDK) {
            console.error('❌ OneSignal SDK не загружен');
            return false;
        }

        const isSubscribed = await OneSignalSDK.User.PushSubscription.optedIn;
        const playerId = await OneSignalSDK.User.PushSubscription.id;
        const externalUserId = await OneSignalSDK.User.PushSubscription.externalUserId;
        const permission = await OneSignalSDK.Notifications.permission;

        console.log('📊 === OneSignal Status ===');
        console.log('📡 Подписка активна:', isSubscribed);
        console.log('🆔 Player ID:', playerId ? `${playerId.substring(0, 8)}...` : 'null');
        console.log('👤 Внешний ID:', externalUserId);
        console.log('🔔 Разрешение на уведомления:', permission);
        console.log('========================');

        if (isSubscribed && playerId) {
            console.log('✅ OneSignal готов к отправке push-уведомлений');
            return true;
        } else {
            console.error('❌ OneSignal не готов: подписка или Player ID отсутствуют');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка проверки состояния OneSignal:', error);
        return false;
    }
}; 