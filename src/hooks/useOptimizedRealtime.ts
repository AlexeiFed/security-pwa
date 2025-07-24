/**
 * @file: useOptimizedRealtime.ts
 * @description: Хук для оптимизированных real-time обновлений с дебаунсингом
 * @dependencies: react, firebase
 * @created: 2025-07-20
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '../services/firebase';

interface UseOptimizedRealtimeOptions<T> {
    collectionName: string;
    queryConstraints?: QueryConstraint[];
    transform?: (doc: any) => T;
    debounceDelay?: number;
    batchSize?: number;
    onError?: (error: Error) => void;
}

export const useOptimizedRealtime = <T = any>(options: UseOptimizedRealtimeOptions<T>) => {
    const {
        collectionName,
        queryConstraints = [],
        transform = (doc) => ({ id: doc.id, ...doc.data() }),
        debounceDelay = 300,
        batchSize = 50,
        onError
    } = options;

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const unsubscribeRef = useRef<(() => void) | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdatesRef = useRef<T[]>([]);

    // Функция для применения обновлений с дебаунсингом
    const applyUpdates = useCallback(() => {
        if (pendingUpdatesRef.current.length > 0) {
            setData([...pendingUpdatesRef.current]);
            pendingUpdatesRef.current = [];
        }
    }, []);

    // Функция для дебаунсинга обновлений
    const debouncedUpdate = useCallback((newData: T[]) => {
        pendingUpdatesRef.current = newData;

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            applyUpdates();
        }, debounceDelay);
    }, [debounceDelay, applyUpdates]);

    useEffect(() => {
        console.log(`🔄 Подписываемся на коллекцию: ${collectionName}`);

        try {
            // Создаем запрос
            const q = query(
                collection(db, collectionName),
                ...queryConstraints
            );

            // Подписываемся на изменения
            const unsubscribe = onSnapshot(
                q,
                (querySnapshot) => {
                    const newData: T[] = [];

                    querySnapshot.forEach((doc) => {
                        try {
                            const transformed = transform(doc);
                            newData.push(transformed);
                        } catch (transformError) {
                            console.error('❌ Ошибка трансформации документа:', transformError);
                        }
                    });

                    // Применяем обновления с дебаунсингом
                    debouncedUpdate(newData);

                    if (loading) {
                        setLoading(false);
                    }

                    console.log(`📦 Получено ${newData.length} записей из ${collectionName}`);
                },
                (error) => {
                    console.error(`❌ Ошибка подписки на ${collectionName}:`, error);
                    setError(error);
                    setLoading(false);
                    onError?.(error);
                }
            );

            unsubscribeRef.current = unsubscribe;

        } catch (error) {
            console.error(`❌ Ошибка создания подписки на ${collectionName}:`, error);
            setError(error as Error);
            setLoading(false);
            onError?.(error as Error);
        }

        // Очистка при размонтировании
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [collectionName, JSON.stringify(queryConstraints), transform, debouncedUpdate, loading, onError]);

    // Функция для принудительного обновления
    const refresh = useCallback(() => {
        setLoading(true);
        setError(null);

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }
    }, []);

    return {
        data,
        loading,
        error,
        refresh
    };
}; 