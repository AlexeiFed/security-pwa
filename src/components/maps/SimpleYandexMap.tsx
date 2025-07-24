/**
 * @file: SimpleYandexMap.tsx
 * @description: Минималистичная карта Яндекс с поддержкой маркеров и выбора точки
 * @dependencies: react, window.ymaps
 * @created: 2025-06-30
 */

import React, { useEffect, useRef } from 'react';
import { colors } from '../../utils/colors';

interface Marker {
    id: string;
    position: [number, number];
    title: string;
    address?: string;
    status?: string;
    description?: string;
}

interface SimpleYandexMapProps {
    center: [number, number];
    zoom: number;
    markers: Marker[];
    onMarkerClick?: (id: string) => void;
    onMapClick?: (position: [number, number]) => void;
    selectedPosition?: [number, number] | null;
    onMapReady?: (map: any) => void;
    hoveredObjectId?: string | null;
}

const SimpleYandexMap: React.FC<SimpleYandexMapProps> = ({
    center,
    zoom,
    markers,
    onMarkerClick,
    onMapClick,
    selectedPosition,
    onMapReady,
    hoveredObjectId
}) => {
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
                        if (mapInstance.current) {
                            mapInstance.current.destroy();
                        }
                        const map = new window.ymaps.Map(mapRef.current, {
                            center: center,
                            zoom: zoom,
                            controls: ['zoomControl', 'geolocationControl'],
                            suppressMapOpenBlock: true
                        });
                        mapInstance.current = map;
                        isInitialized.current = true;
                        if (onMapReady) {
                            onMapReady(map);
                        }
                        map.behaviors.disable('scrollZoom');
                        map.behaviors.enable('scrollZoom');
                        markers.forEach(marker => {
                            const isHovered = hoveredObjectId && marker.id === hoveredObjectId;
                            const balloonContent = `
                                <div style='min-width:180px;'>
                                    <strong>${marker.title}</strong><br/>
                                    <span>${marker.address || ''}</span><br/>
                                    <span>Статус: ${marker.status || ''}</span><br/>
                                    <span>${marker.description || ''}</span>
                                </div>
                            `;
                            const placemark = new window.ymaps.Placemark(
                                marker.position,
                                { balloonContent },
                                {
                                    preset: isHovered ? 'islands#redIcon' : 'islands#blueDotIcon',
                                    iconColor: isHovered ? colors.status.error : undefined,
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
                        if (onMapClick) {
                            map.events.add('click', (e: any) => {
                                const coords = e.get('coords');
                                onMapClick([coords[0], coords[1]]);
                            });
                        }
                        if (selectedPosition) {
                            if (selectedPlacemark.current) {
                                map.geoObjects.remove(selectedPlacemark.current);
                            }
                            selectedPlacemark.current = new window.ymaps.Placemark(
                                selectedPosition,
                                { balloonContent: 'Выбранная позиция' },
                                {
                                    preset: 'islands#redDotIcon',
                                    suppressMapOpenBlock: true
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

    useEffect(() => {
        if (mapInstance.current && isInitialized.current) {
            mapInstance.current.geoObjects.removeAll();
            markers.forEach(marker => {
                const isHovered = hoveredObjectId && marker.id === hoveredObjectId;
                const balloonContent = `
                    <div style='min-width:180px;'>
                        <strong>${marker.title}</strong><br/>
                        <span>${marker.address || ''}</span><br/>
                        <span>Статус: ${marker.status || ''}</span><br/>
                        <span>${marker.description || ''}</span>
                    </div>
                `;
                const placemark = new window.ymaps.Placemark(
                    marker.position,
                    { balloonContent },
                    {
                        preset: isHovered ? 'islands#redIcon' : 'islands#blueDotIcon',
                        iconColor: isHovered ? colors.status.error : undefined,
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
            }
        }
    }, [markers, selectedPosition, onMarkerClick, hoveredObjectId]);

    useEffect(() => {
        if (mapInstance.current && isInitialized.current && center) {
            mapInstance.current.setCenter(center, undefined, { duration: 300 });
        }
    }, [center]);

    return (
        <div
            ref={mapRef}
            style={{
                height: '400px',
                width: '100%',
                border: '1px solid #1976d2',
                borderRadius: '8px',
                backgroundColor: '#f0f0f0',
                minHeight: 300
            }}
        />
    );
};

export default SimpleYandexMap; 