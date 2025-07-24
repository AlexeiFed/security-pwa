/**
 * @file: colors.ts
 * @description: Цветовая палитра для проекта Security PWA
 * @dependencies: Нет
 * @created: 2025-06-27
 */

// Основные цвета
export const colors = {
    // Основная палитра
    primary: {
        main: '#0A2463', // Темно-синий - символ надежности, безопасности
        light: '#1E3A8A',
        dark: '#061B3D',
        contrast: '#ffffff'
    },

    secondary: {
        main: '#D4AF37', // Золотой - акцентный цвет
        light: '#E5C158',
        dark: '#B8941F',
        contrast: '#000000'
    },

    // Нейтральные цвета
    grey: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#eeeeee',
        300: '#e0e0e0',
        400: '#bdbdbd',
        500: '#9e9e9e',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121'
    },

    // Цвета статусов
    status: {
        success: '#4caf50',
        warning: '#ff9800',
        error: '#FF0000', // Красный для тревожных элементов
        info: '#2196f3',
        pending: '#ff9800',
        completed: '#4caf50',
        cancelled: '#FF0000'
    },

    // Цвета для карт и объектов
    map: {
        object: '#0A2463',
        objectChecked: '#4caf50',
        objectIssues: '#FF0000',
        objectPending: '#ff9800',
        objectOffice: '#388e3c',
        objectRetail: '#f57c00',
        objectWarehouse: '#7b1fa2',
        route: '#D4AF37',
        currentLocation: '#2196f3'
    },

    // Цвета фонов
    background: {
        primary: '#ffffff',
        secondary: '#f5f5f5',
        dark: '#000000',
        paper: '#ffffff',
        overlay: 'rgba(0, 0, 0, 0.7)',
        gradient: 'linear-gradient(135deg, #0A2463 0%, #000000 100%)' // Градиент от темно-синего к черному
    },

    // Цвета текста
    text: {
        primary: '#ffffff', // Белый текст на темном фоне
        secondary: '#E0E0E0',
        disabled: '#9E9E9E',
        inverse: '#000000'
    },

    // Цвета границ
    border: {
        light: '#E0E0E0',
        medium: '#BDBDBD',
        dark: '#757575',
        accent: '#D4AF37' // Золотая граница для акцентов
    },

    // Цвета для уведомлений
    notification: {
        success: '#4caf50',
        warning: '#ff9800',
        error: '#FF0000',
        info: '#2196f3'
    }
} as const;

// Типы для TypeScript
export type ColorKey = keyof typeof colors;
export type StatusColor = keyof typeof colors.status;
export type MapColor = keyof typeof colors.map;
export type NotificationColor = keyof typeof colors.notification;

// Функции для работы с цветами
export const getStatusColor = (status: StatusColor) => colors.status[status];
export const getMapColor = (type: MapColor) => colors.map[type];
export const getNotificationColor = (type: NotificationColor) => colors.notification[type];

// Утилита для преобразования hex в rgba
export function hexToRgba(hex: string, alpha: number): string {
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
} 