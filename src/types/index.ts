/**
 * @file: index.ts
 * @description: Основные TypeScript типы для проекта Security PWA
 * @dependencies: Нет
 * @created: 2025-06-27
 */

// Типы пользователей
export type UserRole = 'admin' | 'inspector' | 'curator';

export type InspectorStatus = 'working' | 'vacation' | 'sick' | 'business';

export interface User {
    uid: string;
    email: string;
    role: UserRole;
    name: string;
    createdAt: Date;
}

export interface Inspector extends User {
    role: 'inspector';
    status: InspectorStatus;
    tasks?: Task[];
}

export interface Curator extends User {
    role: 'curator';
    assignedObjects: string[]; // ID объектов, которые курирует
    status: InspectorStatus;
    phone: string;
    position?: string; // Должность куратора
}

export interface Admin extends User {
    role: 'admin';
}

// Типы объектов - унифицированные
export type ObjectStatus = 'active' | 'inactive' | 'maintenance';

export interface SecurityObject {
    id: string;
    name: string;
    address: string;
    city: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    type: 'office' | 'warehouse' | 'retail' | 'residential' | 'industrial';
    securityLevel: 'low' | 'medium' | 'high';
    status: ObjectStatus;
    assignedInspector?: string;
    lastInspection?: Date;
    nextInspection?: Date;
    description?: string;
    contactPerson?: {
        name: string;
        phone: string;
        email?: string;
    };
}

// Тип для совместимости с ObjectManagement
export interface ObjectData {
    id: string;
    name: string;
    address: string;
    description: string;
    position: [number, number]; // [lat, lng]
    status: ObjectStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

// Типы заданий
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assignedTo: string;
    assignedToName?: string;
    createdAt: Date;
    assignedAt?: Date;
    acceptedAt?: Date;
    completedAt?: Date;
    objects: TaskObject[];
    objectIds?: string[]; // ID объектов для быстрого поиска
    location?: {
        lat: number;
        lng: number;
        address: string;
    };
}

export interface TaskObject {
    id: string;
    name: string;
    address: string;
    checkedAt?: Date;
    comments?: string;
    notes?: string; // Замечания инспектора
    status: 'pending' | 'checked' | 'skipped';
}

// Типы для форм
export interface LoginForm {
    email: string;
    password: string;
}

export interface CreateInspectorForm {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

export interface CreateCuratorForm {
    firstName: string;
    lastName: string;
    email: string;
    assignedObjects: string[]; // ID объектов для курирования
}

export interface CreateObjectForm {
    name: string;
    address: string;
    city?: string;
    latitude: number;
    longitude: number;
    type?: 'office' | 'warehouse' | 'retail' | 'residential' | 'industrial';
    securityLevel?: 'low' | 'medium' | 'high';
    status?: ObjectStatus;
    description?: string;
    contactPerson: string;
    phone: string;
    notes?: string;
}

export interface CreateTaskForm {
    title: string;
    description: string;
    assignedTo: string;
    assignedToName?: string;
    objectIds: string[];
    objects?: TaskObject[];
    location?: {
        lat: number;
        lng: number;
        address: string;
    };
    comments?: string;
}

// Типы для API ответов
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Типы для карт
export interface MapMarker {
    id: string;
    position: [number, number]; // [latitude, longitude]
    title: string;
    status?: 'pending' | 'checked' | 'issues';
    isSelected?: boolean;
}

export type CheckinStatus = 'pending' | 'checked' | 'issues';

// Типы для уведомлений
export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'alarm';
    isRead: boolean;
    createdAt: Date;
    data?: Record<string, any>;
}

// Типы для фильтров
export interface TaskFilters {
    status?: TaskStatus;
    dateFrom?: Date;
    dateTo?: Date;
    inspectorId?: string;
}

export interface ObjectFilters {
    status?: ObjectStatus;
    search?: string;
}

// Типы для статистики
export interface TaskStatistics {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
}

export interface InspectorStatistics {
    inspectorId: string;
    inspectorName: string;
    totalTasks: number;
    completedTasks: number;
    averageCompletionTime: number; // в минутах
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUserCredentials: (currentPassword: string, newPassword?: string) => Promise<void>;
    getUserData: (uid: string) => Promise<User | null>;
}

export interface Alert {
    id?: string;
    type: 'admin' | 'inspector' | 'curator';
    userId: string;
    userName: string;
    objectId?: string;
    objectName?: string;
    description?: string; // Описание проблемы от куратора
    createdAt: Date;
    status: 'active' | 'reset';
    coordinates?: [number, number]; // Координаты объекта для прокладки маршрута
    forRoles?: string[];
    forUserIds?: string[];
} 