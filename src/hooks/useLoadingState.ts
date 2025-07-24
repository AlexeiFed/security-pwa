/**
 * @file: useLoadingState.ts
 * @description: Хук для управления состоянием загрузки с дебаунсингом
 * @dependencies: react
 * @created: 2025-07-20
 */

import { useState, useEffect, useRef } from 'react';

interface UseLoadingStateOptions {
    minLoadingTime?: number; // Минимальное время показа загрузки (мс)
    debounceDelay?: number; // Задержка перед показом загрузки (мс)
}

export const useLoadingState = (options: UseLoadingStateOptions = {}) => {
    const { minLoadingTime = 500, debounceDelay = 300 } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const minTimeTimerRef = useRef<NodeJS.Timeout | null>(null);

    const startLoading = () => {
        setIsLoading(true);
        startTimeRef.current = Date.now();

        // Дебаунсинг - показываем загрузку только после задержки
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            setShowLoading(true);
        }, debounceDelay);
    };

    const stopLoading = () => {
        setIsLoading(false);

        // Очищаем дебаунс таймер
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        // Проверяем минимальное время показа
        if (startTimeRef.current) {
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, minLoadingTime - elapsed);

            if (remaining > 0) {
                // Ждем оставшееся время
                minTimeTimerRef.current = setTimeout(() => {
                    setShowLoading(false);
                    startTimeRef.current = null;
                }, remaining);
            } else {
                // Сразу скрываем
                setShowLoading(false);
                startTimeRef.current = null;
            }
        }
    };

    const resetLoading = () => {
        setIsLoading(false);
        setShowLoading(false);
        startTimeRef.current = null;

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        if (minTimeTimerRef.current) {
            clearTimeout(minTimeTimerRef.current);
            minTimeTimerRef.current = null;
        }
    };

    // Очистка таймеров при размонтировании
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (minTimeTimerRef.current) {
                clearTimeout(minTimeTimerRef.current);
            }
        };
    }, []);

    return {
        isLoading,
        showLoading,
        startLoading,
        stopLoading,
        resetLoading
    };
}; 