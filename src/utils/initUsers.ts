/**
 * @file: initUsers.ts
 * @description: Утилита для создания тестовых пользователей в Firebase
 * @dependencies: auth service
 * @created: 2025-06-27
 */

import { authService } from '../services/auth';

export const initializeTestUsers = async () => {
    console.log('Начинаем инициализацию тестовых пользователей...');

    const usersToCreate = [
        {
            email: 'admin@vityaz.com',
            password: 'admin123456',
            role: 'admin' as const,
            name: 'Администратор системы'
        },
        {
            email: 'inspector@vityaz.com',
            password: 'inspector123456',
            role: 'inspector' as const,
            name: 'Инспектор Петров И.А.'
        },
        {
            email: 'sidorov@vityaz.com',
            password: 'sidorov123456',
            role: 'inspector' as const,
            name: 'Инспектор Сидоров П.В.'
        },
        {
            email: 'kozlov@vityaz.com',
            password: 'kozlov123456',
            role: 'inspector' as const,
            name: 'Инспектор Козлов А.М.'
        },
        {
            email: 'morozov@vityaz.com',
            password: 'morozov123456',
            role: 'inspector' as const,
            name: 'Инспектор Морозов Д.С.'
        }
    ];

    const createdUsers = [];
    const errors = [];

    for (const userData of usersToCreate) {
        try {
            // Проверяем, существует ли пользователь
            const exists = await checkUserExists(userData.email);

            if (exists) {
                console.log(`Пользователь ${userData.email} уже существует, пропускаем`);
                continue;
            }

            // Создаем пользователя
            const user = await authService.createUser(
                userData.email,
                userData.password,
                userData.role,
                userData.name
            );
            console.log(`Пользователь ${userData.email} создан:`, user);
            createdUsers.push(user);

        } catch (error) {
            console.error(`Ошибка создания пользователя ${userData.email}:`, error);
            errors.push({ email: userData.email, error });
        }
    }

    console.log(`Создано пользователей: ${createdUsers.length}`);
    if (errors.length > 0) {
        console.log(`Ошибок: ${errors.length}`, errors);
    }

    return { createdUsers, errors };
};

// Функция для проверки существования пользователя
const checkUserExists = async (email: string): Promise<boolean> => {
    try {
        // Пытаемся войти с любым паролем - если пользователь не существует, получим ошибку
        await authService.login(email, 'temp_password');
        return true; // Если не выбросило ошибку, пользователь существует
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            return false; // Пользователь не существует
        }
        throw error; // Другая ошибка
    }
};

// Функция для проверки существования пользователей
export const checkUsersExist = async () => {
    console.log('Проверяем существование пользователей...');

    const testUsers = [
        { email: 'admin@vityaz.com', password: 'admin123456' },
        { email: 'inspector@vityaz.com', password: 'inspector123456' },
        { email: 'sidorov@vityaz.com', password: 'sidorov123456' },
        { email: 'kozlov@vityaz.com', password: 'kozlov123456' },
        { email: 'morozov@vityaz.com', password: 'morozov123456' }
    ];

    const existingUsers = [];
    const missingUsers = [];

    for (const userData of testUsers) {
        try {
            await authService.login(userData.email, userData.password);
            existingUsers.push(userData.email);
            console.log(`Пользователь ${userData.email} существует`);
        } catch (error) {
            missingUsers.push(userData.email);
            console.log(`Пользователь ${userData.email} не найден`);
        }
    }

    console.log(`Существующих пользователей: ${existingUsers.length}`);
    console.log(`Отсутствующих пользователей: ${missingUsers.length}`);

    return { existingUsers, missingUsers };
}; 