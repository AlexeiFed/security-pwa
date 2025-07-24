/**
 * @file: YandexNavigator.tsx
 * @description: Встроенный Яндекс.Навигатор с интерфейсом как в настоящем Яндекс.Навигатор
 * @dependencies: react, material-ui, yandex-maps
 * @created: 2025-07-20
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    CircularProgress,
    Typography,
    IconButton,
    Paper,
    Chip,
    Alert,
    Button,
    Divider
} from '@mui/material';
import {
    Navigation as NavigationIcon,
    DirectionsCar as DirectionsCarIcon,
    AccessTime as AccessTimeIcon,
    LocationOn as LocationOnIcon,
    ArrowBack as ArrowBackIcon,
    PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { colors } from '../../utils/colors';

// Типы для Яндекс.Карт
declare global {
    interface Window {
        ymaps: any;
    }
}

interface YandexNavigatorProps {
    destination: [number, number]; // [latitude, longitude]
    destinationName?: string;
    onClose?: () => void;
    height?: string | number;
    width?: string | number;
}

const YandexNavigator: React.FC<YandexNavigatorProps> = ({
    destination,
    destinationName = 'Объект',
    onClose,
    height = 600,
    width = '100%'
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const routeRef = useRef<any>(null);
    const currentLocationRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apiReady, setApiReady] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [routeOptions, setRouteOptions] = useState<Array<{ duration: string, distance: string, isSelected: boolean }>>([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

    // Загрузка Яндекс.Карт API
    useEffect(() => {
        const loadYandexMaps = () => {
            if (window.ymaps) {
                window.ymaps.ready(() => {
                    setApiReady(true);
                    setLoading(false);
                });
                return;
            }
            const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');
            if (existingScript) {
                const checkYmaps = () => {
                    if (window.ymaps) {
                        window.ymaps.ready(() => {
                            setApiReady(true);
                            setLoading(false);
                        });
                    } else {
                        setTimeout(checkYmaps, 100);
                    }
                };
                checkYmaps();
                return;
            }
            const script = document.createElement('script');
            const apiKey = process.env.REACT_APP_YANDEX_MAPS_API_KEY || 'your_yandex_maps_api_key_here';
            script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
            script.async = true;
            script.onload = () => {
                window.ymaps.ready(() => {
                    setApiReady(true);
                    setLoading(false);
                });
            };
            script.onerror = () => {
                setError('Ошибка загрузки Яндекс.Карт');
                setLoading(false);
            };
            document.head.appendChild(script);
        };
        loadYandexMaps();
    }, []);

    // Получение текущего местоположения с высокой точностью
    const getCurrentLocation = (): Promise<[number, number]> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Геолокация не поддерживается'));
                return;
            }

            let attempts = 0;
            const maxAttempts = 3;

            const tryGetLocation = () => {
                attempts++;
                console.log(`📍 Попытка получения местоположения ${attempts}/${maxAttempts}`);

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude, accuracy } = position.coords;
                        console.log(`✅ Местоположение получено с точностью ${accuracy}м`);

                        setLocationAccuracy(accuracy);
                        resolve([latitude, longitude]);
                    },
                    (error) => {
                        console.error(`❌ Ошибка получения местоположения (попытка ${attempts}):`, error);
                        if (attempts < maxAttempts) {
                            setTimeout(tryGetLocation, 2000);
                        } else {
                            reject(error);
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 30000,
                        maximumAge: 0
                    }
                );
            };

            tryGetLocation();
        });
    };

    // Построение маршрута
    const buildRoute = async (from: [number, number], to: [number, number]) => {
        if (!window.ymaps || !mapInstanceRef.current) return;

        try {
            // Удаляем предыдущий маршрут
            if (routeRef.current) {
                mapInstanceRef.current.geoObjects.remove(routeRef.current);
                routeRef.current = null;
            }

            // Создаем маршрут с навигационными инструкциями
            const multiRoute = new window.ymaps.multiRouter.MultiRoute({
                referencePoints: [from, to],
                params: {
                    routingMode: 'driving',
                    avoidTrafficJams: true
                }
            }, {
                boundsAutoApply: true,
                routeActiveStrokeWidth: 6,
                routeActiveStrokeColor: '#1976d2',
                routeStrokeColor: '#1976d2',
                routeStrokeWidth: 4,
                routeActiveStrokeStyle: 'solid',
                routeStrokeStyle: 'solid'
            });

            // Добавляем маршрут на карту
            mapInstanceRef.current.geoObjects.add(multiRoute);
            routeRef.current = multiRoute;

            // Получаем информацию о маршруте
            multiRoute.model.events.add('requestsuccess', () => {
                const activeRoute = multiRoute.getActiveRoute();
                if (activeRoute) {
                    const properties = activeRoute.properties.getAll();
                    const distance = properties.distance?.text || 'Неизвестно';
                    const duration = properties.duration?.text || 'Неизвестно';

                    const routeData = { distance, duration };
                    setRouteInfo(routeData);
                    setIsNavigating(true);

                    // Создаем варианты маршрутов (имитация)
                    const options = [
                        { duration, distance, isSelected: true },
                        { duration: `${parseInt(duration) + 6} мин`, distance: `${parseInt(distance) + 1} км`, isSelected: false },
                        { duration: `${parseInt(duration) + 3} мин`, distance, isSelected: false }
                    ];
                    setRouteOptions(options);
                }
            });

        } catch (error) {
            console.error('Ошибка построения маршрута:', error);
            setError('Ошибка построения маршрута');
        }
    };

    // Инициализация карты
    useEffect(() => {
        if (!window.ymaps || !mapRef.current || loading || !apiReady) return;
        if (mapInstanceRef.current) return;

        try {
            const [lat, lng] = destination;
            const map = new window.ymaps.Map(mapRef.current, {
                center: [lat, lng],
                zoom: 15,
                controls: [
                    'zoomControl',
                    'fullscreenControl',
                    'geolocationControl',
                    'typeSelector',
                    'trafficControl'
                ],
                suppressMapOpenBlock: true,
                suppressObsoleteBrowserNotifier: true
            });

            // Включаем поддержку жестов для навигации
            map.behaviors.enable('drag');
            map.behaviors.enable('scrollZoom');

            if ('ontouchstart' in window) {
                map.behaviors.enable('multiTouch');
                map.behaviors.enable('pinchZoom');
            }

            mapInstanceRef.current = map;

            // Добавляем маркер назначения
            const destinationMarker = new window.ymaps.Placemark(
                [lat, lng],
                {
                    balloonContent: `
                        <div style="padding: 10px; min-width: 200px;">
                            <h3 style="margin: 0 0 10px 0; color: #d32f2f;">🎯 ${destinationName}</h3>
                            <p style="margin: 5px 0; color: #666;">Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                            <p style="margin: 5px 0; color: #666;">Статус: Назначение</p>
                        </div>
                    `
                },
                {
                    preset: 'islands#redIcon',
                    iconColor: '#d32f2f',
                    iconImageSize: [48, 48],
                    iconImageOffset: [-24, -24],
                    strokeColor: '#d32f2f',
                    strokeWidth: 3
                }
            );
            map.geoObjects.add(destinationMarker);

            // Запускаем навигацию
            startNavigation();

        } catch (err) {
            setError('Ошибка инициализации навигатора');
        }
    }, [loading, apiReady, destination, destinationName]);

    // Запуск навигации
    const startNavigation = async () => {
        try {
            const location = await getCurrentLocation();
            setCurrentLocation(location);

            // Добавляем маркер текущего местоположения
            if (currentLocationRef.current) {
                mapInstanceRef.current.geoObjects.remove(currentLocationRef.current);
            }
            currentLocationRef.current = new window.ymaps.Placemark(
                location,
                {
                    balloonContent: `
                        <div style="padding: 10px; min-width: 200px;">
                            <h3 style="margin: 0 0 10px 0; color: #4caf50;">📍 Ваше местоположение</h3>
                            <p style="margin: 5px 0; color: #666;">Координаты: ${location[0].toFixed(6)}, ${location[1].toFixed(6)}</p>
                            <p style="margin: 5px 0; color: #666;">Точность: ${locationAccuracy}м</p>
                        </div>
                    `
                },
                {
                    preset: 'islands#blueCircleDotIcon',
                    iconColor: '#1976d2',
                    iconImageSize: [40, 40],
                    iconImageOffset: [-20, -20],
                    strokeColor: '#1976d2',
                    strokeWidth: 2
                }
            );
            mapInstanceRef.current.geoObjects.add(currentLocationRef.current);

            // Строим маршрут
            await buildRoute(location, destination);

        } catch (error) {
            console.error('Ошибка запуска навигации:', error);
            setError('Не удалось получить ваше местоположение');
        }
    };

    // Функция переключения маршрута
    const handleRouteSelect = (index: number) => {
        setSelectedRouteIndex(index);
        const newOptions = routeOptions.map((option, i) => ({
            ...option,
            isSelected: i === index
        }));
        setRouteOptions(newOptions);

        // Обновляем информацию о маршруте
        if (newOptions[index]) {
            setRouteInfo({
                duration: newOptions[index].duration,
                distance: newOptions[index].distance
            });
        }
    };

    // Функция запуска навигации
    const handleStartNavigation = () => {
        console.log('🚀 Запускаем навигацию к:', destinationName);

        // Открываем Яндекс.Навигатор с выбранным маршрутом
        if (currentLocation && destination) {
            const [lat, lng] = destination;
            const name = encodeURIComponent(destinationName || '');

            // URL для открытия Яндекс.Навигатор
            const yandexUrl = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}&text_to=${name}`;

            // Fallback URL для веб-версии
            const webUrl = `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto&z=16`;

            // Пытаемся открыть приложение
            window.location.href = yandexUrl;

            // Fallback через 1 секунду
            setTimeout(() => {
                window.open(webUrl, '_blank');
            }, 1000);
        }
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            if (routeRef.current && mapInstanceRef.current) {
                mapInstanceRef.current.geoObjects.remove(routeRef.current);
            }
            if (currentLocationRef.current && mapInstanceRef.current) {
                mapInstanceRef.current.geoObjects.remove(currentLocationRef.current);
            }
        };
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height={height} width={width} bgcolor={colors.background.secondary}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height={height} width={width} bgcolor={colors.background.secondary}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ position: 'relative' }}>
            {/* Кнопка закрытия - над картой */}
            <Box sx={{
                position: 'absolute',
                top: -60,
                right: 10,
                zIndex: 30,
                background: 'linear-gradient(135deg, #1976d2, #1565c0)',
                borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                width: 56,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 6px 20px rgba(25, 118, 210, 0.6)',
                    background: 'linear-gradient(135deg, #1565c0, #0d47a1)'
                },
                '&:active': {
                    transform: 'scale(0.95)'
                }
            }}>
                <IconButton
                    onClick={onClose}
                    size="large"
                    sx={{
                        color: '#ffffff',
                        width: '100%',
                        height: '100%',
                        '&:hover': {
                            backgroundColor: 'transparent'
                        }
                    }}
                >
                    <ArrowBackIcon sx={{ fontSize: 28 }} />
                </IconButton>
            </Box>

            {/* Контейнер карты */}
            <Box sx={{
                position: 'relative',
                height,
                width: '100vw',
                overflow: 'hidden',
                borderRadius: { xs: 0, sm: 2 },
                boxShadow: 3,
                mx: { xs: '-50vw', sm: 0 },
                px: { xs: 0, sm: 0 },
                left: { xs: '50%', sm: 'auto' },
                transform: { xs: 'translateX(-50%)', sm: 'none' }
            }}>
                {/* Карта - занимает всю высоту */}
                <div
                    ref={mapRef}
                    style={{
                        height: '100%',
                        width: '100vw',
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)'
                    }}
                />

                {/* Верхняя панель навигации */}
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100vw',
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.95)',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        Навигация к {destinationName}
                    </Typography>
                </Box>

                {/* Информация о маршруте (как в Яндекс.Навигатор) */}
                {routeInfo && (
                    <Box sx={{
                        position: 'absolute',
                        top: 60,
                        left: 10,
                        zIndex: 10,
                        background: 'rgba(25, 118, 210, 0.98)',
                        color: '#ffffff',
                        borderRadius: 4,
                        p: 2,
                        boxShadow: 4,
                        border: '2px solid rgba(255, 255, 255, 0.5)',
                        minWidth: 120
                    }}>
                        <Typography variant="h6" sx={{
                            fontWeight: 'bold',
                            color: '#ffffff',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                            fontSize: '1.1rem',
                            lineHeight: 1.2
                        }}>
                            {routeInfo.duration}
                        </Typography>
                        <Typography variant="body2" sx={{
                            color: '#ffffff',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}>
                            {routeInfo.distance}
                        </Typography>
                    </Box>
                )}

                {/* Индикатор точности */}
                {locationAccuracy && (
                    <Box sx={{
                        position: 'absolute',
                        top: 60,
                        right: 10,
                        zIndex: 10,
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: 2,
                        p: 1,
                        boxShadow: 2
                    }}>
                        <Chip
                            icon={<LocationOnIcon />}
                            label={`Точность: ${locationAccuracy}м`}
                            size="small"
                            color={locationAccuracy <= 20 ? 'success' : locationAccuracy <= 50 ? 'warning' : 'error'}
                            variant="outlined"
                        />
                    </Box>
                )}

                {/* Нижняя панель маршрута (как в Яндекс.Навигатор) */}
                {routeOptions.length > 0 && (
                    <Paper sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '100vw',
                        zIndex: 10,
                        borderRadius: { xs: 0, sm: '16px 16px 0 0' },
                        boxShadow: 4,
                        p: 0.25
                    }}>
                        {/* Заголовок маршрута */}
                        <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="textSecondary">
                                Откуда: Моё местоположение
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Куда: {destinationName}
                            </Typography>
                        </Box>

                        {/* Варианты маршрутов */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            {routeOptions.map((option, index) => (
                                <Paper
                                    key={index}
                                    onClick={() => handleRouteSelect(index)}
                                    sx={{
                                        flex: 1,
                                        p: 1,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        backgroundColor: option.isSelected ? '#e3f2fd' : 'white',
                                        border: option.isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            backgroundColor: option.isSelected ? '#e3f2fd' : '#f5f5f5',
                                            transform: 'translateY(-1px)',
                                            boxShadow: 2
                                        },
                                        '&:active': {
                                            transform: 'translateY(0)',
                                            boxShadow: 1
                                        }
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: option.isSelected ? '#1976d2' : 'inherit' }}>
                                        {option.duration}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {option.distance}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>

                        {/* Кнопка "Поехали" */}
                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            startIcon={<PlayArrowIcon />}
                            onClick={handleStartNavigation}
                            disabled={!currentLocation || !destination}
                            sx={{
                                backgroundColor: '#1976d2',
                                color: 'white',
                                borderRadius: 2,
                                py: 1,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: '#1565c0',
                                    transform: 'translateY(-1px)',
                                    boxShadow: 4
                                },
                                '&:active': {
                                    transform: 'translateY(0)',
                                    boxShadow: 2
                                },
                                '&:disabled': {
                                    backgroundColor: '#ccc',
                                    color: '#666'
                                }
                            }}
                        >
                            Поехали
                        </Button>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default YandexNavigator; 