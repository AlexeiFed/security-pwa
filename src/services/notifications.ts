/**
 * @file: notifications.ts
 * @description: Сервис для работы с Push-уведомлениями
 * @dependencies: firebase, service worker
 * @created: 2025-06-27
 */

// Запрос разрешения на уведомления
export const requestNotificationPermission = async (): Promise<{ granted: boolean; reason?: string }> => {
    if (!('Notification' in window)) {
        console.log('Браузер не поддерживает уведомления');
        return { granted: false, reason: 'Браузер не поддерживает уведомления' };
    }

    if (Notification.permission === 'granted') {
        return { granted: true };
    }

    if (Notification.permission === 'denied') {
        console.log('Разрешение на уведомления отклонено');
        return { granted: false, reason: 'denied' };
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            return { granted: true };
        } else if (permission === 'denied') {
            return { granted: false, reason: 'denied' };
        } else {
            return { granted: false, reason: 'default' };
        }
    } catch (error) {
        console.error('Ошибка запроса разрешений:', error);
        return { granted: false, reason: 'error' };
    }
};

// Регистрация Service Worker для Push-уведомлений
export const registerPushNotifications = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push-уведомления не поддерживаются');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker зарегистрирован:', registration);
        return registration;
    } catch (error) {
        console.error('Ошибка регистрации Service Worker:', error);
        return null;
    }
};

// Подписка на Push-уведомления
export const subscribeToPushNotifications = async (userId?: string): Promise<PushSubscription | null> => {
    const registration = await registerPushNotifications();
    if (!registration) return null;

    const permissionResult = await requestNotificationPermission();
    if (!permissionResult.granted) return null;

    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
        });

        console.log('Подписка на Push-уведомления создана:', subscription);

        // Сохраняем подписку на сервере
        if (userId) {
            await saveSubscriptionToServer(userId, subscription);
        }

        return subscription;
    } catch (error) {
        console.error('Ошибка подписки на Push-уведомления:', error);
        return null;
    }
};

// Сохранение подписки на сервере
const saveSubscriptionToServer = async (userId: string, subscription: PushSubscription) => {
    try {
        const response = await fetch('https://push-server-b8p6.onrender.com/savePushSubscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                subscription: subscription.toJSON()
            })
        });

        if (response.ok) {
            console.log('Push-подписка сохранена на сервере');
        } else {
            console.error('Ошибка сохранения push-подписки на сервере');
        }
    } catch (error) {
        console.error('Ошибка отправки push-подписки на сервер:', error);
    }
};

// Отписка от Push-уведомлений
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        await subscription.unsubscribe();
        console.log('Отписка от Push-уведомлений выполнена');
        return true;
    }

    return false;
};

// Удаление подписки пользователя с сервера
export const removeUserSubscription = async (userId: string): Promise<boolean> => {
    try {
        const response = await fetch('https://push-server-b8p6.onrender.com/removePushSubscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
        });

        if (response.ok) {
            console.log('Push-подписка пользователя удалена с сервера');
            return true;
        } else {
            console.error('Ошибка удаления push-подписки с сервера');
            return false;
        }
    } catch (error) {
        console.error('Ошибка отправки запроса на удаление push-подписки:', error);
        return false;
    }
};

// Показ локального уведомления
export const showLocalNotification = (title: string, options: NotificationOptions = {}) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        requireInteraction: true,
        ...options
    });

    notification.onclick = () => {
        window.focus();
        notification.close();
    };

    return notification;
};

// Отправка уведомления о принудительном выходе
export const sendForceLogoutNotification = async (userId: string, message: string): Promise<boolean> => {
    try {
        const response = await fetch('https://push-server-b8p6.onrender.com/sendForceLogoutNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                message,
                type: 'force_logout'
            })
        });

        if (response.ok) {
            console.log('Уведомление о принудительном выходе отправлено');
            return true;
        } else {
            console.error('Ошибка отправки уведомления о принудительном выходе');
            return false;
        }
    } catch (error) {
        console.error('Ошибка отправки уведомления о принудительном выходе:', error);
        return false;
    }
};

// Конвертация VAPID ключа
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
} 