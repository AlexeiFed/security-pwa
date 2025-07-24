/**
 * @file: pushNotifications.ts
 * @description: Сервис для отправки push-уведомлений через push-server
 * @dependencies: firebase, webpush
 * @created: 2025-07-12
 */

import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

// Конфигурация push-server
const PUSH_SERVER_URL = process.env.REACT_APP_PUSH_SERVER_URL || 'https://push-server-b8p6.onrender.com';

export interface PushNotificationResult {
    success: boolean;
    message: string;
    sentCount?: number;
    errorCount?: number;
    errors?: string[];
    timestamp?: string;
}

export interface PushNotificationOptions {
    title?: string;
    body?: string;
    type?: 'alarm' | 'info' | 'warning';
    targetUsers?: string[]; // конкретные пользователи
    targetAll?: boolean; // всем пользователям
    objectId?: string; // ID объекта тревоги
    objectName?: string; // название объекта тревоги
}

/**
 * Отправка тревожного push-уведомления всем пользователям
 */
export const sendAlarmPushToAll = async (title?: string, body?: string, objectId?: string, objectName?: string): Promise<PushNotificationResult> => {
    try {
        console.log('🚨 Отправка тревожного push-уведомления всем пользователям...');

        const response = await fetch(`${PUSH_SERVER_URL}/send-alarm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'alarm',
                target: 'all',
                title,
                body,
                objectId,
                objectName
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                const errorData = await response.json();
                console.log(`⏰ Слишком частые запросы: ${errorData.message}`);
                return {
                    success: false,
                    message: errorData.message,
                    sentCount: 0,
                    errorCount: 1,
                    timestamp: new Date().toISOString()
                };
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Push-уведомление отправлено:', result);
        return result;

    } catch (error) {
        console.error('❌ Ошибка отправки push-уведомления:', error);
        return {
            success: false,
            message: `Ошибка отправки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            sentCount: 0,
            errorCount: 1,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Отправка push-уведомления конкретным пользователям
 */
export const sendPushToUsers = async (userIds: string[], title?: string, body?: string, objectId?: string, objectName?: string): Promise<PushNotificationResult> => {
    try {
        console.log('📡 Отправка push-уведомления пользователям:', userIds);

        const response = await fetch(`${PUSH_SERVER_URL}/send-alarm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'alarm',
                target: 'users',
                userIds,
                title,
                body,
                objectId,
                objectName
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                const errorData = await response.json();
                console.log(`⏰ Слишком частые запросы: ${errorData.message}`);
                return {
                    success: false,
                    message: errorData.message,
                    sentCount: 0,
                    errorCount: 1,
                    timestamp: new Date().toISOString()
                };
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Push-уведомление отправлено:', result);
        return result;

    } catch (error) {
        console.error('❌ Ошибка отправки push-уведомления:', error);
        return {
            success: false,
            message: `Ошибка отправки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            sentCount: 0,
            errorCount: 1,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Отправка push-уведомления по ролям
 */
export const sendPushByRole = async (
    role: 'admin' | 'curator' | 'inspector',
    options: PushNotificationOptions
): Promise<PushNotificationResult> => {
    try {
        console.log(`📡 Отправка push-уведомления пользователям с ролью: ${role}`);

        // Получаем пользователей с указанной ролью
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const targetUsers: string[] = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.role === role) {
                targetUsers.push(doc.id);
            }
        });

        if (targetUsers.length === 0) {
            return {
                success: false,
                message: `Пользователи с ролью ${role} не найдены`
            };
        }

        return await sendPushToUsers(targetUsers, options.title, options.body, options.objectId, options.objectName);

    } catch (error) {
        console.error('❌ Ошибка отправки push-уведомления по ролям:', error);
        return {
            success: false,
            message: `Ошибка отправки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            errors: [error instanceof Error ? error.message : 'Неизвестная ошибка']
        };
    }
};

/**
 * Проверка статуса push-server
 */
export const checkPushServerStatus = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${PUSH_SERVER_URL}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        return response.ok;
    } catch (error) {
        console.error('❌ Push-server недоступен:', error);
        return false;
    }
};

/**
 * Получение статистики подписок
 */
export const getPushSubscriptionsStats = async (): Promise<{
    total: number;
    valid: number;
    invalid: number;
}> => {
    try {
        const subscriptionsSnapshot = await getDocs(collection(db, 'push_subscriptions'));
        let valid = 0;
        let invalid = 0;

        subscriptionsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.subscription?.endpoint || data.endpoint) {
                valid++;
            } else {
                invalid++;
            }
        });

        return {
            total: subscriptionsSnapshot.size,
            valid,
            invalid
        };
    } catch (error) {
        console.error('❌ Ошибка получения статистики подписок:', error);
        return { total: 0, valid: 0, invalid: 0 };
    }
}; 