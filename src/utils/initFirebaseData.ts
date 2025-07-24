/**
 * @file: initFirebaseData.ts
 * @description: Утилита для инициализации тестовых данных в Firebase
 * @dependencies: firebase/firestore, services
 * @created: 2025-06-27
 */

import { collection, addDoc, GeoPoint, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SecurityObject, Task } from '../types';

// Тестовые объекты
const testObjects: Omit<SecurityObject, 'id'>[] = [
    {
        name: 'Офисное здание №1',
        address: 'ул. Ленина, 15',
        city: 'Хабаровск',
        coordinates: { lat: 48.4827, lng: 135.0840 },
        type: 'office',
        securityLevel: 'high',
        status: 'active',
        description: 'Главный офис компании',
        contactPerson: {
            name: 'Иванов И.И.',
            phone: '+7 (4212) 123-45-67',
            email: 'ivanov@company.com'
        }
    },
    {
        name: 'Торговый центр "Гранд"',
        address: 'ул. Муравьева-Амурского, 10',
        city: 'Хабаровск',
        coordinates: { lat: 48.4850, lng: 135.0820 },
        type: 'retail',
        securityLevel: 'medium',
        status: 'active',
        description: 'Крупный торговый центр',
        contactPerson: {
            name: 'Петров П.П.',
            phone: '+7 (4212) 234-56-78',
            email: 'petrov@tc-grand.ru'
        }
    },
    {
        name: 'Склад №1',
        address: 'ул. Промышленная, 5',
        city: 'Хабаровск',
        coordinates: { lat: 48.4800, lng: 135.0900 },
        type: 'warehouse',
        securityLevel: 'low',
        status: 'active',
        description: 'Складское помещение',
        contactPerson: {
            name: 'Сидоров С.С.',
            phone: '+7 (4212) 345-67-89',
            email: 'sidorov@warehouse.ru'
        }
    },
    {
        name: 'Жилой комплекс "Амур"',
        address: 'ул. Дзержинского, 45',
        city: 'Хабаровск',
        coordinates: { lat: 48.4830, lng: 135.0860 },
        type: 'residential',
        securityLevel: 'medium',
        status: 'active',
        description: 'Многоквартирный жилой дом',
        contactPerson: {
            name: 'Козлов К.К.',
            phone: '+7 (4212) 456-78-90',
            email: 'kozlov@zhk-amur.ru'
        }
    },
    {
        name: 'Завод "Дальмаш"',
        address: 'ул. Промышленная, 25',
        city: 'Хабаровск',
        coordinates: { lat: 48.4780, lng: 135.0920 },
        type: 'industrial',
        securityLevel: 'high',
        status: 'active',
        description: 'Промышленное предприятие',
        contactPerson: {
            name: 'Морозов М.М.',
            phone: '+7 (4212) 567-89-01',
            email: 'morozov@dalmasch.ru'
        }
    }
];

// Тестовые задания
const testTasks: Omit<Task, 'id'>[] = [
    {
        title: 'Проверка офисных зданий в центре',
        description: 'Провести проверку безопасности в офисных зданиях в центре Хабаровска',
        status: 'pending',
        assignedTo: 'inspector1',
        assignedToName: 'Петров И.А.',
        createdAt: new Date('2025-06-27T09:00:00'),
        assignedAt: new Date('2025-06-27T09:30:00'),
        objects: [
            {
                id: 'obj1',
                name: 'Офисное здание №1',
                address: 'ул. Ленина, 15, Хабаровск',
                status: 'pending'
            },
            {
                id: 'obj2',
                name: 'Торговый центр "Гранд"',
                address: 'ул. Муравьева-Амурского, 10, Хабаровск',
                status: 'pending'
            }
        ]
    },
    {
        title: 'Проверка торговых центров',
        description: 'Проверить системы безопасности в торговых центрах',
        status: 'in_progress',
        assignedTo: 'inspector2',
        assignedToName: 'Сидоров П.В.',
        createdAt: new Date('2025-06-26T14:00:00'),
        assignedAt: new Date('2025-06-26T14:15:00'),
        acceptedAt: new Date('2025-06-26T15:00:00'),
        objects: [
            {
                id: 'obj3',
                name: 'Склад №1',
                address: 'ул. Промышленная, 5, Хабаровск',
                status: 'checked',
                checkedAt: new Date('2025-06-27T10:30:00'),
                comments: 'Система работает корректно'
            },
            {
                id: 'obj4',
                name: 'Жилой комплекс "Амур"',
                address: 'ул. Дзержинского, 45, Хабаровск',
                status: 'pending'
            }
        ]
    }
];

// Инициализация объектов
export const initObjects = async (): Promise<void> => {
    try {
        console.log('Инициализация объектов...');

        for (const obj of testObjects) {
            const objectData = {
                name: obj.name,
                address: obj.address,
                city: obj.city,
                coordinates: new GeoPoint(obj.coordinates.lat, obj.coordinates.lng),
                type: obj.type,
                securityLevel: obj.securityLevel,
                status: obj.status,
                description: obj.description,
                contactPerson: obj.contactPerson,
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            await addDoc(collection(db, 'objects'), objectData);
            console.log(`Объект "${obj.name}" добавлен`);
        }

        console.log('Инициализация объектов завершена');
    } catch (error) {
        console.error('Ошибка инициализации объектов:', error);
        throw error;
    }
};

// Инициализация заданий
export const initTasks = async (): Promise<void> => {
    try {
        console.log('Инициализация заданий...');

        for (const task of testTasks) {
            const taskData = {
                title: task.title,
                description: task.description,
                status: task.status,
                assignedTo: task.assignedTo,
                assignedToName: task.assignedToName,
                createdAt: Timestamp.fromDate(task.createdAt),
                assignedAt: Timestamp.fromDate(task.assignedAt),
                acceptedAt: task.acceptedAt ? Timestamp.fromDate(task.acceptedAt) : null,
                completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : null,
                objects: task.objects,
                location: task.location
            };

            await addDoc(collection(db, 'tasks'), taskData);
            console.log(`Задание "${task.title}" добавлено`);
        }

        console.log('Инициализация заданий завершена');
    } catch (error) {
        console.error('Ошибка инициализации заданий:', error);
        throw error;
    }
};

// Полная инициализация всех данных
export const initAllData = async (): Promise<void> => {
    try {
        console.log('Начало инициализации всех данных...');

        await initObjects();
        await initTasks();

        console.log('Инициализация всех данных завершена успешно');
    } catch (error) {
        console.error('Ошибка инициализации данных:', error);
        throw error;
    }
}; 