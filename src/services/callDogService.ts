/**
 * @file: callDogService.ts
 * @description: Сервис для интеграции с CallDog API для голосовых вызовов
 * @dependencies: phoneService, types
 * @created: 2025-08-13
 */

import { getAlarmPhoneNumbers } from './phoneService';

// Конфигурация CallDog API
const CALLDOG_CONFIG = {
  API_KEY: process.env.REACT_APP_CALLDOG_API_KEY || 'YOUR_API_KEY_HERE',
  BASE_URL: 'https://lk.calldog.ru/apiCalls',
  OUTGOING_PHONE: process.env.REACT_APP_CALLDOG_OUTGOING_PHONE || '+79242074048', // Номер для исходящих звонков
  TEST_PHONE: process.env.REACT_APP_CALLDOG_OUTGOING_PHONE || '+79242074048', // Тестовый номер
  RECORD_TEXT: 'ТРЕВОГА! На объекте {objectName} произошло нападение! Немедленно прибыть на место! Адрес: {objectAddress}',
  RECORD_GENDER: 0, // 0 - женский, 1 - мужской
  ANSWER_TIMEOUT: 30, // Время ожидания ответа в секундах
  SMART_DELAY: 5, // Повторный обзвон через 5 минут
  NEED_RECORDING: 1 // Записывать звонки
};

export interface AlarmCallData {
    objectName: string;
    objectAddress: string;
    message?: string;
    phones?: string[];
}

export interface CallDogResponse {
    success: boolean;
    callId?: string;
    message?: string;
    error?: string;
}

export interface CallDogCallInfo {
    id: string;
    status: string;
    phone: string;
    answer?: string;
    recordPath?: string;
    createdAt: string;
}

/**
 * Отправляет тревожный вызов через CallDog API
 * @param alarmData - данные о тревоге
 * @returns Promise<CallDogResponse> - результат отправки
 */
export async function sendAlarmCall(alarmData: AlarmCallData): Promise<CallDogResponse> {
    try {
        console.log('Отправка тревожного вызова:', alarmData);

        // Получаем номера телефонов для обзвона
        const phoneNumbers = alarmData.phones || await getAlarmPhoneNumbers();

        if (phoneNumbers.length === 0) {
            throw new Error('Нет номеров телефонов для обзвона');
        }

        // Формируем текст сообщения
        const messageText = alarmData.message || CALLDOG_CONFIG.RECORD_TEXT
            .replace('{objectName}', alarmData.objectName)
            .replace('{objectAddress}', alarmData.objectAddress);

        // Подготавливаем данные для API
        const requestData = {
            apiKey: CALLDOG_CONFIG.API_KEY,
            phones: phoneNumbers,
            outgoingPhone: CALLDOG_CONFIG.OUTGOING_PHONE,
            record: {
                text: messageText,
                gender: CALLDOG_CONFIG.RECORD_GENDER
            },
            answerTimeout: CALLDOG_CONFIG.ANSWER_TIMEOUT,
            smartDelay: CALLDOG_CONFIG.SMART_DELAY,
            needRecording: CALLDOG_CONFIG.NEED_RECORDING,
            ivrs: [
                {
                    digit: 1,
                    needBlock: 0,
                    smsText: `ТРЕВОГА! ${alarmData.objectName} - ${alarmData.objectAddress}. Немедленно прибыть!`
                },
                {
                    digit: 2,
                    needBlock: 0,
                    managerPhone: CALLDOG_CONFIG.OUTGOING_PHONE
                }
            ],
            webhookUrl: `${window.location.origin}/api/callDog/webhook`,
            webhookParameters: JSON.stringify({
                alarmId: Date.now().toString(),
                objectName: alarmData.objectName,
                objectAddress: alarmData.objectAddress
            })
        };

        console.log('Данные для CallDog API:', requestData);

        // Отправляем запрос к CallDog API
        const response = await fetch(`${CALLDOG_CONFIG.BASE_URL}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`CallDog API error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log('Ответ от CallDog API:', result);

        return {
            success: true,
            callId: result.id?.toString(),
            message: 'Тревожный вызов успешно отправлен'
        };

    } catch (error: any) {
        console.error('Ошибка отправки тревожного вызова:', error);
        return {
            success: false,
            error: error.message || 'Неизвестная ошибка при отправке вызова'
        };
    }
}

/**
 * Отправляет тестовый вызов на указанный номер
 * @param phone - номер телефона для теста
 * @param message - сообщение для теста
 * @returns Promise<CallDogResponse> - результат отправки
 */
export async function sendTestCall(phone: string, message: string = 'Тестовый вызов от системы безопасности'): Promise<CallDogResponse> {
    try {
        console.log('Отправка тестового вызова на номер:', phone);

        const requestData = {
            apiKey: CALLDOG_CONFIG.API_KEY,
            phone: phone,
            outgoingPhone: CALLDOG_CONFIG.OUTGOING_PHONE,
            record: {
                text: message,
                gender: CALLDOG_CONFIG.RECORD_GENDER
            },
            answerTimeout: CALLDOG_CONFIG.ANSWER_TIMEOUT,
            needRecording: 0 // Не записываем тестовые звонки
        };

        const response = await fetch(`${CALLDOG_CONFIG.BASE_URL}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`CallDog API error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log('Ответ от CallDog API (тест):', result);

        return {
            success: true,
            callId: result.id?.toString(),
            message: 'Тестовый вызов успешно отправлен'
        };

    } catch (error: any) {
        console.error('Ошибка отправки тестового вызова:', error);
        return {
            success: false,
            error: error.message || 'Неизвестная ошибка при отправке тестового вызова'
        };
    }
}

/**
 * Получает информацию о звонке по ID
 * @param callId - ID звонка
 * @returns Promise<CallDogCallInfo | null> - информация о звонке
 */
export async function getCallInfo(callId: string): Promise<CallDogCallInfo | null> {
    try {
        const response = await fetch(`${CALLDOG_CONFIG.BASE_URL}/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                apiKey: CALLDOG_CONFIG.API_KEY,
                id: callId
            })
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения информации о звонке: ${response.statusText}`);
        }

        const result = await response.json();
        return result;

    } catch (error: any) {
        console.error('Ошибка получения информации о звонке:', error);
        return null;
    }
}

/**
 * Проверяет статус CallDog API
 * @returns Promise<boolean> - доступен ли API
 */
export async function checkCallDogStatus(): Promise<boolean> {
    try {
        // Простой тестовый запрос для проверки доступности API
        const response = await fetch(`${CALLDOG_CONFIG.BASE_URL}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                apiKey: CALLDOG_CONFIG.API_KEY,
                phone: CALLDOG_CONFIG.TEST_PHONE,
                outgoingPhone: CALLDOG_CONFIG.OUTGOING_PHONE,
                record: {
                    text: 'Тест подключения к CallDog API',
                    gender: CALLDOG_CONFIG.RECORD_GENDER
                }
            })
        });

        return response.ok;

    } catch (error) {
        console.error('CallDog API недоступен:', error);
        return false;
    }
}

/**
 * Форматирует номер телефона для CallDog API
 * @param phone - номер телефона
 * @returns string - отформатированный номер
 */
export function formatPhoneForCallDog(phone: string): string {
    // Удаляем все символы кроме цифр
    const digits = phone.replace(/\D/g, '');

    // Если номер начинается с +7, убираем +
    if (phone.startsWith('+7') && digits.length === 11) {
        return digits;
    }

    // Если номер начинается с 8, заменяем на 7
    if (digits.startsWith('8') && digits.length === 11) {
        return '7' + digits.substring(1);
    }

    // Если номер начинается с 7, возвращаем как есть
    if (digits.startsWith('7') && digits.length === 11) {
        return digits;
    }

    // Если номер короткий, добавляем 7
    if (digits.length === 10) {
        return '7' + digits;
    }

    return digits;
}
