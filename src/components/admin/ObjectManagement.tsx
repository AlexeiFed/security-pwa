/**
 * @file: ObjectManagement.tsx
 * @description: Компонент для управления объектами администратором
 * @dependencies: react, material-ui, colors, objects service
 * @created: 2025-06-27
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Paper,

    Card,
    CardContent,

    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Fab,
    Autocomplete,
    Chip,
    IconButton,
    Alert,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    LocationOn as LocationIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Circle as CircleIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { colors } from '../../utils/colors';
import { createObject, updateObject, deleteObject } from '../../services/objects';
import { ObjectData, ObjectStatus } from '../../types';
import { cacheManager } from '../../services/cache';

import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';

// Типы для Яндекс.Карт
declare global {
    interface Window {
        ymaps: any;
    }
}

const DEFAULT_CENTER: [number, number] = [48.4827, 135.0840]; // Хабаровск (lat, lng)

// Функции для работы со статусами
const getStatusColor = (status: ObjectStatus) => {
    switch (status) {
        case 'active':
            return colors.status.success;
        case 'inactive':
            return colors.status.error;
        case 'maintenance':
            return colors.status.warning;
        default:
            return colors.grey[500];
    }
};

const getStatusText = (status: ObjectStatus) => {
    switch (status) {
        case 'active':
            return 'Активен';
        case 'inactive':
            return 'Неактивен';
        case 'maintenance':
            return 'На обслуживании';
        default:
            return 'Неизвестно';
    }
};

// Минималистичная карта с поддержкой маркеров и выбора точки
const SimpleYandexMap: React.FC<{
    center: [number, number];
    zoom: number;
    markers: { id: string; position: [number, number]; title: string }[];
    onMarkerClick?: (id: string) => void;
    onMapClick?: (position: [number, number]) => void;
    selectedPosition?: [number, number] | null;
    onMapReady?: (map: any) => void;
    hoveredObjectId?: string | null;
}> = ({ center, zoom, markers, onMarkerClick, onMapClick, selectedPosition, onMapReady, hoveredObjectId }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const selectedPlacemark = useRef<any>(null);
    const isInitialized = useRef(false);

    useEffect(() => {
        let attempts = 0;
        function tryInitMap() {
            if (!window.ymaps) {
                setTimeout(tryInitMap, 100);
                return;
            }
            function waitForMapClass(cb: () => void, maxTries = 30) {
                if (window.ymaps && window.ymaps.Map) {
                    cb();
                } else if (maxTries > 0) {
                    setTimeout(() => waitForMapClass(cb, maxTries - 1), 100);
                }
            }
            waitForMapClass(() => {
                window.ymaps.ready(() => {
                    if (!mapRef.current) {
                        if (attempts < 10) {
                            attempts++;
                            setTimeout(tryInitMap, 100);
                            return;
                        } else {
                            mapRef.current && (mapRef.current.innerHTML = 'mapRef.current не определён после ожидания');
                            return;
                        }
                    }
                    try {
                        // Если карта уже есть — удаляем
                        if (mapInstance.current) {
                            mapInstance.current.destroy();
                        }
                        const map = new window.ymaps.Map(mapRef.current, {
                            center: center,
                            zoom: zoom,
                            controls: ['zoomControl', 'geolocationControl'],
                            suppressMapOpenBlock: true // Отключаем автоматический зум при клике на здания
                        });
                        mapInstance.current = map;
                        isInitialized.current = true;

                        // Передаем карту в родительский компонент
                        if (onMapReady) {
                            onMapReady(map);
                        }

                        // Отключаем автоматическое изменение зума при клике на геообъекты
                        map.behaviors.disable('scrollZoom');
                        map.behaviors.enable('scrollZoom');

                        // Добавляем маркеры объектов
                        markers.forEach(marker => {
                            const isHovered = hoveredObjectId && marker.id === hoveredObjectId;
                            const placemark = new window.ymaps.Placemark(
                                marker.position,
                                {
                                    balloonContent: marker.title,
                                    iconCaption: marker.title
                                },
                                {
                                    preset: isHovered ? 'islands#redIcon' : 'islands#blueIcon',
                                    iconColor: isHovered ? '#d32f2f' : undefined,
                                    iconImageSize: isHovered ? [40, 40] : [24, 24],
                                    iconCaptionMaxWidth: 220,
                                    suppressMapOpenBlock: true
                                }
                            );
                            if (onMarkerClick) {
                                placemark.events.add('click', (e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onMarkerClick(marker.id);
                                });
                            }
                            map.geoObjects.add(placemark);
                        });

                        // Обработчик клика по карте
                        if (onMapClick) {
                            map.events.add('click', (e: any) => {
                                const coords = e.get('coords');
                                onMapClick([coords[0], coords[1]]);
                            });
                        }

                        // Показываем выбранную позицию
                        if (selectedPosition) {
                            if (selectedPlacemark.current) {
                                map.geoObjects.remove(selectedPlacemark.current);
                            }
                            selectedPlacemark.current = new window.ymaps.Placemark(
                                selectedPosition,
                                { balloonContent: 'Выбранная позиция' },
                                {
                                    preset: 'islands#redDotIcon',
                                    suppressMapOpenBlock: true // Отключаем автоматический зум для выбранной позиции
                                }
                            );
                            map.geoObjects.add(selectedPlacemark.current);
                        }
                    } catch (err) {
                        mapRef.current && (mapRef.current.innerHTML = 'Ошибка инициализации карты');
                    }
                });
            });
        }
        if (!window.ymaps) {
            const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');
            if (!existingScript) {
                const apiKey = process.env.REACT_APP_YANDEX_MAPS_API_KEY || 'your_yandex_maps_api_key_here';
                const script = document.createElement('script');
                script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
                script.async = true;
                script.onload = () => {
                    tryInitMap();
                };
                document.head.appendChild(script);
            } else {
                tryInitMap();
            }
        } else {
            tryInitMap();
        }
        return () => {
            if (mapInstance.current) {
                mapInstance.current.destroy();
                mapInstance.current = null;
                isInitialized.current = false;
            }
        };
    }, []);

    // Отдельный эффект для обновления маркеров без перерендера карты
    useEffect(() => {
        console.log('Обновляем маркеры на карте:', markers);
        if (mapInstance.current && isInitialized.current) {
            // Очищаем старые маркеры
            mapInstance.current.geoObjects.removeAll();
            console.log('Старые маркеры удалены');

            // Добавляем новые маркеры
            markers.forEach(marker => {
                console.log('Добавляем маркер:', marker);
                const isHovered = hoveredObjectId && marker.id === hoveredObjectId;
                const placemark = new window.ymaps.Placemark(
                    marker.position,
                    {
                        balloonContent: marker.title,
                        iconCaption: marker.title
                    },
                    {
                        preset: isHovered ? 'islands#redIcon' : 'islands#blueIcon',
                        iconColor: isHovered ? '#d32f2f' : undefined,
                        iconImageSize: isHovered ? [40, 40] : [24, 24],
                        iconCaptionMaxWidth: 220,
                        suppressMapOpenBlock: true
                    }
                );
                if (onMarkerClick) {
                    placemark.events.add('click', (e: any) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMarkerClick(marker.id);
                    });
                }
                mapInstance.current.geoObjects.add(placemark);
            });
            console.log(`Добавлено ${markers.length} маркеров`);

            // Показываем выбранную позицию
            if (selectedPosition) {
                if (selectedPlacemark.current) {
                    mapInstance.current.geoObjects.remove(selectedPlacemark.current);
                }
                selectedPlacemark.current = new window.ymaps.Placemark(
                    selectedPosition,
                    { balloonContent: 'Выбранная позиция' },
                    {
                        preset: 'islands#redDotIcon',
                        suppressMapOpenBlock: true
                    }
                );
                mapInstance.current.geoObjects.add(selectedPlacemark.current);
                console.log('Добавлена выбранная позиция:', selectedPosition);
            }
        }
    }, [markers, selectedPosition, onMarkerClick, hoveredObjectId]);

    return (
        <div
            ref={mapRef}
            style={{
                height: '100%',
                width: '100%',
                border: '1px solid #1976d2',
                borderRadius: '8px',
                backgroundColor: '#f0f0f0',
                minHeight: '100%'
            }}
        />
    );
};

// Сервис для геокодирования адресов (приоритет точного дома при наличии номера)
const geocodeAddress = async (address: string): Promise<{ position: [number, number]; formattedAddress: string } | null> => {
    if (!window.ymaps) return null;

    return new Promise((resolve) => {
        const hasDigitsInOriginal = /\d+/.test(address);
        // Подготавливаем варианты поиска
        const searchVariants = [
            address,
            address.includes('Хабаровск') ? address : `${address}, Хабаровск`,
            address.includes('Хабаровск') ? address : `Хабаровск, ${address}`,
            address.includes('улица') ? address : `улица ${address}, Хабаровск`,
            address.includes('проспект') ? address : `проспект ${address}, Хабаровск`,
            address.includes('бульвар') ? address : `бульвар ${address}, Хабаровск`,
            address.includes('переулок') ? address : `переулок ${address}, Хабаровск`,
            address.includes('набережная') ? address : `набережная ${address}, Хабаровск`,
            address.includes('шоссе') ? address : `шоссе ${address}, Хабаровск`,
            `${address}, Хабаровский край`,
            `Хабаровский край, ${address}`
        ];

        const tryGeocode = (searchQuery: string, attempt: number = 0): Promise<any> => {
            const hasDigits = /\d+/.test(searchQuery) || hasDigitsInOriginal;
            const options: any = { results: 10 };
            if (hasDigits) options.kind = 'house'; else options.kind = 'street';

            return window.ymaps
                .geocode(searchQuery, options)
                .then((res: any) => {
                    let bestHouse: any = null;
                    let bestStreet: any = null;

                    for (let i = 0; i < res.geoObjects.getLength(); i++) {
                        const geoObject = res.geoObjects.get(i);
                        const formattedAddress = geoObject.getAddressLine();
                        const meta = geoObject?.properties?.get('metaDataProperty');
                        const kind = meta?.GeocoderMetaData?.kind;

                        const isKhabarovsk =
                            formattedAddress?.toLowerCase().includes('хабаровск') ||
                            formattedAddress?.toLowerCase().includes('хабаровский');
                        if (!isKhabarovsk) continue;

                        if (kind === 'house' && !bestHouse) bestHouse = geoObject;
                        if (kind === 'street' && !bestStreet) bestStreet = geoObject;
                    }

                    const pick = hasDigits ? (bestHouse || bestStreet) : (bestStreet || bestHouse);
                    if (pick) {
                        const coords = pick.geometry.getCoordinates();
                        const formattedAddress = pick.getAddressLine();
                        return { position: [coords[0], coords[1]], formattedAddress };
                    }

                    if (attempt < searchVariants.length - 1) {
                        return tryGeocode(searchVariants[attempt + 1], attempt + 1);
                    }
                    return null;
                })
                .catch(() => {
                    if (attempt < searchVariants.length - 1) {
                        return tryGeocode(searchVariants[attempt + 1], attempt + 1);
                    }
                    return null;
                });
        };

        tryGeocode(searchVariants[0], 0).then((result) => resolve(result));
    });
};

// Сервис для обратного геокодирования координат
const reverseGeocode = async (position: [number, number]): Promise<string | null> => {
    if (!window.ymaps) return null;

    return new Promise((resolve) => {
        window.ymaps.geocode(position, {
            results: 1
        }).then((res: any) => {
            const firstGeoObject = res.geoObjects.get(0);
            if (firstGeoObject) {
                resolve(firstGeoObject.getAddressLine());
            } else {
                resolve(null);
            }
        }).catch(() => {
            resolve(null);
        });
    });
};

// Сервис для поиска улиц/домов Хабаровска
const searchHabarovskStreets = async (query: string): Promise<string[]> => {
    if (!window.ymaps || query.length < 2) return [];

    const hasHouseNumber = /\d+/.test(query);

    return new Promise((resolve) => {
        const base = query.trim();
        // Расширенный набор запросов. Если есть номер дома — даём приоритет house.
        const searchQueries = [
            `${base}, Хабаровск`,
            `Хабаровск, ${base}`,
            `улица ${base}, Хабаровск`,
            `ул. ${base}, Хабаровск`,
            `проспект ${base}, Хабаровск`,
            `бульвар ${base}, Хабаровск`,
            `переулок ${base}, Хабаровск`,
            `набережная ${base}, Хабаровск`,
            `шоссе ${base}, Хабаровск`,
            // Без указания типа
            `${base}`,
            `Хабаровск ${base}`,
            // Для случаев, когда сначала номер
            hasHouseNumber ? `дом ${base}, Хабаровск` : null,
            hasHouseNumber ? `${base} дом, Хабаровск` : null,
            // Паттерны вида: Руднева 74, ул Руднева 74
            hasHouseNumber ? `${base.replace(/\s*(\d+)/, ', $1')}, Хабаровск` : null
        ].filter(Boolean);

        const geocodeOptions = (isHouse: boolean) => ({
            results: isHouse ? 15 : 10,
            // Яндекс принимает одно значение kind, поэтому выбираем точечный тип
            kind: isHouse ? 'house' : 'street'
        });

        Promise.all(
            searchQueries.map((searchQuery) =>
                window.ymaps
                    .geocode(searchQuery, geocodeOptions(hasHouseNumber))
                    .catch(() => null)
            )
        ).then((results) => {
            const suggestions: string[] = [];
            const seen = new Set<string>();

            const pushIfValid = (address: string, preferHouse: boolean, geoObject: any) => {
                if (!address || seen.has(address)) return;

                const lower = address.toLowerCase();
                const isKhabarovsk =
                    lower.includes('хабаровск') || lower.includes('хабаровский') ||
                    address.includes('Хабаровск') || address.includes('Хабаровский');
                if (!isKhabarovsk) return;

                // Если пользователь вводит номер дома, стараемся показывать только дома
                if (preferHouse) {
                    try {
                        const meta = geoObject?.properties?.get('metaDataProperty');
                        const kind = meta?.GeocoderMetaData?.kind;
                        if (kind !== 'house' && !/\d+/.test(address)) return;
                    } catch (_) {
                        if (!/\d+/.test(address)) return;
                    }
                }

                seen.add(address);
                suggestions.push(address);
            };

            results.forEach((res) => {
                if (!res) return;
                res.geoObjects.each((geoObject: any) => {
                    const address = geoObject.getAddressLine();
                    pushIfValid(address, hasHouseNumber, geoObject);
                });
            });

            // Если ничего не найдено, делаем более широкий запрос без жесткого kind
            if (suggestions.length === 0) {
                window.ymaps
                    .geocode(`${base}`, { results: 20 })
                    .then((res: any) => {
                        res.geoObjects.each((geoObject: any) => {
                            const address = geoObject.getAddressLine();
                            pushIfValid(address, hasHouseNumber, geoObject);
                        });
                        // Если пользователь явно ввёл номер, добавим явную подсказку сверху
                        if (hasHouseNumber) {
                            const manual = /хабаровск/i.test(base) ? base : `Хабаровск, ${base}`;
                            if (!suggestions.includes(manual)) suggestions.unshift(manual);
                        }
                        resolve(suggestions.slice(0, 20));
                    })
                    .catch(() => resolve([]));
            } else {
                // В house-режиме сортируем адреса: сначала те, где есть номер
                const sorted = hasHouseNumber
                    ? suggestions.sort((a, b) => {
                        const aHas = /\d+/.test(a) ? 1 : 0;
                        const bHas = /\d+/.test(b) ? 1 : 0;
                        return bHas - aHas;
                    })
                    : suggestions;
                resolve(sorted.slice(0, 20));
            }
        });
    });
};

const ObjectManagement = () => {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    const [streetSearch, setStreetSearch] = useState('');
    const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [mapInstance, setMapInstance] = useState<any>(null);

    // Популярные улицы Хабаровска
    const popularStreets = [
        'ул. Ленина, Хабаровск',
        'Амурский бульвар, Хабаровск',
        'ул. Карла Маркса, Хабаровск',
        'ул. Муравьева-Амурского, Хабаровск',
        'ул. Серышева, Хабаровск',
        'ул. Пушкина, Хабаровск'
    ];

    const [statusFilter, setStatusFilter] = useState<ObjectStatus | 'all'>('all');
    const [addingObject, setAddingObject] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
    const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
    const [loadingDialogOpen, setLoadingDialogOpen] = useState(false);

    // Форма добавления объекта
    const [newObject, setNewObject] = useState({
        name: '',
        address: '',
        description: '',
        status: 'active' as ObjectStatus
    });

    // Состояния для модальных окон редактирования и удаления
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [objectToEdit, setObjectToEdit] = useState<ObjectData | null>(null);
    const [objectToDelete, setObjectToDelete] = useState<ObjectData | null>(null);

    // Состояния для редактирования
    const [editObject, setEditObject] = useState<ObjectData | null>(null);

    // При открытии модального окна редактирования копировать данные
    useEffect(() => {
        if (editDialogOpen && objectToEdit) {
            setEditObject({ ...objectToEdit });
        }
    }, [editDialogOpen, objectToEdit]);

    // Загрузка объектов из Firebase с кэшированием
    const loadObjects = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('🔄 Загрузка объектов с кэшированием...');

            const objectsData = await cacheManager.getObjects();
            console.log('✅ Объекты загружены из кэша:', objectsData.length);
            setObjects(objectsData);
        } catch (err) {
            console.error('❌ Ошибка загрузки объектов:', err);
            setError('Ошибка при загрузке объектов');
            showSnackbar('Ошибка при загрузке объектов', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Загрузка объектов при монтировании компонента
    useEffect(() => {
        loadObjects();
    }, [loadObjects]);

    // Фильтрация объектов по поиску и статусу
    const filtered = objects.filter(obj => {
        const matchesSearch = obj.name.toLowerCase().includes(search.toLowerCase()) ||
            obj.address.toLowerCase().includes(search.toLowerCase()) ||
            obj.description.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'all' || obj.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Фильтрация маркеров для карты по статусу
    const filteredMarkers = objects
        .filter(obj => (statusFilter === 'all' || obj.status === statusFilter) && Array.isArray(obj.position) && obj.position.length === 2 && obj.position.every(n => typeof n === 'number'))
        .map(obj => ({
            id: obj.id,
            position: obj.position,
            title: obj.name
        }));

    // Отладочная информация
    console.log('Объекты из Firebase:', objects);
    console.log('Отфильтрованные маркеры:', filteredMarkers);

    // Проверяем координаты каждого объекта
    objects.forEach((obj, index) => {
        console.log(`Объект ${index}:`, {
            id: obj.id,
            name: obj.name,
            position: obj.position,
            positionType: typeof obj.position,
            isArray: Array.isArray(obj.position),
            length: Array.isArray(obj.position) ? obj.position.length : 'N/A'
        });
    });

    // Функция центрирования карты удалена: логика перенесена в handleStreetSelect

    // Debounced функция для поиска улиц (без центрирования карты)
    const debouncedStreetSearch = async (value: string) => {
        if (value.length >= 3) {
            const suggestions = await searchHabarovskStreets(value);

            const enhanced: string[] = [...suggestions];
            const hasDigits = /\d+/.test(value);
            if (hasDigits) {
                const withCity = /хабаровск/i.test(value) ? value : `Хабаровск, ${value}`;
                const withCommaBeforeNumber = withCity.replace(/\s*(\d)/, ', $1');
                if (!enhanced.includes(withCity)) enhanced.unshift(withCity);
                if (!enhanced.includes(withCommaBeforeNumber)) enhanced.unshift(withCommaBeforeNumber);
            }

            setStreetSuggestions(enhanced.slice(0, 20));
            // Убираем автоматическое центрирование карты при вводе
        } else {
            setStreetSuggestions([]);
        }
    };

    // Удалённые устаревшие обработчики поиска с debounce и Enter,
    // используется прямой вызов debouncedStreetSearch в onInputChange

    // Выбор улицы из поиска
    const handleStreetSelect = async (address: string) => {
        setStreetSearch(address);
        setStreetSuggestions([]);

        try {
            const geocodeResult = await geocodeAddress(address);
            if (geocodeResult) {
                const hasHouseNumber = /\d+/.test(geocodeResult.formattedAddress);
                const zoomLevel = hasHouseNumber ? 18 : 16;

                // Перемещаем карту и ОБНОВЛЯЕМ красную метку выбранной позиции
                if (mapInstance) {
                    mapInstance.setCenter(geocodeResult.position, zoomLevel);
                }
                setSelectedPosition(geocodeResult.position);

                // Обновляем поле поиска
                setStreetSearch(geocodeResult.formattedAddress);

                const message = hasHouseNumber
                    ? `Карта центрирована на адресе: ${geocodeResult.formattedAddress}`
                    : `Карта центрирована на улице: ${geocodeResult.formattedAddress}`;
                showSnackbar(message, 'success');
            } else {
                showSnackbar('Не удалось найти координаты для этого адреса', 'error');
            }
        } catch (error) {
            console.error('Ошибка при выборе улицы:', error);
            showSnackbar('Ошибка при поиске адреса', 'error');
        }
    };

    // Обработчик клика по карте
    const handleMapClick = async (position: [number, number]) => {
        setSelectedPosition(position);
        const address = await reverseGeocode(position);
        if (address) {
            setNewObject(prev => ({ ...prev, address }));
        }
    };

    // Обработчик клика по маркеру объекта (без изменения зума)
    const handleMarkerClick = (id: string) => {
        setSelectedId(id);
        // НЕ изменяем зум и центр карты
    };

    // Обработчик готовности карты
    const handleMapReady = (map: any) => {
        setMapInstance(map);
    };

    // Очистка таймаута при размонтировании
    useEffect(() => {
        return () => {
            const timeoutId = searchTimeoutRef.current;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    // Поиск адресов при вводе в модальном окне
    const handleAddressInput = async (value: string) => {
        if (value.length < 3) {
            setAddressSuggestions([]);
            return;
        }

        if (!window.ymaps) return;

        try {
            const res = await window.ymaps.geocode(value, { results: 5 });
            const suggestions = res.geoObjects.toArray().map((obj: any) => obj.getAddressLine());
            setAddressSuggestions(suggestions);
        } catch (error) {
            setAddressSuggestions([]);
        }
    };

    // Добавление объекта
    const handleAddObject = async () => {
        if (!newObject.name || !newObject.address) {
            showSnackbar('Заполните название и адрес', 'error');
            return;
        }

        try {
            setAddingObject(true);
            setLoadingDialogOpen(true); // Показываем модальное окно загрузки

            let position: [number, number];
            if (selectedPosition) {
                position = selectedPosition;
            } else {
                const geocodeResult = await geocodeAddress(newObject.address);
                if (!geocodeResult) {
                    showSnackbar('Не удалось определить координаты адреса', 'error');
                    setLoadingDialogOpen(false);
                    return;
                }
                position = geocodeResult.position;
                setNewObject(prev => ({ ...prev, address: geocodeResult.formattedAddress }));
            }

            // Создаем объект через Firebase
            const newObjectId = await createObject({
                name: newObject.name,
                address: newObject.address,
                description: newObject.description,
                position,
                status: newObject.status
            });
            console.log('Объект создан с ID:', newObjectId);

            // Обновляем кэш и перезагружаем объекты
            cacheManager.clearCache('objects');
            await loadObjects();
            console.log('✅ Объекты перезагружены после создания');

            // Принудительно обновляем карту
            if (mapInstance) {
                console.log('Обновляем карту после добавления объекта');
                // Небольшая задержка для обновления состояния
                setTimeout(() => {
                    if (mapInstance && mapInstance.geoObjects) {
                        mapInstance.geoObjects.removeAll();
                        // Маркеры добавятся автоматически через useEffect
                    }
                }, 100);
            }

            // Сбрасываем форму
            setNewObject({ name: '', address: '', description: '', status: 'active' });
            setSelectedPosition(null);
            setStreetSearch('');
            setAddDialogOpen(false);
            setLoadingDialogOpen(false); // Скрываем модальное окно загрузки
            showSnackbar('Объект успешно добавлен', 'success');
        } catch (err) {
            console.error('Ошибка добавления объекта:', err);
            showSnackbar('Ошибка при добавлении объекта', 'error');
            setLoadingDialogOpen(false); // Скрываем модальное окно загрузки при ошибке
        } finally {
            setAddingObject(false);
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    // Обработчики
    const handleEditClick = (obj: ObjectData) => {
        setObjectToEdit(obj);
        setEditDialogOpen(true);
    };
    const handleDeleteClick = (obj: ObjectData) => {
        setObjectToDelete(obj);
        setDeleteDialogOpen(true);
    };

    const toggleDescription = (objectId: string) => {
        setExpandedDescriptions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(objectId)) {
                newSet.delete(objectId);
            } else {
                newSet.add(objectId);
            }
            return newSet;
        });
    };

    const toggleObjectExpansion = (objectId: string) => {
        setExpandedObjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(objectId)) {
                newSet.delete(objectId);
            } else {
                newSet.add(objectId);
            }
            return newSet;
        });
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)',
            pt: isMobile ? 10 : 0 // Добавляем отступ под шапку для мобильной версии
        }}>
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, pt: { xs: 2, sm: 2 } }}>

                {/* Заголовок страницы */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 3,
                    gap: 2
                }}>
                    {!isMobile && (
                        <IconButton
                            onClick={() => window.history.back()}
                            sx={{
                                color: colors.secondary.main,
                                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    )}
                    <Typography
                        variant="h4"
                        sx={{
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: isMobile ? '1.5rem' : '2rem'
                        }}
                    >
                        Управление объектами
                    </Typography>
                </Box>

                {/* Адаптивная компоновка для мобильных и десктопных устройств */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: 2,
                    height: isMobile ? 'auto' : 'calc(100vh - 200px)'
                }}>
                    {/* Панель с поиском и фильтрами */}
                    <Box sx={{
                        width: isMobile ? '100%' : '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        mb: isMobile ? 2 : 0
                    }}>
                        {/* Поиск улиц Хабаровска */}
                        <Paper sx={{ p: 2, flex: isMobile ? 'none' : 1 }}>
                            <Typography variant="h6" gutterBottom sx={{
                                color: colors.secondary.main,
                                fontWeight: 600,
                                fontSize: isMobile ? '1rem' : '1.25rem'
                            }}>
                                Поиск улиц Хабаровска
                            </Typography>
                            <Autocomplete
                                freeSolo
                                options={streetSuggestions}
                                value={streetSearch}
                                onChange={(_, value) => {
                                    if (value) {
                                        handleStreetSelect(value);
                                    }
                                }}
                                onInputChange={(_, value) => {
                                    setStreetSearch(value);
                                    debouncedStreetSearch(value);
                                }}
                                openOnFocus
                                filterOptions={(x) => x}
                                clearOnBlur={false}
                                selectOnFocus
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Введите улицу Хабаровска"
                                        fullWidth
                                        size="small"
                                        sx={{
                                            mb: 2,
                                            '& .MuiInputLabel-root': {
                                                color: colors.secondary.main
                                            },
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': {
                                                    borderColor: colors.secondary.main
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: colors.secondary.main
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: colors.secondary.main,
                                                    borderWidth: 2
                                                }
                                            }
                                        }}
                                    />
                                )}
                            />
                            {!isMobile && (
                                <>
                                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                                        Популярные улицы:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {popularStreets.map((street, index) => (
                                            <Chip
                                                key={index}
                                                label={street}
                                                size="small"
                                                onClick={() => handleStreetSelect(street)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        backgroundColor: colors.secondary.main,
                                                        color: '#000'
                                                    }
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </>
                            )}
                        </Paper>

                        {/* Фильтр по статусам */}
                        <Paper sx={{ p: 2, flex: isMobile ? 'none' : 1 }}>
                            <Typography variant="h6" gutterBottom sx={{
                                color: colors.secondary.main,
                                fontWeight: 600,
                                fontSize: isMobile ? '1rem' : '1.25rem'
                            }}>
                                Фильтр по статусу
                            </Typography>
                            <FormControl component="fieldset" sx={{ width: '100%' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {[
                                        { value: 'all', label: 'Все объекты' },
                                        { value: 'active', label: 'Активные' },
                                        { value: 'inactive', label: 'Неактивные' },
                                        { value: 'maintenance', label: 'На обслуживании' }
                                    ].map((option) => (
                                        <Box key={option.value} sx={{ display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="radio"
                                                id={option.value}
                                                name="statusFilter"
                                                value={option.value}
                                                checked={statusFilter === option.value}
                                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                                style={{ marginRight: 8 }}
                                            />
                                            <label htmlFor={option.value} style={{ cursor: 'pointer' }}>
                                                {option.label}
                                            </label>
                                        </Box>
                                    ))}
                                </Box>
                            </FormControl>
                            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                                Показано: {filtered.length} из {objects.length} объектов
                            </Typography>
                        </Paper>
                    </Box>

                    {/* Карта */}
                    <Paper sx={{
                        width: isMobile ? '100%' : '50%',
                        p: isMobile ? 1 : 2,
                        height: isMobile ? '400px' : 'auto',
                        borderRadius: isMobile ? 1 : 2,
                        mb: isMobile ? 3 : 0,
                        overflow: 'hidden'
                    }}>
                        <SimpleYandexMap
                            center={DEFAULT_CENTER}
                            zoom={isMobile ? 11 : 12}
                            markers={filteredMarkers}
                            onMarkerClick={handleMarkerClick}
                            onMapClick={handleMapClick}
                            selectedPosition={selectedPosition}
                            onMapReady={(map) => {
                                handleMapReady(map);
                                if (isMobile) {
                                    // Отключаем только скролл страницы при взаимодействии с картой на мобильных
                                    map.behaviors.disable('scrollZoom');
                                    // Оставляем возможность перемещения карты
                                }
                            }}
                            hoveredObjectId={hoveredObjectId}
                        />
                    </Paper>
                </Box>

                {/* Панель поиска и добавления */}
                <Paper sx={{ mb: 3, p: 2, mt: 3 }}>
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        flexDirection: isMobile ? 'column' : 'row',
                        width: '100%'
                    }}>
                        <TextField
                            label="Поиск по объектам"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            size="small"
                            sx={{
                                flex: 1,
                                minWidth: isMobile ? '100%' : 200,
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary',
                                    fontSize: isMobile ? '0.875rem' : '1rem'
                                },
                                '& .MuiOutlinedInput-root': {
                                    fontSize: isMobile ? '0.875rem' : '1rem'
                                }
                            }}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                        />
                        {isMobile ? (
                            <Fab
                                color="primary"
                                aria-label="add"
                                onClick={() => setAddDialogOpen(true)}
                                sx={{
                                    position: 'fixed',
                                    bottom: 16,
                                    right: 16,
                                    backgroundColor: colors.secondary.main,
                                    color: '#000',
                                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.5)',
                                    '&:hover': {
                                        backgroundColor: '#E5C158',
                                        transform: 'scale(1.1)'
                                    },
                                    transition: 'all 0.3s ease',
                                    zIndex: 1000
                                }}
                            >
                                <AddIcon />
                            </Fab>
                        ) : (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setAddDialogOpen(true)}
                            >
                                Добавить объект
                            </Button>
                        )}
                    </Box>
                </Paper>

                {/* Список объектов */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                        <Button
                            onClick={loadObjects}
                            sx={{ ml: 2 }}
                            size="small"
                        >
                            Повторить
                        </Button>
                    </Alert>
                ) : (
                    isMobile ? (
                        // Мобильный список объектов
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {filtered.map(obj => (
                                <Paper
                                    key={obj.id}
                                    sx={{
                                        p: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        border: selectedId === obj.id ? `2px solid ${colors.secondary.main}` : '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 2,
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                                        }
                                    }}
                                    onClick={() => toggleObjectExpansion(obj.id)}
                                >
                                    {/* Основная информация */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                            <LocationIcon sx={{ mr: 1, color: colors.secondary.main, fontSize: 16 }} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                {obj.name}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={getStatusText(obj.status)}
                                            size="small"
                                            sx={{
                                                backgroundColor: getStatusColor(obj.status),
                                                color: '#fff',
                                                fontSize: '0.7rem',
                                                height: 20
                                            }}
                                        />
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1 }}>
                                        {obj.address}
                                    </Typography>

                                    {/* Раскрывающаяся информация */}
                                    {expandedObjects.has(obj.id) && (
                                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                            {obj.description && (
                                                <Typography variant="body2" sx={{ mb: 2, fontSize: '0.8rem', color: 'text.secondary' }}>
                                                    {obj.description}
                                                </Typography>
                                            )}

                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(obj);
                                                    }}
                                                    sx={{
                                                        color: colors.secondary.main,
                                                        '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(obj);
                                                    }}
                                                    sx={{
                                                        color: '#f44336',
                                                        '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    )}
                                </Paper>
                            ))}
                        </Box>
                    ) : (
                        // Десктопные карточки
                        <Box sx={{
                            display: 'grid',
                            gap: 3,
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'
                        }}>
                            {filtered.map(obj => (
                                <Card
                                    key={obj.id}
                                    sx={{
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        transform: selectedId === obj.id ? 'scale(1.02)' : 'scale(1)',
                                        boxShadow: selectedId === obj.id ? 4 : 1,
                                        '&:hover': {
                                            transform: isMobile ? 'none' : 'scale(1.02)',
                                            boxShadow: isMobile ? 1 : 4
                                        },
                                        borderRadius: isMobile ? 1 : 2
                                    }}
                                    onClick={() => setSelectedId(obj.id)}
                                    onMouseEnter={() => setHoveredObjectId(obj.id)}
                                    onMouseLeave={() => setHoveredObjectId(null)}
                                >
                                    <CardContent sx={{
                                        pb: isMobile ? 0.5 : 1,
                                        px: isMobile ? 2 : 3,
                                        py: isMobile ? 1.5 : 2.5,
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%'
                                    }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                                <LocationIcon sx={{ mr: 1.5, color: colors.secondary.main, fontSize: 20 }} />
                                                <Typography variant="subtitle1" component="h3" noWrap sx={{
                                                    fontSize: isMobile ? '0.85rem' : '0.95rem',
                                                    fontWeight: 600,
                                                    flex: 1,
                                                    lineHeight: isMobile ? 1.2 : 1.5
                                                }}>
                                                    {obj.name}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" sx={{
                                                mb: isMobile ? 1 : 1.5,
                                                fontSize: isMobile ? '0.75rem' : '0.85rem',
                                                lineHeight: isMobile ? 1.2 : 1.4
                                            }}>
                                                {obj.address}
                                            </Typography>
                                            <Box sx={{ mb: 1.5 }}>
                                                <Typography variant="body2" sx={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: expandedDescriptions.has(obj.id) ? 'unset' : 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    fontSize: isMobile ? '0.7rem' : '0.8rem',
                                                    lineHeight: isMobile ? 1.3 : 1.5,
                                                    '&:hover': {
                                                        color: isMobile ? 'inherit' : colors.secondary.main
                                                    }
                                                }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleDescription(obj.id);
                                                    }}>
                                                    {obj.description}
                                                </Typography>
                                                {obj.description.length > 100 && (
                                                    <IconButton
                                                        size={isMobile ? "small" : "medium"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleDescription(obj.id);
                                                        }}
                                                        sx={{
                                                            p: 0,
                                                            mt: isMobile ? 0.25 : 0.5,
                                                            color: colors.secondary.main,
                                                            '&:hover': {
                                                                backgroundColor: isMobile ? 'transparent' : 'rgba(212, 175, 55, 0.1)'
                                                            }
                                                        }}
                                                    >
                                                        {expandedDescriptions.has(obj.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                    </IconButton>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Строка с иконками и статусом внизу карточки */}
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mt: 'auto',
                                            pt: 2,
                                            borderTop: '1px solid rgba(0, 0, 0, 0.1)'
                                        }}>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size={isMobile ? "small" : "medium"}
                                                    color="primary"
                                                    onClick={() => handleEditClick(obj)}
                                                    sx={{
                                                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                                        padding: isMobile ? '4px' : '8px',
                                                        '&:hover': {
                                                            backgroundColor: isMobile ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.2)'
                                                        }
                                                    }}
                                                >
                                                    <EditIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteClick(obj)}
                                                    sx={{
                                                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(244, 67, 54, 0.2)'
                                                        }
                                                    }}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Box>
                                            {/* Статус объекта справа */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircleIcon
                                                    sx={{
                                                        fontSize: 10,
                                                        color: getStatusColor(obj.status)
                                                    }}
                                                />
                                                {deletingId === obj.id ? (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: getStatusColor(obj.status),
                                                            fontWeight: 500,
                                                            fontSize: '0.7rem'
                                                        }}
                                                    >
                                                        Удаление...
                                                    </Typography>
                                                ) : (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: getStatusColor(obj.status),
                                                            fontWeight: 500,
                                                            fontSize: isMobile ? '0.65rem' : '0.7rem'
                                                        }}
                                                    >
                                                        {getStatusText(obj.status)}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )
                )}
                {/* Модальное окно добавления объекта */}
                <Dialog
                    open={addDialogOpen}
                    onClose={() => setAddDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Добавить новый объект</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 1 }}>
                            <TextField
                                label="Название объекта"
                                value={newObject.name}
                                onChange={e => setNewObject(prev => ({ ...prev, name: e.target.value }))}
                                fullWidth
                                sx={{ mb: 2 }}
                            />

                            <Autocomplete
                                freeSolo
                                options={addressSuggestions}
                                value={newObject.address}
                                onChange={(_, value) => setNewObject(prev => ({ ...prev, address: value || '' }))}
                                onInputChange={(_, value) => {
                                    setNewObject(prev => ({ ...prev, address: value }));
                                    handleAddressInput(value);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Адрес"
                                        fullWidth
                                        sx={{ mb: 2 }}
                                    />
                                )}
                            />

                            <TextField
                                label="Описание"
                                value={newObject.description}
                                onChange={e => setNewObject(prev => ({ ...prev, description: e.target.value }))}
                                fullWidth
                                multiline
                                rows={3}
                                sx={{ mb: 2 }}
                            />

                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Статус объекта</InputLabel>
                                <Select
                                    value={newObject.status}
                                    onChange={e => setNewObject(prev => ({ ...prev, status: e.target.value as ObjectStatus }))}
                                    label="Статус объекта"
                                >
                                    <MenuItem value="active">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircleIcon sx={{ fontSize: 12, color: colors.status.success }} />
                                            Активен
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="inactive">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircleIcon sx={{ fontSize: 12, color: colors.status.error }} />
                                            Неактивен
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="maintenance">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircleIcon sx={{ fontSize: 12, color: colors.status.warning }} />
                                            На обслуживании
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            {selectedPosition && (
                                <Alert severity="info" sx={{
                                    mb: 2,
                                    backgroundColor: '#2196f3',
                                    color: 'white',
                                    '& .MuiAlert-icon': {
                                        color: 'white'
                                    },
                                    '& .MuiAlert-message': {
                                        color: 'white'
                                    }
                                }}>
                                    Позиция выбрана на карте: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                                </Alert>
                            )}

                            <Typography variant="body2" color="text.secondary">
                                💡 Совет: Вы можете кликнуть на карте для выбора точной позиции объекта
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setAddDialogOpen(false)}
                            sx={{
                                color: '#F44336',
                                '&:hover': {
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                }
                            }}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleAddObject}
                            variant="contained"
                            disabled={!newObject.name || !newObject.address || addingObject}
                            startIcon={addingObject ? <CircularProgress size={16} /> : undefined}
                            sx={{
                                backgroundColor: '#4CAF50',
                                '&:hover': {
                                    backgroundColor: '#45a049'
                                }
                            }}
                        >
                            {addingObject ? 'Добавление...' : 'Добавить'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Модальное окно редактирования и диалог удаления */}
                <Dialog
                    open={editDialogOpen}
                    onClose={() => setEditDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Редактировать объект</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 1 }}>
                            <TextField
                                label="Название объекта"
                                value={editObject?.name || ''}
                                onChange={(e) => setEditObject(prev => prev ? { ...prev, name: e.target.value } : prev)}
                                fullWidth
                                sx={{ mb: 2 }}
                            />

                            <Autocomplete
                                freeSolo
                                options={addressSuggestions}
                                value={editObject?.address || ''}
                                onChange={(_, value) => setEditObject(prev => prev ? { ...prev, address: value || '' } : prev)}
                                onInputChange={(_, value) => {
                                    setEditObject(prev => prev ? { ...prev, address: value } : prev);
                                    handleAddressInput(value);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Адрес"
                                        fullWidth
                                        sx={{ mb: 2 }}
                                    />
                                )}
                            />

                            <TextField
                                label="Описание"
                                value={editObject?.description || ''}
                                onChange={(e) => setEditObject(prev => prev ? { ...prev, description: e.target.value } : prev)}
                                fullWidth
                                multiline
                                rows={3}
                                sx={{ mb: 2 }}
                            />

                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Статус объекта</InputLabel>
                                <Select
                                    value={editObject?.status || 'active'}
                                    onChange={(e) => setEditObject(prev => prev ? { ...prev, status: e.target.value as ObjectStatus } : prev)}
                                    label="Статус объекта"
                                >
                                    <MenuItem value="active">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircleIcon sx={{ fontSize: 12, color: colors.status.success }} />
                                            Активен
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="inactive">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircleIcon sx={{ fontSize: 12, color: colors.status.error }} />
                                            Неактивен
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="maintenance">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircleIcon sx={{ fontSize: 12, color: colors.status.warning }} />
                                            На обслуживании
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            {selectedPosition && (
                                <Alert severity="info" sx={{
                                    mb: 2,
                                    backgroundColor: '#2196f3',
                                    color: 'white',
                                    '& .MuiAlert-icon': {
                                        color: 'white'
                                    },
                                    '& .MuiAlert-message': {
                                        color: 'white'
                                    }
                                }}>
                                    Позиция выбрана на карте: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                                </Alert>
                            )}

                            <Typography variant="body2" color="text.secondary">
                                💡 Совет: Вы можете кликнуть на карте для выбора точной позиции объекта
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setEditDialogOpen(false)}
                            sx={{
                                color: '#F44336',
                                '&:hover': {
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                }
                            }}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!editObject) return;
                                setAddingObject(true);
                                try {
                                    let position: [number, number] = editObject.position;
                                    // Геокодируем адрес, если он изменился
                                    if (editObject.address !== objectToEdit?.address) {
                                        let addressForGeocode = editObject.address;
                                        if (!/хабаровск/i.test(addressForGeocode)) {
                                            addressForGeocode += ', Хабаровск';
                                        }
                                        const geocodeResult = await geocodeAddress(addressForGeocode);
                                        if (geocodeResult) {
                                            position = geocodeResult.position;
                                        } else {
                                            showSnackbar('Не удалось определить координаты адреса. Укажите полный адрес с городом.', 'error');
                                            setAddingObject(false);
                                            return;
                                        }
                                    }
                                    await updateObject(editObject.id, {
                                        name: editObject.name,
                                        address: editObject.address,
                                        description: editObject.description,
                                        position,
                                        status: editObject.status
                                    });

                                    // Обновляем кэш и перезагружаем объекты
                                    cacheManager.clearCache('objects');
                                    await loadObjects();

                                    showSnackbar('Объект успешно обновлен', 'success');
                                    setEditDialogOpen(false);
                                } catch (e) {
                                    showSnackbar('Ошибка при обновлении объекта', 'error');
                                } finally {
                                    setAddingObject(false);
                                }
                            }}
                            variant="contained"
                            disabled={!editObject?.name || !editObject?.address || addingObject}
                            startIcon={addingObject ? <CircularProgress size={16} /> : undefined}
                            sx={{
                                backgroundColor: '#2196F3',
                                '&:hover': {
                                    backgroundColor: '#1976D2'
                                }
                            }}
                        >
                            {addingObject ? 'Обновление...' : 'Обновить'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Удалить объект</DialogTitle>
                    <DialogContent>
                        <Typography variant="body1" color="text.primary">
                            Вы уверены, что хотите удалить этот объект?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setDeleteDialogOpen(false)}
                            sx={{
                                color: '#2196F3',
                                '&:hover': {
                                    backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                }
                            }}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!objectToDelete) return;
                                setAddingObject(true);
                                setDeletingId(objectToDelete.id);
                                try {
                                    await deleteObject(objectToDelete.id);

                                    // Обновляем кэш и перезагружаем объекты
                                    cacheManager.clearCache('objects');
                                    await loadObjects();

                                    showSnackbar('Объект успешно удален', 'success');
                                    setDeleteDialogOpen(false);
                                    setDeletingId(null);
                                } catch (e) {
                                    showSnackbar('Ошибка при удалении объекта', 'error');
                                } finally {
                                    setAddingObject(false);
                                }
                            }}
                            variant="contained"
                            sx={{
                                backgroundColor: '#F44336',
                                '&:hover': {
                                    backgroundColor: '#D32F2F'
                                }
                            }}
                        >
                            Удалить
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Модальное окно процесса удаления */}
                <Dialog open={!!deletingId} maxWidth="xs" fullWidth PaperProps={{ sx: { textAlign: 'center', py: 4 } }}>
                    <DialogTitle sx={{ pb: 2 }}>Объект удаляется...</DialogTitle>
                    <DialogContent>
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            Пожалуйста, подождите. Объект будет удалён из списка и с карты.
                        </Typography>
                    </DialogContent>
                </Dialog>

                {/* Модальное окно загрузки при создании объекта */}
                <Dialog open={loadingDialogOpen} maxWidth="xs" fullWidth PaperProps={{ sx: { textAlign: 'center', py: 4 } }}>
                    <DialogTitle sx={{ pb: 2 }}>Объект добавляется...</DialogTitle>
                    <DialogContent>
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            Пожалуйста, подождите. Объект добавляется в базу данных и будет доступен кураторам.
                        </Typography>
                    </DialogContent>
                </Dialog>

                {/* Snackbar для уведомлений */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    <Alert
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        severity={snackbar.severity}
                        sx={{
                            backgroundColor: snackbar.severity === 'success' ? '#4caf50' : '#f44336',
                            color: 'white',
                            '& .MuiAlert-icon': {
                                color: 'white'
                            },
                            '& .MuiAlert-message': {
                                color: 'white'
                            }
                        }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Box>
    );
};

export default ObjectManagement;