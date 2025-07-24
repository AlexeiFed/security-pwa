/**
 * @file: YandexMap.tsx
 * @description: Компонент карты с интеграцией Яндекс.Карт API
 * @dependencies: react, yandex-maps, colors
 * @created: 2025-06-27
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { colors } from '../../utils/colors';
import { MapMarker } from '../../types';

// Типы для Яндекс.Карт
declare global {
    interface Window {
        ymaps: any;
    }
}

interface YandexMapProps {
    center?: [number, number]; // [latitude, longitude]
    zoom?: number;
    markers?: MapMarker[];
    hoveredObjectId?: string | null;
    onMarkerClick?: (markerId: string) => void;
    onMarkerHover?: (markerId: string) => void;
    onMarkerLeave?: () => void;
    onMapClick?: (coordinates: { lat: number; lng: number }) => void;
    height?: string | number;
    width?: string | number;
    showCurrentLocation?: boolean;
    showClickMarker?: boolean;
    className?: string;
    // Новые пропсы для маршрутизации
    showRoute?: boolean;
    routeToObjectId?: string | null;
    onRouteCalculated?: (routeInfo: { distance: string; duration: string }) => void;
    onRouteClose?: () => void;
}

const YandexMap: React.FC<YandexMapProps> = ({
    center = [55.7558, 37.6176], // Москва по умолчанию [lat, lng]
    zoom = 10,
    markers = [],
    hoveredObjectId,
    onMarkerClick,
    onMarkerHover,
    onMarkerLeave,
    onMapClick,
    height = 400,
    width = '100%',
    showCurrentLocation = false,
    showClickMarker = false,
    className,
    showRoute = false,
    routeToObjectId = null,
    onRouteCalculated,
    onRouteClose
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const clickMarkerRef = useRef<any>(null);
    const markerObjectsRef = useRef<any[]>([]);
    const routeRef = useRef<any>(null);
    const currentLocationRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apiReady, setApiReady] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

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

                        // Если точность хуже 50 метров, пробуем еще раз
                        if (accuracy > 50 && attempts < maxAttempts) {
                            console.log(`⚠️ Точность ${accuracy}м недостаточна, повторная попытка...`);
                            setTimeout(tryGetLocation, 2000);
                            return;
                        }

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

            // Создаем маршрут
            const multiRoute = new window.ymaps.multiRouter.MultiRoute({
                referencePoints: [
                    from,
                    to
                ],
                params: {
                    routingMode: 'driving'
                }
            }, {
                boundsAutoApply: true,
                routeActiveStrokeWidth: 4,
                routeActiveStrokeColor: '#1976d2',
                routeStrokeColor: '#1976d2',
                routeStrokeWidth: 3
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
                    if (onRouteCalculated) {
                        onRouteCalculated(routeData);
                    }
                }
            });

        } catch (error) {
            console.error('Ошибка построения маршрута:', error);
        }
    };

    // Инициализация карты
    useEffect(() => {
        if (!window.ymaps || !mapRef.current || loading || !apiReady) return;
        if (mapInstanceRef.current) return;
        try {
            const [lat, lng] = center;
            const map = new window.ymaps.Map(mapRef.current, {
                center: [lat, lng],
                zoom: zoom,
                controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
                // Включаем поддержку поворота карты для мобильных устройств
                suppressMapOpenBlock: true,
                // Разрешаем жесты для поворота
                suppressObsoleteBrowserNotifier: true
            });

            // Включаем поддержку жестов для поворота карты
            map.behaviors.enable('drag');
            map.behaviors.enable('scrollZoom');

            // Для мобильных устройств включаем дополнительные жесты
            if ('ontouchstart' in window) {
                // Включаем поддержку мультитач для поворота
                map.behaviors.enable('multiTouch');
                // Включаем поддержку жестов для поворота карты
                map.behaviors.enable('pinchZoom');
            }
            mapInstanceRef.current = map;
            if (onMapClick) {
                map.events.add('click', (e: any) => {
                    const coords = e.get('coords');
                    if (clickMarkerRef.current) {
                        map.geoObjects.remove(clickMarkerRef.current);
                    }
                    if (showClickMarker) {
                        const clickMarker = new window.ymaps.Placemark(
                            coords,
                            { balloonContent: 'Выбранная точка' },
                            { preset: 'islands#blueDotIcon', iconColor: '#1976d2' }
                        );
                        map.geoObjects.add(clickMarker);
                        clickMarkerRef.current = clickMarker;
                    }
                    onMapClick({ lat: coords[0], lng: coords[1] });
                });
            }
            if (showCurrentLocation) {
                window.ymaps.geolocation.get({ provider: 'browser', mapStateAutoApply: true }).then((result: any) => {
                    result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
                    map.geoObjects.add(result.geoObjects);
                });
            }
        } catch (err) {
            setError('Ошибка инициализации карты');
        }
    }, [loading, apiReady, center, zoom, onMapClick, showCurrentLocation, showClickMarker]);

    // Обновление маркеров
    useEffect(() => {
        if (!window.ymaps || !mapInstanceRef.current || !apiReady) return;
        const map = mapInstanceRef.current;
        markerObjectsRef.current.forEach(marker => map.geoObjects.remove(marker));
        markerObjectsRef.current = [];
        markers.forEach((marker) => {
            if (!marker.position || marker.position.length !== 2) return;
            const [lat, lng] = marker.position;
            const markerOptions: any = {
                preset: 'islands#blueDotIcon',
                iconColor: '#1976d2',
                iconImageSize: [32, 32],
                iconImageOffset: [-16, -16]
            };
            if (marker.isSelected) {
                markerOptions.iconImageSize = [48, 48];
                markerOptions.iconImageOffset = [-24, -24];
                markerOptions.strokeColor = '#1976d2';
                markerOptions.strokeWidth = 3;
            }
            if (hoveredObjectId === marker.id) {
                markerOptions.preset = 'islands#redIcon';
                markerOptions.iconColor = '#d32f2f';
                markerOptions.iconImageSize = [40, 40];
                markerOptions.iconImageOffset = [-20, -20];
                markerOptions.strokeColor = '#d32f2f';
                markerOptions.strokeWidth = 3;
            }
            const placemark = new window.ymaps.Placemark(
                [lat, lng],
                {
                    balloonContent: `<div style="padding: 10px; min-width: 200px;"><h3 style="margin: 0 0 10px 0; color: #1976d2;">${marker.title}</h3><p style="margin: 5px 0; color: #666;">Статус: ${marker.status === 'checked' ? 'Активен' : 'Проблемы'}</p></div>`,
                    iconContent: marker.isSelected ? marker.title : undefined
                },
                markerOptions
            );
            if (onMarkerClick) {
                placemark.events.add('click', () => {
                    onMarkerClick(marker.id);
                });
            }
            if (onMarkerHover) {
                placemark.events.add('mouseenter', () => {
                    onMarkerHover(marker.id);
                });
            }
            if (onMarkerLeave) {
                placemark.events.add('mouseleave', () => {
                    onMarkerLeave();
                });
            }
            map.geoObjects.add(placemark);
            markerObjectsRef.current.push(placemark);
        });
    }, [markers, hoveredObjectId, onMarkerClick, onMarkerHover, onMarkerLeave, apiReady]);

    // Построение маршрута при изменении параметров
    useEffect(() => {
        if (!showRoute || !routeToObjectId || !mapInstanceRef.current || !apiReady) return;

        let isBuilt = false;
        const targetMarker = markers.find(m => m.id === routeToObjectId);
        if (!targetMarker || !targetMarker.position) return;

        const buildRouteToObject = async () => {
            if (isBuilt) return;
            isBuilt = true;
            try {
                // Получаем текущее местоположение
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
                                <p style="margin: 5px 0; color: #666;">Статус: Активное отслеживание</p>
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
                await buildRoute(location, targetMarker.position);
            } catch (error) {
                console.error('Ошибка построения маршрута:', error);
            }
        };

        buildRouteToObject();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showRoute, routeToObjectId, apiReady]);

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
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }
    return (
        <div
            ref={mapRef}
            id="yandex-map-container"
            style={{
                height: typeof height === 'number' ? `${height}px` : height,
                width: typeof width === 'number' ? `${width}px` : width,
                border: `1px solid ${colors.border.light}`,
                backgroundColor: '#f0f0f0',
                minHeight: 200,
                minWidth: 200,
                position: 'relative'
            }}
        />
    );
};

export default YandexMap; 