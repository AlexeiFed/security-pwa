/**
 * @file: cache.ts
 * @description: Система кэширования данных для улучшения производительности
 * @dependencies: firebase, auth, objects, tasks
 * @created: 2025-07-20
 */

import { db } from './firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ObjectData, Task, Curator, Inspector, Guard } from '../types';
import { getObjects } from './objects';
import { getCurators, getGuards } from './auth';
import { getInspectors } from './auth';

// Константы для localStorage
const STORAGE_KEY = 'security_pwa_cache';
const STORAGE_VERSION = '1.0';

// Кэш для данных
interface AppCache {
    objects: ObjectData[];
    tasks: Task[];
    curators: Curator[];
    inspectors: Inspector[];
    guards: Guard[];
    lastUpdated: {
        objects: number;
        tasks: number;
        curators: number;
        inspectors: number;
        guards: number;
    };
}

// Время жизни кэша (10 минут для localStorage, 5 минут для памяти)
const CACHE_TTL = 5 * 60 * 1000;
const STORAGE_CACHE_TTL = 10 * 60 * 1000;

class CacheManager {
    private cache: AppCache = {
        objects: [],
        tasks: [],
        curators: [],
        inspectors: [],
        guards: [],
        lastUpdated: {
            objects: 0,
            tasks: 0,
            curators: 0,
            inspectors: 0,
            guards: 0,
        }
    };

    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    private listeners: {
        objects: (() => void) | null;
        tasks: (() => void) | null;
        curators: (() => void) | null;
        inspectors: (() => void) | null;
        guards: (() => void) | null;
    } = {
            objects: null,
            tasks: null,
            curators: null,
            inspectors: null,
            guards: null
        };

    // Инициализация кэша из localStorage
    private async initializeCache(): Promise<void> {
        if (this.isInitialized) return;

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.loadFromStorage();
        await this.initializationPromise;
        this.isInitialized = true;
    }

    // Загрузка кэша из localStorage
    private async loadFromStorage(): Promise<void> {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;

            const data = JSON.parse(stored);
            if (data.version !== STORAGE_VERSION) {
                console.log('🔄 Версия кэша устарела, очищаем localStorage');
                localStorage.removeItem(STORAGE_KEY);
                return;
            }

            const now = Date.now();
            let hasValidData = false;

            // Проверяем актуальность данных
            Object.keys(data.cache.lastUpdated).forEach(key => {
                const type = key as keyof AppCache['lastUpdated'];
                const age = now - data.cache.lastUpdated[type];
                if (age < STORAGE_CACHE_TTL && data.cache[type]?.length > 0) {
                    this.cache[type] = data.cache[type];
                    this.cache.lastUpdated[type] = data.cache.lastUpdated[type];
                    hasValidData = true;
                    console.log(`📦 Загружен кэш из localStorage: ${type} (${data.cache[type].length} записей)`);
                }
            });

            if (hasValidData) {
                console.log('✅ Кэш успешно загружен из localStorage');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки кэша из localStorage:', error);
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    // Сохранение кэша в localStorage
    private saveToStorage(): void {
        try {
            const data = {
                version: STORAGE_VERSION,
                timestamp: Date.now(),
                cache: this.cache
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('💾 Кэш сохранен в localStorage');
        } catch (error) {
            console.error('❌ Ошибка сохранения кэша в localStorage:', error);
        }
    }

    // Проверка актуальности кэша
    private isCacheValid(type: keyof AppCache['lastUpdated']): boolean {
        const now = Date.now();
        return (now - this.cache.lastUpdated[type]) < CACHE_TTL;
    }

    // Получение объектов с кэшированием
    async getObjects(): Promise<ObjectData[]> {
        await this.initializeCache();

        if (this.isCacheValid('objects') && this.cache.objects.length > 0) {
            console.log('📦 Возвращаем объекты из кэша');
            return this.cache.objects;
        }

        console.log('🔄 Загружаем объекты из Firebase');
        const objects = await getObjects();
        this.cache.objects = objects;
        this.cache.lastUpdated.objects = Date.now();
        this.saveToStorage();
        return objects;
    }

    // Получение кураторов с кэшированием
    async getCurators(): Promise<Curator[]> {
        await this.initializeCache();

        if (this.isCacheValid('curators') && this.cache.curators.length > 0) {
            console.log('📦 Возвращаем кураторов из кэша');
            return this.cache.curators;
        }

        console.log('🔄 Загружаем кураторов из Firebase');
        const curators = await getCurators();
        this.cache.curators = curators;
        this.cache.lastUpdated.curators = Date.now();
        this.saveToStorage();
        return curators;
    }

    // Получение инспекторов с кэшированием
    async getInspectors(): Promise<Inspector[]> {
        await this.initializeCache();

        if (this.isCacheValid('inspectors') && this.cache.inspectors.length > 0) {
            console.log('📦 Возвращаем инспекторов из кэша');
            return this.cache.inspectors;
        }

        console.log('🔄 Загружаем инспекторов из Firebase');
        const inspectors = await getInspectors();
        this.cache.inspectors = inspectors;
        this.cache.lastUpdated.inspectors = Date.now();
        this.saveToStorage();
        return inspectors;
    }

    // Получение охранников с кэшированием
    async getGuards(): Promise<Guard[]> {
        await this.initializeCache();

        if (this.isCacheValid('guards') && this.cache.guards.length > 0) {
            console.log('📦 Возвращаем охранников из кэша');
            return this.cache.guards;
        }

        console.log('🔄 Загружаем охранников из Firebase');
        const guards = await getGuards();
        this.cache.guards = guards;
        this.cache.lastUpdated.guards = Date.now();
        this.saveToStorage();
        return guards;
    }

    // Подписка на задания с кэшированием
    subscribeToTasks(userId: string, callback: (tasks: Task[]) => void): () => void {
        // Если есть актуальный кэш, сразу возвращаем данные
        if (this.isCacheValid('tasks') && this.cache.tasks.length > 0) {
            const userTasks = this.cache.tasks.filter(task => task.assignedTo === userId);
            callback(userTasks);
        }

        // Отписываемся от предыдущей подписки
        if (this.listeners.tasks) {
            this.listeners.tasks();
        }

        console.log('🔄 Подписываемся на задания из Firebase');
        const q = query(
            collection(db, 'tasks'),
            where('assignedTo', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasks: Task[] = [];
            querySnapshot.forEach((doc) => {
                const d = doc.data();
                tasks.push({
                    id: doc.id,
                    title: d.title,
                    description: d.description,
                    status: d.status,
                    assignedTo: d.assignedTo,
                    assignedToName: d.assignedToName,
                    createdAt: d.createdAt?.toDate() || new Date(),
                    assignedAt: d.assignedAt?.toDate(),
                    acceptedAt: d.acceptedAt?.toDate(),
                    completedAt: d.completedAt?.toDate(),
                    objects: d.objects || [],
                    objectIds: d.objectIds || [],
                    location: d.location
                });
            });

            // Сортируем по дате создания (новые сначала)
            const sortedTasks = tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            // Обновляем кэш
            this.cache.tasks = sortedTasks;
            this.cache.lastUpdated.tasks = Date.now();

            console.log('📦 Обновлен кэш заданий');
            callback(sortedTasks);
        });

        this.listeners.tasks = unsubscribe;
        return unsubscribe;
    }

    // Подписка на изменения объектов в реальном времени
    subscribeToObjects(callback: (objects: ObjectData[]) => void): () => void {
        console.log('🔄 Подписываемся на объекты из Firebase');
        const q = query(collection(db, 'objects'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const objects: ObjectData[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                objects.push({
                    id: doc.id,
                    name: data.name,
                    address: data.address,
                    description: data.description,
                    position: data.position || [0, 0],
                    status: data.status || 'active',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate()
                });
            });

            // Обновляем кэш
            this.cache.objects = objects;
            this.cache.lastUpdated.objects = Date.now();
            this.saveToStorage();

            console.log('📦 Обновлен кэш объектов');
            callback(objects);
        });

        this.listeners.objects = unsubscribe;
        return unsubscribe;
    }

    // Подписка на изменения кураторов
    subscribeToCurators(callback: (curators: Curator[]) => void): () => void {
        console.log('🔄 Подписываемся на кураторов из Firebase');
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'curator'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log('📦 Firebase: Получены изменения в коллекции users для кураторов');
            const curators: Curator[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const curator: Curator = {
                    uid: doc.id,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    assignedObjects: data.assignedObjects || [],
                    createdAt: data.createdAt?.toDate() || new Date(),
                    role: 'curator' as const,
                    status: data.status || 'working'
                };
                curators.push(curator);
                console.log('👤 Firebase: Куратор:', {
                    uid: curator.uid,
                    name: curator.name,
                    assignedObjectsCount: curator.assignedObjects.length,
                    assignedObjects: curator.assignedObjects
                });
            });

            // Обновляем кэш
            this.cache.curators = curators;
            this.cache.lastUpdated.curators = Date.now();
            this.saveToStorage();

            console.log('📦 Обновлен кэш кураторов, всего кураторов:', curators.length);
            callback(curators);
        }, (error) => {
            console.error('❌ Ошибка подписки на кураторов:', error);
            // В случае ошибки возвращаем пустой массив
            callback([]);
        });

        this.listeners.curators = unsubscribe;
        return unsubscribe;
    }

    // Подписка на конкретного куратора
    subscribeToSpecificCurator(curatorId: string, callback: (curator: Curator | null) => void): () => void {
        console.log('🔄 Подписываемся на конкретного куратора из Firebase:', curatorId);
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'curator'),
            where('__name__', '==', curatorId)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log('📦 Firebase: Получены изменения для конкретного куратора:', curatorId);
            if (querySnapshot.empty) {
                console.log('❌ Firebase: Куратор не найден:', curatorId);
                callback(null);
                return;
            }

            const doc = querySnapshot.docs[0];
            const data = doc.data();
            const curator: Curator = {
                uid: doc.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                assignedObjects: data.assignedObjects || [],
                createdAt: data.createdAt?.toDate() || new Date(),
                role: 'curator' as const,
                status: data.status || 'working'
            };

            console.log('🎯 Firebase: Обновлен конкретный куратор:', {
                uid: curator.uid,
                name: curator.name,
                assignedObjectsCount: curator.assignedObjects.length,
                assignedObjects: curator.assignedObjects
            });

            callback(curator);
        });

        return unsubscribe;
    }

    // Подписка на задания объекта (для кураторов)
    subscribeToObjectTasks(objectId: string, callback: (tasks: Task[]) => void): () => void {
        console.log('🔄 Подписываемся на задания объекта из Firebase');
        const q = query(
            collection(db, 'tasks'),
            where('objectIds', 'array-contains', objectId)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasks: Task[] = [];
            querySnapshot.forEach((doc) => {
                const d = doc.data();
                tasks.push({
                    id: doc.id,
                    title: d.title,
                    description: d.description,
                    status: d.status,
                    assignedTo: d.assignedTo,
                    assignedToName: d.assignedToName,
                    createdAt: d.createdAt?.toDate() || new Date(),
                    assignedAt: d.assignedAt?.toDate(),
                    acceptedAt: d.acceptedAt?.toDate(),
                    completedAt: d.completedAt?.toDate(),
                    objects: d.objects || [],
                    objectIds: d.objectIds || [],
                    location: d.location
                });
            });

            // Сортируем по дате создания (новые сначала)
            const sortedTasks = tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            console.log('📦 Получены задания объекта');
            callback(sortedTasks);
        });

        return unsubscribe;
    }

    // Подписка на задания для объектов куратора
    subscribeToCuratorObjectsTasks(objectIds: string[], callback: (tasks: Task[]) => void): () => void {
        console.log('🔄 Подписываемся на задания объектов куратора из Firebase');

        if (objectIds.length === 0) {
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db, 'tasks'),
            where('objectIds', 'array-contains-any', objectIds)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasks: Task[] = [];
            querySnapshot.forEach((doc) => {
                const d = doc.data();
                tasks.push({
                    id: doc.id,
                    title: d.title,
                    description: d.description,
                    status: d.status,
                    assignedTo: d.assignedTo,
                    assignedToName: d.assignedToName,
                    createdAt: d.createdAt?.toDate() || new Date(),
                    assignedAt: d.assignedAt?.toDate(),
                    acceptedAt: d.acceptedAt?.toDate(),
                    completedAt: d.completedAt?.toDate(),
                    objects: d.objects || [],
                    objectIds: d.objectIds || [],
                    location: d.location
                });
            });

            // Сортируем по дате создания (новые сначала)
            const sortedTasks = tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            console.log('📦 Получены задания объектов куратора:', sortedTasks.length);
            callback(sortedTasks);
        });

        return unsubscribe;
    }

    // Предзагрузка всех данных
    async preloadAllData(): Promise<{
        objects: ObjectData[];
        curators: Curator[];
        inspectors: Inspector[];
        guards: Guard[];
    }> {
        console.log('🚀 Начинаем предзагрузку всех данных...');
        const startTime = Date.now();

        try {
            await this.initializeCache();

            // Загружаем все данные параллельно
            const [objects, curators, inspectors, guards] = await Promise.all([
                this.getObjects(),
                this.getCurators(),
                this.getInspectors(),
                this.getGuards()
            ]);

            const loadTime = Date.now() - startTime;
            console.log(`✅ Предзагрузка завершена за ${loadTime}ms:`, {
                objects: objects.length,
                curators: curators.length,
                inspectors: inspectors.length,
                guards: guards.length
            });

            return { objects, curators, inspectors, guards };
        } catch (error) {
            console.error('❌ Ошибка предзагрузки данных:', error);
            throw error;
        }
    }

    // Очистка кэша
    clearCache(type?: keyof AppCache['lastUpdated']) {
        if (type) {
            this.cache[type] = [];
            this.cache.lastUpdated[type] = 0;
            console.log(`🗑️ Очищен кэш: ${type}`);
        } else {
            this.cache = {
                objects: [],
                tasks: [],
                curators: [],
                inspectors: [],
                guards: [],
                lastUpdated: {
                    objects: 0,
                    tasks: 0,
                    curators: 0,
                    inspectors: 0,
                    guards: 0,
                }
            };
            console.log('🗑️ Очищен весь кэш');
        }
        this.saveToStorage();
    }

    // Принудительное обновление кэша
    async refreshCache(type?: keyof AppCache['lastUpdated']) {
        if (type) {
            this.cache.lastUpdated[type] = 0;
            console.log(`🔄 Принудительное обновление кэша: ${type}`);
        } else {
            Object.keys(this.cache.lastUpdated).forEach(key => {
                this.cache.lastUpdated[key as keyof AppCache['lastUpdated']] = 0;
            });
            console.log('🔄 Принудительное обновление всего кэша');
        }
    }

    // Отписка от всех слушателей
    unsubscribeAll() {
        Object.values(this.listeners).forEach(unsubscribe => {
            if (unsubscribe) {
                unsubscribe();
            }
        });
        this.listeners = {
            objects: null,
            tasks: null,
            curators: null,
            inspectors: null,
            guards: null
        };
        console.log('🔌 Отписаны от всех слушателей');
    }

    // Получение статистики кэша
    getCacheStats() {
        const now = Date.now();
        return {
            objects: {
                count: this.cache.objects.length,
                age: now - this.cache.lastUpdated.objects,
                isValid: this.isCacheValid('objects')
            },
            tasks: {
                count: this.cache.tasks.length,
                age: now - this.cache.lastUpdated.tasks,
                isValid: this.isCacheValid('tasks')
            },
            curators: {
                count: this.cache.curators.length,
                age: now - this.cache.lastUpdated.curators,
                isValid: this.isCacheValid('curators')
            },
            inspectors: {
                count: this.cache.inspectors.length,
                age: now - this.cache.lastUpdated.inspectors,
                isValid: this.isCacheValid('inspectors')
            }
        };
    }
}

// Экспортируем единственный экземпляр
export const cacheManager = new CacheManager();