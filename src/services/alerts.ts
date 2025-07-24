/**
 * @file: alerts.ts
 * @description: Сервис для работы с тревогами и уведомлениями
 * @dependencies: firebase, types, alarmSound
 * @created: 2025-06-27
 */

import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Alert } from '../types';
import { playAlarm, stopAlarm } from './alarmSound';
import { showLocalNotification } from './notifications';

let activeAlertUnsubscribe: (() => void) | null = null;
let activeAlert: Alert | null = null;

// Создание новой тревоги
export const createAlert = async (alertData: Omit<Alert, 'id' | 'createdAt' | 'status'>): Promise<string> => {
    try {
        const alertToSave = {
            ...alertData,
            createdAt: Timestamp.now(),
            status: 'active'
        };

        const docRef = await addDoc(collection(db, 'alerts'), alertToSave);
        console.log('Тревога создана:', docRef.id);

        // НЕ воспроизводим звук здесь - он будет воспроизведен через подписку
        // playAlarm();

        // Показываем локальное уведомление
        showLocalNotification('ТРЕВОГА!', {
            body: `Тревога от ${alertData.userName}`,
            tag: 'alarm',
            requireInteraction: true
        });

        // Push-уведомления отправляются через Web Push API в компонентах
        // Здесь только создаем тревогу в системе

        return docRef.id;
    } catch (error) {
        console.error('Ошибка создания тревоги:', error);
        throw error;
    }
};

// Сброс активной тревоги
export const resetAlert = async (): Promise<void> => {
    try {
        if (activeAlert?.id) {
            const alertRef = doc(db, 'alerts', activeAlert.id);
            await updateDoc(alertRef, { status: 'reset' });
            console.log('Тревога сброшена');

            // Останавливаем тревожный звук
            stopAlarm();
        }
    } catch (error) {
        console.error('Ошибка сброса тревоги:', error);
        throw error;
    }
};

// Подписка на активную тревогу
export const subscribeActiveAlert = (callback: (alert: Alert | null) => void, user?: { uid: string; role: string }) => {
    // Отписываемся от предыдущей подписки
    if (activeAlertUnsubscribe) {
        activeAlertUnsubscribe();
    }

    // Подписываемся на активные тревоги
    const q = query(
        collection(db, 'alerts'),
        orderBy('createdAt', 'desc')
    );

    activeAlertUnsubscribe = onSnapshot(q, (querySnapshot) => {
        let latestActiveAlert: Alert | null = null;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const alert: Alert = {
                id: doc.id,
                type: data.type,
                userId: data.userId,
                userName: data.userName,
                objectId: data.objectId,
                objectName: data.objectName,
                description: data.description,
                coordinates: data.coordinates,
                createdAt: data.createdAt?.toDate() || new Date(),
                status: data.status,
                forRoles: data.forRoles,
                forUserIds: data.forUserIds
            };

            // Находим самую последнюю активную тревогу
            if (alert.status === 'active' && (!latestActiveAlert || alert.createdAt > latestActiveAlert.createdAt)) {
                latestActiveAlert = alert;
            }
        });

        // Фильтрация тревог по ролям и пользователям
        let shouldShow = false;
        if (latestActiveAlert) {
            if (user) {
                // Если есть фильтрация по ролям, проверяем роль пользователя
                if (latestActiveAlert.forRoles && latestActiveAlert.forRoles.length > 0) {
                    shouldShow = latestActiveAlert.forRoles.includes(user.role);
                } else if (latestActiveAlert.forUserIds && latestActiveAlert.forUserIds.length > 0) {
                    // Если есть фильтрация по пользователям, проверяем ID пользователя
                    shouldShow = latestActiveAlert.forUserIds.includes(user.uid);
                } else {
                    // Если нет фильтрации, показываем всем
                    shouldShow = true;
                }
            } else {
                // Если пользователь не передан, показываем всем
                shouldShow = true;
            }
        }

        // Воспроизводим звук только при появлении новой тревоги (но не для администраторов)
        if (!activeAlert && latestActiveAlert) {
            // Не воспроизводим звук для администраторов
            if (user && user.role !== 'admin') {
                console.log('Новая тревога получена, воспроизводим звук');
                playAlarm();
            } else {
                console.log('Новая тревога получена, звук не воспроизводится (администратор)');
            }
        } else if (activeAlert && !latestActiveAlert) {
            console.log('Тревога сброшена, останавливаем звук');
            stopAlarm();
        }

        activeAlert = latestActiveAlert;
        callback(shouldShow ? latestActiveAlert : null);
    });

    return () => {
        if (activeAlertUnsubscribe) {
            activeAlertUnsubscribe();
            activeAlertUnsubscribe = null;
        }
    };
};

// Получение всех тревог
export const getAlerts = async (): Promise<Alert[]> => {
    try {
        const q = query(
            collection(db, 'alerts'),
            orderBy('createdAt', 'desc')
        );

        return new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const alerts: Alert[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    alerts.push({
                        id: doc.id,
                        type: data.type,
                        userId: data.userId,
                        userName: data.userName,
                        objectId: data.objectId,
                        objectName: data.objectName,
                        description: data.description,
                        coordinates: data.coordinates,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        status: data.status
                    });
                });
                unsubscribe();
                resolve(alerts);
            }, reject);
        });
    } catch (error) {
        console.error('Ошибка получения тревог:', error);
        throw error;
    }
};

// Остановка тревожного звука (для ручного управления)
export const stopAlarmSound = (): void => {
    stopAlarm();
}; 