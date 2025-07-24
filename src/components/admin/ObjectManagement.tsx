/**
 * @file: ObjectManagement.tsx
 * @description: Компонент для управления объектами администратором
 * @dependencies: react, material-ui, colors, objects service
 * @created: 2025-06-27
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Paper,

    Card,
    CardContent,
    CardActions,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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
    Circle as CircleIcon
} from '@mui/icons-material';
import { colors } from '../../utils/colors';
import { getObjects, createObject, updateObject, deleteObject } from '../../services/objects';
import { ObjectData, ObjectStatus } from '../../types';
import { cacheManager } from '../../services/cache';
import { useNavigate } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';

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
                                { balloonContent: marker.title },
                                {
                                    preset: isHovered ? 'islands#redIcon' : 'islands#blueDotIcon',
                                    iconColor: isHovered ? '#d32f2f' : undefined,
                                    iconImageSize: isHovered ? [40, 40] : [24, 24],
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
    }, []); // Убираем зависимости, чтобы карта не перерендеривалась

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
                    { balloonContent: marker.title },
                    {
                        preset: isHovered ? 'islands#redIcon' : 'islands#blueDotIcon',
                        iconColor: isHovered ? '#d32f2f' : undefined,
                        iconImageSize: isHovered ? [40, 40] : [24, 24],
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
                minHeight: 400
            }}
        />
    );
};

// Сервис для геокодирования адресов
const geocodeAddress = async (address: string): Promise<{ position: [number, number]; formattedAddress: string } | null> => {
    if (!window.ymaps) return null;

    return new Promise((resolve) => {
        // Подготавливаем варианты поиска
        const searchVariants = [
            address,
            address.includes('Хабаровск') ? address : `${address}, Хабаровск`,
            address.includes('Хабаровск') ? address : `Хабаровск, ${address}`,
            address.includes('улица') ? address : `улица ${address}, Хабаровск`,
            address.includes('проспект') ? address : `проспект ${address}, Хабаровск`,
            address.includes('бульвар') ? address : `бульвар ${address}, Хабаровск`
        ];

        // Функция для попытки геокодирования
        const tryGeocode = (searchQuery: string, attempt: number = 0): Promise<any> => {
            return window.ymaps.geocode(searchQuery, {
                results: 3,
                kind: 'locality,street,house'
            }).then((res: any) => {
                const geoObject = res.geoObjects.get(0);
                if (geoObject) {
                    const coords = geoObject.geometry.getCoordinates();
                    const formattedAddress = geoObject.getAddressLine();

                    // Проверяем, что это действительно адрес в Хабаровске
                    if (formattedAddress.toLowerCase().includes('хабаровск') ||
                        formattedAddress.toLowerCase().includes('хабаровский')) {
                        console.log('Найден адрес:', formattedAddress, 'координаты:', coords);
                        return {
                            position: [coords[0], coords[1]],
                            formattedAddress
                        };
                    }
                }

                // Если это не последняя попытка, пробуем следующий вариант
                if (attempt < searchVariants.length - 1) {
                    return tryGeocode(searchVariants[attempt + 1], attempt + 1);
                }

                return null;
            }).catch(() => {
                // Если ошибка и это не последняя попытка, пробуем следующий вариант
                if (attempt < searchVariants.length - 1) {
                    return tryGeocode(searchVariants[attempt + 1], attempt + 1);
                }
                return null;
            });
        };

        // Начинаем поиск с первого варианта
        tryGeocode(searchVariants[0], 0).then((result) => {
            resolve(result);
        });
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

// Сервис для поиска улиц Хабаровска
const searchHabarovskStreets = async (query: string): Promise<string[]> => {
    if (!window.ymaps || query.length < 2) return [];

    return new Promise((resolve) => {
        // Улучшенный поиск улиц Хабаровска
        const searchQueries = [
            `${query}, Хабаровск`,
            `Хабаровск, ${query}`,
            `улица ${query}, Хабаровск`,
            `проспект ${query}, Хабаровск`,
            `бульвар ${query}, Хабаровск`,
            `переулок ${query}, Хабаровск`,
            `${query}, Хабаровский край`,
            `Хабаровский край, ${query}`
        ];

        Promise.all(searchQueries.map(searchQuery =>
            window.ymaps.geocode(searchQuery, {
                results: 3,
                // Убираем boundedBy для более широкого поиска
                kind: 'locality,street' // Ищем только улицы и населенные пункты
            }).catch(() => null)
        )).then((results) => {
            const suggestions: string[] = [];
            const seen = new Set<string>();

            results.forEach(res => {
                if (res) {
                    res.geoObjects.each((geoObject: any) => {
                        const address = geoObject.getAddressLine();

                        // Фильтруем только адреса Хабаровска
                        if (address &&
                            !seen.has(address) &&
                            (address.toLowerCase().includes('хабаровск') ||
                                address.toLowerCase().includes('хабаровский') ||
                                address.includes('Хабаровск') ||
                                address.includes('Хабаровский'))) {

                            seen.add(address);
                            suggestions.push(address);
                        }
                    });
                }
            });

            // Если ничего не найдено, попробуем более простой поиск
            if (suggestions.length === 0) {
                window.ymaps.geocode(`${query}`, {
                    results: 10,
                    kind: 'locality,street'
                }).then((res: any) => {
                    const fallbackSuggestions: string[] = [];
                    res.geoObjects.each((geoObject: any) => {
                        const address = geoObject.getAddressLine();
                        if (address &&
                            !seen.has(address) &&
                            (address.toLowerCase().includes('хабаровск') ||
                                address.toLowerCase().includes('хабаровский'))) {
                            seen.add(address);
                            fallbackSuggestions.push(address);
                        }
                    });
                    resolve([...suggestions, ...fallbackSuggestions].slice(0, 10));
                }).catch(() => {
                    resolve(suggestions);
                });
            } else {
                resolve(suggestions.slice(0, 10));
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

    const [statusFilter, setStatusFilter] = useState<ObjectStatus | 'all'>('all');
    const [addingObject, setAddingObject] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
    const navigate = useNavigate();

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
    const loadObjects = async () => {
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
    };

    // Загрузка объектов при монтировании компонента
    useEffect(() => {
        loadObjects();
    }, []);

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

    // Функция для центрирования карты по адресу (без обновления поля поиска)
    const centerMapOnAddress = async (address: string, updateField: boolean = false) => {
        if (!mapInstance || !address.trim()) return;

        try {
            const geocodeResult = await geocodeAddress(address);
            if (geocodeResult) {
                // Центрируем карту на найденном адресе с подходящим зумом
                mapInstance.setCenter(geocodeResult.position, 16);

                // Показываем маркер выбранного адреса
                setSelectedPosition(geocodeResult.position);

                // Обновляем поле поиска только если это требуется
                if (updateField) {
                    setStreetSearch(geocodeResult.formattedAddress);
                }
            }
        } catch (error) {
            console.error('Ошибка центрирования карты:', error);
        }
    };

    // Debounced функция для поиска улиц (без центрирования карты)
    const debouncedStreetSearch = async (value: string) => {
        if (value.length >= 3) {
            const suggestions = await searchHabarovskStreets(value);
            setStreetSuggestions(suggestions);
            // Убираем автоматическое центрирование карты при вводе
        } else {
            setStreetSuggestions([]);
        }
    };

    // Поиск улиц Хабаровска с debounce
    const handleStreetSearch = async (value: string) => {
        setStreetSearch(value);


        // Очищаем предыдущий таймаут
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Устанавливаем новый таймаут для debounce
        searchTimeoutRef.current = setTimeout(() => {
            debouncedStreetSearch(value);
        }, 500); // 500ms задержка
    };

    // Обработчик нажатия Enter в поле поиска
    const handleStreetSearchKeyPress = async (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && streetSearch.trim()) {
            event.preventDefault();
            setStreetSuggestions([]);

            // Центрируем карту по введенному адресу
            await centerMapOnAddress(streetSearch, true);
        }
    };

    // Выбор улицы из поиска
    const handleStreetSelect = async (address: string) => {
        setStreetSearch(address);
        setStreetSuggestions([]);

        try {
            // Получаем координаты выбранного адреса
            const geocodeResult = await geocodeAddress(address);
            if (geocodeResult) {
                // Центрируем карту на найденном адресе
                if (mapInstance) {
                    mapInstance.setCenter(geocodeResult.position, 16);
                    setSelectedPosition(geocodeResult.position);
                }

                // Обновляем поле поиска
                setStreetSearch(geocodeResult.formattedAddress);

                showSnackbar(`Карта центрирована на улице: ${geocodeResult.formattedAddress}`, 'success');
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
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
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

            let position: [number, number];
            if (selectedPosition) {
                position = selectedPosition;
            } else {
                const geocodeResult = await geocodeAddress(newObject.address);
                if (!geocodeResult) {
                    showSnackbar('Не удалось определить координаты адреса', 'error');
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
            showSnackbar('Объект успешно добавлен', 'success');
        } catch (err) {
            console.error('Ошибка добавления объекта:', err);
            showSnackbar('Ошибка при добавлении объекта', 'error');
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

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            {/* Заголовок страницы */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton
                    onClick={() => navigate('/')}
                    sx={{
                        mr: 2,
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
                <Typography variant="h4" component="h1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                    Управление объектами
                </Typography>
            </Box>

            {/* Компактная компоновка: левая панель и карта справа */}
            <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 200px)' }}>
                {/* Левая панель с поиском и фильтрами */}
                <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Поиск улиц Хабаровска */}
                    <Paper sx={{ p: 2, flex: 1 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: colors.secondary.main, fontWeight: 600 }}>
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
                            onInputChange={(_, value) => handleStreetSearch(value)}
                            onKeyPress={handleStreetSearchKeyPress}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Введите улицу Хабаровска"
                                    placeholder="Например: ул. Ленина"
                                    fullWidth
                                    size="small"
                                    sx={{
                                        '& .MuiInputLabel-root': {
                                            color: 'text.secondary'
                                        }
                                    }}
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box component="li" {...props}>
                                    <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                                    {option}
                                </Box>
                            )}
                        />

                        {/* Быстрые ссылки на популярные улицы */}
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Популярные улицы:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {[
                                    'ул. Ленина, Хабаровск',
                                    'Амурский бульвар, Хабаровск',
                                    'ул. Карла Маркса, Хабаровск',
                                    'ул. Муравьева-Амурского, Хабаровск',
                                    'ул. Серышева, Хабаровск',
                                    'ул. Пушкина, Хабаровск'
                                ].map((street) => (
                                    <Chip
                                        key={street}
                                        label={street.split(',')[0]}
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleStreetSelect(street)}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Paper>

                    {/* Фильтр по статусам */}
                    <Paper sx={{ p: 2, flex: 1 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: colors.secondary.main, fontWeight: 600 }}>
                            Фильтр по статусу
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                                label="Все объекты"
                                onClick={() => setStatusFilter('all')}
                                color={statusFilter === 'all' ? 'primary' : 'default'}
                                variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                                icon={<CircleIcon sx={{ fontSize: 16 }} />}
                            />
                            <Chip
                                label="Активные"
                                onClick={() => setStatusFilter('active')}
                                color={statusFilter === 'active' ? 'primary' : 'default'}
                                variant={statusFilter === 'active' ? 'filled' : 'outlined'}
                                icon={<CircleIcon sx={{ fontSize: 16, color: colors.status.success }} />}
                            />
                            <Chip
                                label="Неактивные"
                                onClick={() => setStatusFilter('inactive')}
                                color={statusFilter === 'inactive' ? 'primary' : 'default'}
                                variant={statusFilter === 'inactive' ? 'filled' : 'outlined'}
                                icon={<CircleIcon sx={{ fontSize: 16, color: colors.status.error }} />}
                            />
                            <Chip
                                label="На обслуживании"
                                onClick={() => setStatusFilter('maintenance')}
                                color={statusFilter === 'maintenance' ? 'primary' : 'default'}
                                variant={statusFilter === 'maintenance' ? 'filled' : 'outlined'}
                                icon={<CircleIcon sx={{ fontSize: 16, color: colors.status.warning }} />}
                            />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Показано: {filtered.length} из {objects.length} объектов
                        </Typography>
                    </Paper>
                </Box>

                {/* Карта справа */}
                <Paper sx={{ width: '50%', p: 2 }}>
                    <SimpleYandexMap
                        key={`map-${objects.length}-${filteredMarkers.length}`}
                        center={DEFAULT_CENTER}
                        zoom={12}
                        markers={filteredMarkers}
                        onMarkerClick={handleMarkerClick}
                        onMapClick={handleMapClick}
                        selectedPosition={selectedPosition}
                        onMapReady={handleMapReady}
                        hoveredObjectId={hoveredObjectId}
                    />
                </Paper>
            </Box>

            {/* Панель поиска и добавления */}
            <Paper sx={{ mb: 3, p: 2, mt: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        label="Поиск по объектам"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        size="small"
                        sx={{ flex: 1, minWidth: 200 }}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setAddDialogOpen(true)}
                    >
                        Добавить объект
                    </Button>
                </Box>
            </Paper>

            {/* Список объектов в виде карточек */}
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
                <Box sx={{
                    display: 'grid',
                    gap: 3,
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    '@media (max-width: 600px)': {
                        gridTemplateColumns: '1fr'
                    }
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
                                    transform: 'scale(1.02)',
                                    boxShadow: 4
                                }
                            }}
                            onClick={() => setSelectedId(obj.id)}
                            onMouseEnter={() => setHoveredObjectId(obj.id)}
                            onMouseLeave={() => setHoveredObjectId(null)}
                        >
                            <CardContent sx={{
                                pb: 1,
                                px: 3,
                                py: 2.5,
                                textAlign: 'left',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%'
                            }}>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                        <LocationIcon sx={{ mr: 1.5, color: colors.secondary.main, fontSize: 20 }} />
                                        <Typography variant="subtitle1" component="h3" noWrap sx={{
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            flex: 1
                                        }}>
                                            {obj.name}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{
                                        mb: 1.5,
                                        fontSize: '0.85rem',
                                        lineHeight: 1.4
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
                                            fontSize: '0.8rem',
                                            lineHeight: 1.5,
                                            '&:hover': {
                                                color: colors.secondary.main
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
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDescription(obj.id);
                                                }}
                                                sx={{
                                                    p: 0,
                                                    mt: 0.5,
                                                    color: colors.secondary.main,
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(212, 175, 55, 0.1)'
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
                                            size="small"
                                            color="primary"
                                            onClick={() => handleEditClick(obj)}
                                            sx={{
                                                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(25, 118, 210, 0.2)'
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
                                                    fontSize: '0.7rem'
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
    );
};

export default ObjectManagement; 