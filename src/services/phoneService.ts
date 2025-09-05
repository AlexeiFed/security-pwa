/**
 * @file: phoneService.ts
 * @description: Сервис для работы с номерами телефонов пользователей
 * @dependencies: firebase/firestore, types
 * @created: 2025-08-13
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { User, UserRole } from '../types';

export interface PhoneUser {
    uid: string;
    name: string;
    phone: string;
    role: UserRole;
    email: string;
}

/**
 * Получает всех пользователей с номерами телефонов
 * @returns Promise<PhoneUser[]> - массив пользователей с телефонами
 */
export async function getAllUsersWithPhones(): Promise<PhoneUser[]> {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        const usersWithPhones: PhoneUser[] = [];
        
        snapshot.forEach((doc) => {
            const userData = doc.data() as User;
            
            // Проверяем что у пользователя есть номер телефона
            if (userData.phone && userData.phone.trim() !== '') {
                usersWithPhones.push({
                    uid: doc.id,
                    name: userData.name,
                    phone: userData.phone,
                    role: userData.role,
                    email: userData.email
                });
            }
        });
        
        console.log(`Найдено ${usersWithPhones.length} пользователей с номерами телефонов`);
        return usersWithPhones;
        
    } catch (error) {
        console.error('Ошибка получения пользователей с телефонами:', error);
        throw new Error('Не удалось получить список пользователей с телефонами');
    }
}

/**
 * Получает пользователей определенной роли с номерами телефонов
 * @param role - роль пользователя
 * @returns Promise<PhoneUser[]> - массив пользователей с телефонами
 */
export async function getUsersByRoleWithPhones(role: UserRole): Promise<PhoneUser[]> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', role));
        const snapshot = await getDocs(q);
        
        const usersWithPhones: PhoneUser[] = [];
        
        snapshot.forEach((doc) => {
            const userData = doc.data() as User;
            
            // Проверяем что у пользователя есть номер телефона
            if (userData.phone && userData.phone.trim() !== '') {
                usersWithPhones.push({
                    uid: doc.id,
                    name: userData.name,
                    phone: userData.phone,
                    role: userData.role,
                    email: userData.email
                });
            }
        });
        
        console.log(`Найдено ${usersWithPhones.length} пользователей роли ${role} с номерами телефонов`);
        return usersWithPhones;
        
    } catch (error) {
        console.error(`Ошибка получения пользователей роли ${role} с телефонами:`, error);
        throw new Error(`Не удалось получить список пользователей роли ${role} с телефонами`);
    }
}

/**
 * Получает только номера телефонов для CallDog API
 * @param role - опциональная роль для фильтрации
 * @returns Promise<string[]> - массив номеров телефонов в формате +7XXXXXXXXXX
 */
export async function getPhoneNumbersForCallDog(role?: UserRole): Promise<string[]> {
    try {
        const users = role 
            ? await getUsersByRoleWithPhones(role)
            : await getAllUsersWithPhones();
        
        // Извлекаем только номера телефонов
        const phoneNumbers = users.map(user => user.phone);
        
        console.log(`Получено ${phoneNumbers.length} номеров телефонов для CallDog`);
        return phoneNumbers;
        
    } catch (error) {
        console.error('Ошибка получения номеров телефонов для CallDog:', error);
        throw new Error('Не удалось получить номера телефонов для CallDog');
    }
}

/**
 * Получает пользователей для тревожного вызова (все кроме админов)
 * @returns Promise<PhoneUser[]> - массив пользователей для тревожного вызова
 */
export async function getUsersForAlarmCall(): Promise<PhoneUser[]> {
    try {
        const allUsers = await getAllUsersWithPhones();
        
        // Исключаем админов из тревожного вызова
        const alarmUsers = allUsers.filter(user => user.role !== 'admin');
        
        console.log(`Получено ${alarmUsers.length} пользователей для тревожного вызова`);
        return alarmUsers;
        
    } catch (error) {
        console.error('Ошибка получения пользователей для тревожного вызова:', error);
        throw new Error('Не удалось получить пользователей для тревожного вызова');
    }
}

/**
 * Получает номера телефонов для тревожного вызова
 * @returns Promise<string[]> - массив номеров для CallDog API
 */
export async function getAlarmPhoneNumbers(): Promise<string[]> {
    try {
        const alarmUsers = await getUsersForAlarmCall();
        const phoneNumbers = alarmUsers.map(user => user.phone);
        
        console.log(`Получено ${phoneNumbers.length} номеров для тревожного вызова`);
        return phoneNumbers;
        
    } catch (error) {
        console.error('Ошибка получения номеров для тревожного вызова:', error);
        throw new Error('Не удалось получить номера для тревожного вызова');
    }
}

/**
 * Валидирует номер телефона
 * @param phone - номер телефона
 * @returns boolean - валидный ли номер
 */
export function validatePhoneNumber(phone: string): boolean {
    if (!phone) return false;
    
    // Удаляем все символы кроме цифр
    const digits = phone.replace(/\D/g, '');
    
    // Проверяем что номер содержит 11 цифр и начинается с 7
    return digits.length === 11 && digits.startsWith('7');
}

/**
 * Форматирует номер телефона для отображения
 * @param phone - номер телефона
 * @returns string - отформатированный номер
 */
export function formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';
    
    // Если номер уже в формате +7, форматируем для отображения
    if (phone.startsWith('+7') && phone.length === 12) {
        const digits = phone.substring(2);
        return `+7 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 8)}-${digits.substring(8)}`;
    }
    
    return phone;
}
