/**
 * @file: useOptimizedQuery.ts
 * @description: Хук для оптимизированных запросов с кэшированием и дебаунсингом
 * @dependencies: react, cache
 * @created: 2025-07-20
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { cacheManager } from '../services/cache';

interface UseOptimizedQueryOptions<T> {
    queryFn: () => Promise<T>;
    cacheKey: string;
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
    cacheTime?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
}

interface QueryState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    isStale: boolean;
}

export const useOptimizedQuery = <T = any>(options: UseOptimizedQueryOptions<T>) => {
    const {
        queryFn,
        cacheKey,
        enabled = true,
        refetchInterval,
        staleTime = 5 * 60 * 1000, // 5 минут
        cacheTime = 10 * 60 * 1000, // 10 минут
        onSuccess,
        onError
    } = options;

    const [state, setState] = useState<QueryState<T>>({
        data: null,
        loading: false,
        error: null,
        isStale: false
    });

    const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Функция для получения данных из кэша
    const getCachedData = useCallback((): T | null => {
        const cached = cacheRef.current.get(cacheKey);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > cacheTime) {
            cacheRef.current.delete(cacheKey);
            return null;
        }

        return cached.data;
    }, [cacheKey, cacheTime]);

    // Функция для сохранения данных в кэш
    const setCachedData = useCallback((data: T) => {
        cacheRef.current.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
    }, [cacheKey]);

    // Функция для выполнения запроса
    const executeQuery = useCallback(async (force = false) => {
        if (!enabled) return;

        // Проверяем кэш, если не принудительная загрузка
        if (!force) {
            const cachedData = getCachedData();
            if (cachedData) {
                const age = Date.now() - (cacheRef.current.get(cacheKey)?.timestamp || 0);
                const isStale = age > staleTime;

                setState(prev => ({
                    ...prev,
                    data: cachedData,
                    loading: false,
                    error: null,
                    isStale
                }));

                // Если данные устарели, загружаем в фоне
                if (isStale) {
                    executeQuery(true);
                }
                return;
            }
        }

        // Отменяем предыдущий запрос
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const data = await queryFn();

            // Проверяем, не был ли запрос отменен
            if (abortControllerRef.current.signal.aborted) {
                return;
            }

            setCachedData(data);
            setState(prev => ({
                ...prev,
                data,
                loading: false,
                error: null,
                isStale: false
            }));

            onSuccess?.(data);
        } catch (error) {
            // Проверяем, не был ли запрос отменен
            if (abortControllerRef.current.signal.aborted) {
                return;
            }

            const errorObj = error instanceof Error ? error : new Error('Unknown error');
            setState(prev => ({
                ...prev,
                loading: false,
                error: errorObj
            }));

            onError?.(errorObj);
        }
    }, [enabled, queryFn, getCachedData, setCachedData, staleTime, onSuccess, onError]);

    // Функция для принудительного обновления
    const refetch = useCallback(() => {
        executeQuery(true);
    }, [executeQuery]);

    // Функция для очистки кэша
    const clearCache = useCallback(() => {
        cacheRef.current.delete(cacheKey);
        setState(prev => ({ ...prev, data: null }));
    }, [cacheKey]);

    // Эффект для инициализации и интервального обновления
    useEffect(() => {
        if (enabled) {
            executeQuery();
        }

        // Настраиваем интервальное обновление
        if (refetchInterval && enabled) {
            intervalRef.current = setInterval(() => {
                executeQuery();
            }, refetchInterval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [enabled, refetchInterval, executeQuery]);

    return {
        ...state,
        refetch,
        clearCache,
        isCached: getCachedData() !== null
    };
}; 