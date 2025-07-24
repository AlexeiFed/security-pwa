/**
 * @file: objects.ts
 * @description: Сервис для работы с объектами в Firestore
 * @dependencies: firebase/firestore, types
 * @created: 2025-06-27
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { ObjectData, ObjectStatus } from '../types';

// Создание нового объекта
export interface CreateObjectData {
    name: string;
    address: string;
    description: string;
    position: [number, number];
    status: ObjectStatus;
}

// Получение всех объектов
export const getObjects = async (): Promise<ObjectData[]> => {
    try {
        const q = query(
            collection(db, 'objects'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const objects: ObjectData[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Сырые данные из Firestore:', data);

            // Координаты теперь сохраняются как массив [lat, lng]
            let position: [number, number] = [48.4827, 135.0840]; // Хабаровск по умолчанию
            if (data.position) {
                console.log('Позиция из Firestore:', data.position);
                if (Array.isArray(data.position) && data.position.length === 2) {
                    // Если это массив координат
                    position = [data.position[0], data.position[1]];
                    console.log('Координаты из массива:', position);
                } else if (data.position._lat && data.position._lng) {
                    // Если это GeoPoint (для обратной совместимости)
                    position = [data.position._lat, data.position._lng];
                    console.log('Координаты из GeoPoint:', position);
                }
            } else {
                console.log('Позиция не найдена, используем координаты по умолчанию');
            }

            const object: ObjectData = {
                id: doc.id,
                name: data.name || '',
                address: data.address || '',
                description: data.description || '',
                position,
                status: data.status || 'active',
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };

            objects.push(object);
        });

        return objects;
    } catch (error) {
        console.error('Ошибка при получении объектов:', error);
        throw new Error('Ошибка при получении объектов');
    }
};

// Получение объекта по ID
export const getObjectById = async (id: string): Promise<ObjectData | null> => {
    try {
        const docRef = doc(db, 'objects', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Преобразуем GeoPoint в массив координат
            let position: [number, number] = [48.4827, 135.0840];
            if (data.position) {
                if (data.position._lat && data.position._lng) {
                    position = [data.position._lat, data.position._lng];
                } else if (Array.isArray(data.position) && data.position.length === 2) {
                    position = [data.position[0], data.position[1]];
                }
            }

            const object: ObjectData = {
                id: docSnap.id,
                name: data.name || '',
                address: data.address || '',
                description: data.description || '',
                position,
                status: data.status || 'active',
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };

            return object;
        }

        return null;
    } catch (error) {
        console.error('Ошибка при получении объекта:', error);
        throw new Error('Ошибка при получении объекта');
    }
};

// Создание нового объекта
export const createObject = async (objectData: CreateObjectData): Promise<string> => {
    try {
        console.log('Создаем объект с данными:', objectData);

        // Сохраняем координаты как массив чисел, а не GeoPoint
        const docData = {
            name: objectData.name,
            address: objectData.address,
            description: objectData.description,
            position: objectData.position, // Сохраняем как [lat, lng]
            status: objectData.status,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        console.log('Данные для сохранения в Firestore:', docData);

        const docRef = await addDoc(collection(db, 'objects'), docData);
        console.log('Объект сохранен с ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Ошибка при создании объекта:', error);
        throw new Error('Ошибка при создании объекта');
    }
};

// Обновление объекта
export const updateObject = async (id: string, updates: Partial<CreateObjectData>): Promise<void> => {
    try {
        const docRef = doc(db, 'objects', id);
        const updateData: any = {
            ...updates,
            updatedAt: Timestamp.now()
        };

        // Координаты сохраняем как массив, не преобразуем в GeoPoint
        console.log('Обновляем объект:', updateData);

        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error('Ошибка при обновлении объекта:', error);
        throw new Error('Ошибка при обновлении объекта');
    }
};

// Удаление объекта
export const deleteObject = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, 'objects', id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Ошибка при удалении объекта:', error);
        throw new Error('Ошибка при удалении объекта');
    }
};

// Получение объектов по статусу
export const getObjectsByStatus = async (status: ObjectStatus): Promise<ObjectData[]> => {
    try {
        const q = query(
            collection(db, 'objects'),
            where('status', '==', status)
            // Убираем orderBy для избежания необходимости составного индекса
        );

        const querySnapshot = await getDocs(q);
        const objects: ObjectData[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let position: [number, number] = [48.4827, 135.0840];
            if (data.position) {
                if (Array.isArray(data.position) && data.position.length === 2) {
                    position = [data.position[0], data.position[1]];
                } else if (data.position._lat && data.position._lng) {
                    position = [data.position._lat, data.position._lng];
                }
            }

            const object: ObjectData = {
                id: doc.id,
                name: data.name || '',
                address: data.address || '',
                description: data.description || '',
                position,
                status: data.status || 'active',
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };

            objects.push(object);
        });

        // Сортируем на клиенте по дате создания
        return objects.sort((a, b) => {
            const dateA = a.createdAt || new Date(0);
            const dateB = b.createdAt || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    } catch (error) {
        console.error('Ошибка при получении объектов по статусу:', error);
        throw new Error('Ошибка при получении объектов по статусу');
    }
};

// Получение только активных объектов (для заданий)
export const getActiveObjects = async (): Promise<ObjectData[]> => {
    return await getObjectsByStatus('active');
};

// Получение свободных объектов (не назначенных кураторам)
export const getAvailableObjects = async (): Promise<ObjectData[]> => {
    try {
        // Получаем всех кураторов
        const { getCurators } = await import('./auth');
        const curators = await getCurators();

        // Собираем все назначенные объекты
        const assignedObjectIds = new Set<string>();
        curators.forEach(curator => {
            curator.assignedObjects.forEach(objectId => {
                assignedObjectIds.add(objectId);
            });
        });

        // Получаем все объекты
        const allObjects = await getObjects();

        // Фильтруем только свободные объекты
        const availableObjects = allObjects.filter(obj =>
            !assignedObjectIds.has(obj.id) && obj.status === 'active'
        );

        console.log('📊 Свободные объекты:', {
            totalObjects: allObjects.length,
            assignedObjects: assignedObjectIds.size,
            availableObjects: availableObjects.length
        });

        return availableObjects;
    } catch (error) {
        console.error('Ошибка при получении свободных объектов:', error);
        throw new Error('Ошибка при получении свободных объектов');
    }
}; 