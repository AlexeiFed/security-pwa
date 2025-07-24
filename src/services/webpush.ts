import { VAPID_PUBLIC_KEY } from '../webpush-config';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Ключи для localStorage
const PUSH_SUBSCRIPTION_KEY = 'push_subscription_data';
const USER_ID_KEY = 'push_user_id';

export async function subscribeUserToPush(userId: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push не поддерживается');
    }

    // Проверяем разрешения на уведомления
    if (!('Notification' in window)) {
        throw new Error('Уведомления не поддерживаются');
    }

    if (Notification.permission === 'denied') {
        throw new Error('Разрешения на уведомления заблокированы');
    }

    if (Notification.permission === 'default') {
        // Запрашиваем разрешения
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Разрешения на уведомления не предоставлены');
        }
    }

    const registration = await navigator.serviceWorker.ready;

    // Проверяем, есть ли сохраненная подписка в localStorage
    const savedSubscription = localStorage.getItem(PUSH_SUBSCRIPTION_KEY);
    const savedUserId = localStorage.getItem(USER_ID_KEY);

    if (savedSubscription && savedUserId === userId) {
        try {
            console.log('🔄 Восстанавливаем сохраненную подписку...');
            const subscriptionData = JSON.parse(savedSubscription);

            // Проверяем, что подписка все еще действительна
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription && existingSubscription.endpoint === subscriptionData.endpoint) {
                console.log('✅ Подписка уже активна, обновляем в Firestore');
                await setDoc(doc(collection(db, 'push_subscriptions'), userId), {
                    userId,
                    subscription: JSON.parse(JSON.stringify(existingSubscription)),
                    createdAt: new Date(),
                    restored: true
                });
                return existingSubscription;
            }
        } catch (error) {
            console.log('❌ Ошибка восстановления подписки:', error);
            // Продолжаем создание новой подписки
        }
    }

    // Сначала отписываемся от старых подписок
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
        console.log('🔄 Отписываемся от существующей подписки...');
        await existingSubscription.unsubscribe();
        console.log('✅ Старая подписка удалена');
    }

    // Создаем новую подписку
    console.log('📡 Создаем новую подписку...');
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log('📋 Новая подписка создана:', subscription);

    // Сохраняем подписку в localStorage для персистентности
    localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription));
    localStorage.setItem(USER_ID_KEY, userId);

    // Сохраняем подписку в Firestore
    await setDoc(doc(collection(db, 'push_subscriptions'), userId), {
        userId,
        subscription: JSON.parse(JSON.stringify(subscription)),
        createdAt: new Date(),
        persistent: true
    });

    console.log('💾 Подписка сохранена в Firestore и localStorage');
    return subscription;
}

// Функция для отписки пользователя
export async function unsubscribeUserFromPush(userId: string) {
    try {
        console.log('🔄 Отписка пользователя от push-уведомлений...');

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            console.log('✅ Подписка отменена в браузере');
        }

        // Удаляем из Firestore
        await deleteDoc(doc(collection(db, 'push_subscriptions'), userId));
        console.log('✅ Подписка удалена из Firestore');

        // Удаляем из localStorage
        localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);
        localStorage.removeItem(USER_ID_KEY);
        console.log('✅ Подписка удалена из localStorage');

    } catch (error) {
        console.error('❌ Ошибка отписки:', error);
    }
}

// Функция для восстановления подписки при запуске PWA
export async function restorePushSubscription(userId: string) {
    try {
        const savedSubscription = localStorage.getItem(PUSH_SUBSCRIPTION_KEY);
        const savedUserId = localStorage.getItem(USER_ID_KEY);

        if (savedSubscription && savedUserId === userId) {
            console.log('🔄 Восстанавливаем подписку при запуске PWA...');
            await subscribeUserToPush(userId);
        }
    } catch (error) {
        console.error('❌ Ошибка восстановления подписки:', error);
    }
}

// Вспомогательная функция для преобразования ключа
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData.split('').map(char => char.charCodeAt(0)));
} 