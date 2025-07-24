/**
 * @file: tasks.ts
 * @description: Сервис для работы с заданиями в Firestore
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
    query,
    where,

    Timestamp,
    Query,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Task, TaskFilters, CreateTaskForm, TaskObject } from '../types';

// Получение всех заданий
export const getTasks = async (filters?: TaskFilters): Promise<Task[]> => {
    try {
        let q: Query = collection(db, 'tasks');

        // Применение фильтров
        if (filters?.status) {
            q = query(q, where('status', '==', filters.status));
        }

        if (filters?.inspectorId) {
            q = query(q, where('assignedTo', '==', filters.inspectorId));
        }

        if (filters?.dateFrom) {
            q = query(q, where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)));
        }

        if (filters?.dateTo) {
            q = query(q, where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)));
        }

        // Убираем orderBy, чтобы избежать необходимости составных индексов
        const querySnapshot = await getDocs(q);
        const tasks: Task[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            tasks.push({
                id: doc.id,
                title: data.title,
                description: data.description,
                status: data.status,
                assignedTo: data.assignedTo,
                assignedToName: data.assignedToName,
                createdAt: data.createdAt?.toDate() || new Date(),
                assignedAt: data.assignedAt?.toDate(),
                acceptedAt: data.acceptedAt?.toDate(),
                completedAt: data.completedAt?.toDate(),
                objects: data.objects || [],
                objectIds: data.objectIds || [],
                location: data.location
            });
        });

        // Сортируем на клиенте по дате создания (новые сначала)
        return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Ошибка при получении заданий:', error);
        throw new Error('Ошибка при получении заданий');
    }
};

// Получение задания по ID
export const getTaskById = async (id: string): Promise<Task | null> => {
    try {
        const docRef = doc(db, 'tasks', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                title: data.title,
                description: data.description,
                status: data.status,
                assignedTo: data.assignedTo,
                assignedToName: data.assignedToName,
                createdAt: data.createdAt?.toDate() || new Date(),
                assignedAt: data.assignedAt?.toDate(),
                acceptedAt: data.acceptedAt?.toDate(),
                completedAt: data.completedAt?.toDate(),
                objects: mapTaskObjects(data.objects),
                objectIds: data.objectIds || [],
                location: data.location
            };
        }

        return null;
    } catch (error) {
        console.error('Ошибка при получении задания:', error);
        throw new Error('Ошибка при получении задания');
    }
};

// Создание нового задания
export const createTask = async (taskData: CreateTaskForm): Promise<string> => {
    try {
        const newTask = {
            title: taskData.title,
            description: taskData.description,
            status: 'pending',
            assignedTo: taskData.assignedTo,
            assignedToName: taskData.assignedToName,
            createdAt: Timestamp.now(),
            assignedAt: Timestamp.now(),
            objects: taskData.objects || [],
            objectIds: taskData.objectIds || []
        };
        if (taskData.location) {
            (newTask as any).location = taskData.location;
        }

        const docRef = await addDoc(collection(db, 'tasks'), newTask);
        return docRef.id;
    } catch (error) {
        console.error('Ошибка при создании задания:', error);
        throw new Error('Ошибка при создании задания');
    }
};

// Обновление задания
export const updateTask = async (
    id: string,
    updates: Partial<Omit<Task, 'id' | 'createdAt'>>
): Promise<void> => {
    try {
        const docRef = doc(db, 'tasks', id);
        const updateData: any = { ...updates };

        // Конвертируем даты в Timestamp
        if (updates.assignedAt) {
            updateData.assignedAt = Timestamp.fromDate(updates.assignedAt);
        }
        if (updates.acceptedAt) {
            updateData.acceptedAt = Timestamp.fromDate(updates.acceptedAt);
        }
        if (updates.completedAt) {
            updateData.completedAt = Timestamp.fromDate(updates.completedAt);
        }
        // Конвертируем checkedAt у объектов
        if (updates.objects) {
            updateData.objects = updates.objects.map(obj => {
                const checkedAt = obj.checkedAt instanceof Date ? Timestamp.fromDate(obj.checkedAt) : obj.checkedAt;
                const { checkedAt: _omit, ...rest } = obj;
                return checkedAt !== undefined ? { ...rest, checkedAt } : rest;
            });
        }

        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error('Ошибка при обновлении задания:', error);
        throw new Error('Ошибка при обновлении задания');
    }
};

// Принятие задания инспектором
export const acceptTask = async (id: string): Promise<void> => {
    try {
        await updateTask(id, {
            status: 'in_progress',
            acceptedAt: new Date()
        });
    } catch (error) {
        console.error('Ошибка при принятии задания:', error);
        throw new Error('Ошибка при принятии задания');
    }
};

// Завершение задания
export const completeTask = async (id: string): Promise<void> => {
    try {
        await updateTask(id, {
            status: 'completed',
            completedAt: new Date()
        });
    } catch (error) {
        console.error('Ошибка при завершении задания:', error);
        throw new Error('Ошибка при завершении задания');
    }
};

// Отмена задания
export const cancelTask = async (id: string): Promise<void> => {
    try {
        await updateTask(id, {
            status: 'cancelled'
        });
    } catch (error) {
        console.error('Ошибка при отмене задания:', error);
        throw new Error('Ошибка при отмене задания');
    }
};

// Получение заданий инспектора
export const getInspectorTasks = async (inspectorId: string): Promise<Task[]> => {
    try {
        let q: Query = collection(db, 'tasks');
        q = query(q, where('assignedTo', '==', inspectorId));

        const querySnapshot = await getDocs(q);
        const tasks: Task[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            tasks.push({
                id: doc.id,
                title: data.title,
                description: data.description,
                status: data.status,
                assignedTo: data.assignedTo,
                assignedToName: data.assignedToName,
                createdAt: data.createdAt?.toDate() || new Date(),
                assignedAt: data.assignedAt?.toDate(),
                acceptedAt: data.acceptedAt?.toDate(),
                completedAt: data.completedAt?.toDate(),
                objects: mapTaskObjects(data.objects),
                location: data.location
            });
        });

        // Сортируем на клиенте по дате создания (новые сначала)
        return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Ошибка при получении заданий инспектора:', error);
        throw new Error('Ошибка при получении заданий инспектора');
    }
};

// Получение активных заданий
export const getActiveTasks = async (): Promise<Task[]> => {
    try {
        return await getTasks({ status: 'in_progress' });
    } catch (error) {
        console.error('Ошибка при получении активных заданий:', error);
        throw new Error('Ошибка при получении активных заданий');
    }
};

// Получение завершенных заданий
export const getCompletedTasks = async (): Promise<Task[]> => {
    try {
        return await getTasks({ status: 'completed' });
    } catch (error) {
        console.error('Ошибка при получении завершенных заданий:', error);
        throw new Error('Ошибка при получении завершенных заданий');
    }
};

// Подписка на все задания (для администратора)
export const subscribeTasks = (
    callback: (tasks: Task[]) => void,
    filters?: TaskFilters
) => {
    let q: Query = collection(db, 'tasks');

    if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
    }
    if (filters?.inspectorId) {
        q = query(q, where('assignedTo', '==', filters.inspectorId));
    }
    if (filters?.dateFrom) {
        q = query(q, where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)));
    }
    if (filters?.dateTo) {
        q = query(q, where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)));
    }

    // Подписка на изменения
    return onSnapshot(q, (querySnapshot) => {
        const tasks: Task[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            tasks.push({
                id: doc.id,
                title: data.title,
                description: data.description,
                status: data.status,
                assignedTo: data.assignedTo,
                assignedToName: data.assignedToName,
                createdAt: data.createdAt?.toDate() || new Date(),
                assignedAt: data.assignedAt?.toDate(),
                acceptedAt: data.acceptedAt?.toDate(),
                completedAt: data.completedAt?.toDate(),
                objects: mapTaskObjects(data.objects),
                objectIds: data.objectIds || [],
                location: data.location
            });
        });
        // Сортировка по дате создания (новые сначала)
        callback(tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    });
};

// При чтении заданий преобразую checkedAt обратно в Date
function mapTaskObjects(objects: any[]): TaskObject[] {
    return (objects || []).map(obj => ({
        ...obj,
        checkedAt: obj.checkedAt && typeof obj.checkedAt.toDate === 'function' ? obj.checkedAt.toDate() : obj.checkedAt
    }));
} 