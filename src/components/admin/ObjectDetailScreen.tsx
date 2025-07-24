/**
 * @file: ObjectDetailScreen.tsx
 * @description: Экран детальной информации об объекте с картой и навигацией
 * @dependencies: react, material-ui, objects service, maps
 * @created: 2025-07-19
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    CircularProgress,
    Alert,
    IconButton,
    Paper,
    Divider
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Navigation as NavigationIcon,
    MyLocation as MyLocationIcon,
    ArrowBack as ArrowBackIcon,
    Security as SecurityIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Route as RouteIcon
} from '@mui/icons-material';
import { getObjectById } from '../../services/objects';
import { ObjectData, Alert as AlertType } from '../../types';
import { subscribeActiveAlert } from '../../services/alerts';
import YandexMap from '../maps/YandexMap';
import Header from '../common/Header';
import InspectorBottomNavigation from '../common/BottomNavigation';
import { colors } from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';

interface ObjectDetailScreenProps {
    objectId?: string;
}

const ObjectDetailScreen: React.FC<ObjectDetailScreenProps> = ({ objectId: propObjectId }) => {
    const { objectId: paramObjectId } = useParams<{ objectId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const objectId = propObjectId || paramObjectId;

    const [object, setObject] = useState<ObjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNavigation, setShowNavigation] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [navigationRoute, setNavigationRoute] = useState<[number, number][]>([]);
    const [activeAlert, setActiveAlert] = useState<AlertType | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

    useEffect(() => {
        if (objectId) {
            loadObjectData();
        }
    }, [objectId]);

    // Подписка на активную тревогу
    useEffect(() => {
        const unsub = subscribeActiveAlert((alert) => {
            setActiveAlert(alert);
        });
        return () => unsub();
    }, []);

    const loadObjectData = async () => {
        if (!objectId) return;

        setLoading(true);
        setError(null);

        try {
            const objectData = await getObjectById(objectId);
            if (objectData) {
                setObject(objectData);
            } else {
                setError('Объект не найден');
            }
        } catch (err) {
            console.error('Ошибка загрузки объекта:', err);
            setError('Ошибка загрузки данных объекта');
        } finally {
            setLoading(false);
        }
    };

    const handleStartNavigation = () => {
        if (!object?.position) return;

        // Получаем текущее местоположение пользователя с высокой точностью
        if ('geolocation' in navigator) {
            let attempts = 0;
            const maxAttempts = 3;

            const tryGetLocation = () => {
                attempts++;
                console.log(`📍 Попытка получения местоположения ${attempts}/${maxAttempts}`);

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude, accuracy } = position.coords;
                        console.log(`✅ Местоположение получено с точностью ${accuracy}м`);

                        const userPos: [number, number] = [latitude, longitude];
                        setUserLocation(userPos);
                        setLocationAccuracy(accuracy);
                        setShowNavigation(true);

                        console.log('🚗 Навигация запущена:', {
                            from: userPos,
                            to: object.position,
                            accuracy: `${accuracy}м`
                        });

                        // Показываем информацию о точности
                        if (accuracy > 50) {
                            alert(`⚠️ Внимание: Точность определения местоположения ${accuracy}м. Рекомендуется улучшить сигнал GPS.`);
                        }
                    },
                    (error) => {
                        console.error(`❌ Ошибка получения местоположения (попытка ${attempts}):`, error);
                        if (attempts < maxAttempts) {
                            setTimeout(tryGetLocation, 2000);
                        } else {
                            alert('Не удалось получить ваше местоположение. Проверьте разрешения браузера и сигнал GPS.');
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
        } else {
            alert('Геолокация не поддерживается в вашем браузере');
        }
    };

    const handleStopNavigation = () => {
        setShowNavigation(false);
        setUserLocation(null);
        setNavigationRoute([]);
        setRouteInfo(null);
        setLocationAccuracy(null);
    };

    const handleNavigateToObject = () => {
        if (object?.position) {
            // Открываем Яндекс.Навигатор в телефоне
            const [lat, lng] = object.position;
            const url = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}`;

            // Пробуем открыть нативное приложение
            window.location.href = url;

            // Fallback на веб-версию через 1 секунду
            setTimeout(() => {
                const webUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map&rtext=~${lat},${lng}`;
                window.open(webUrl, '_blank');
            }, 1000);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'error';
            case 'maintenance': return 'warning';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'Активен';
            case 'inactive': return 'Неактивен';
            case 'maintenance': return 'На обслуживании';
            default: return status;
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !object) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error || 'Объект не найден'}
                </Alert>
                <Button variant="contained" onClick={() => navigate(-1)}>
                    Назад
                </Button>
            </Box>
        );
    }

    const handleNavigate = (page: string) => {
        if (page === 'home') {
            navigate('/');
        } else if (page === 'object') {
            // Остаемся на текущей странице объекта
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {user?.role === 'inspector' ? (
                <Header
                    title="Панель инспектора"
                    hideCompanyName={true}
                    hideTitle={true}
                    hideUserName={true}
                    showProfileMenu={true}
                    onProfileClick={() => navigate('/inspector/profile')}
                    onLogoClick={() => navigate('/')}
                />
            ) : user?.role === 'curator' ? (
                <Header
                    title="Мои объекты"
                    hideCompanyName={true}
                    hideTitle={true}
                    hideUserName={true}
                    showProfileMenu={true}
                    onProfileClick={() => navigate('/curator/profile')}
                    onLogoClick={() => navigate('/')}
                />
            ) : (
                <Header
                    title={`Объект: ${object.name}`}
                    action={
                        <IconButton
                            color="inherit"
                            onClick={() => navigate(-1)}
                            sx={{ color: 'white' }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    }
                    onLogoClick={() => navigate('/')}
                />
            )}

            <Box sx={{ flex: 1, overflow: 'auto', p: 2, pb: 7 }}>
                {/* Информация об объекте */}
                <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)` }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <SecurityIcon sx={{ fontSize: 32, color: colors.secondary.main }} />
                            <Box>
                                <Typography variant="h5" sx={{ color: colors.text.primary, fontWeight: 700 }}>
                                    {object.name}
                                </Typography>
                                <Chip
                                    label={getStatusText(object.status)}
                                    color={getStatusColor(object.status)}
                                    size="small"
                                />
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2, borderColor: colors.text.secondary }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="body1" sx={{ color: colors.text.primary }}>
                                <strong>Адрес:</strong> {object.address}
                            </Typography>
                            {object.description && (
                                <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                                    <strong>Описание:</strong> {object.description}
                                </Typography>
                            )}
                        </Box>

                        {/* Информация о тревоге */}
                        {activeAlert && activeAlert.objectId === object.id && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,0,0,0.1)', borderRadius: 1, border: '1px solid rgba(255,0,0,0.3)' }}>
                                <Typography variant="h6" sx={{ color: '#ff4444', mb: 1 }}>
                                    🚨 Активная тревога
                                </Typography>
                                <Typography variant="body2" sx={{ color: colors.text.primary, mb: 0.5 }}>
                                    <strong>Активировал:</strong> {activeAlert.userName}
                                </Typography>

                                {activeAlert.description && (
                                    <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                                        <strong>Описание:</strong> {activeAlert.description}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {/* Карта */}
                <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)` }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: colors.text.primary }}>
                                📍 Расположение объекта
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {!showNavigation ? (
                                    <IconButton
                                        color="primary"
                                        onClick={(user?.role === 'inspector' || user?.role === 'curator') ? handleNavigateToObject : handleStartNavigation}
                                        sx={{
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            '&:hover': {
                                                bgcolor: 'primary.dark'
                                            }
                                        }}
                                    >
                                        <NavigationIcon />
                                    </IconButton>
                                ) : (
                                    <IconButton
                                        color="primary"
                                        onClick={handleStopNavigation}
                                        sx={{
                                            bgcolor: 'error.main',
                                            color: 'white',
                                            '&:hover': {
                                                bgcolor: 'error.dark'
                                            }
                                        }}
                                    >
                                        <NavigationIcon />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>

                        <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden' }}>
                            <YandexMap
                                center={object.position}
                                zoom={15}
                                markers={[
                                    {
                                        id: object.id,
                                        position: object.position,
                                        title: object.name,
                                        status: 'checked' as const
                                    },
                                    ...(userLocation ? [{
                                        id: 'user',
                                        position: userLocation,
                                        title: 'Ваше местоположение',
                                        status: 'pending' as const
                                    }] : [])
                                ]}
                                showRoute={showNavigation}
                                routeToObjectId={showNavigation ? object.id : null}
                                onRouteCalculated={(routeInfo) => {
                                    console.log('Маршрут построен:', routeInfo);
                                    setRouteInfo(routeInfo);
                                }}
                                onRouteClose={() => {
                                    setShowNavigation(false);
                                    setUserLocation(null);
                                    setRouteInfo(null);
                                }}
                                showCurrentLocation={showNavigation}
                            />
                        </Box>

                        {showNavigation && userLocation && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ color: colors.text.primary, mb: 1 }}>
                                    🚗 Навигация активна
                                </Typography>
                                {locationAccuracy && (
                                    <Typography variant="caption" sx={{
                                        color: locationAccuracy <= 20 ? '#4caf50' : locationAccuracy <= 50 ? '#ff9800' : '#f44336',
                                        display: 'block',
                                        mb: 0.5
                                    }}>
                                        📍 Точность: {locationAccuracy}м
                                        {locationAccuracy <= 20 ? ' (Отлично)' :
                                            locationAccuracy <= 50 ? ' (Хорошо)' : ' (Низкая)'}
                                    </Typography>
                                )}
                                {routeInfo && (
                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="caption" sx={{ color: colors.text.primary, display: 'block' }}>
                                            📏 Расстояние: {routeInfo.distance}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: colors.text.primary, display: 'block' }}>
                                            ⏱️ Время в пути: {routeInfo.duration}
                                        </Typography>
                                    </Box>
                                )}
                                <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                                    Следуйте по маршруту к объекту. Ваше местоположение отображается на карте.
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
            {(user?.role === 'inspector' || user?.role === 'curator') && (
                <InspectorBottomNavigation
                    currentPage="object"
                    onNavigate={handleNavigate}
                />
            )}
        </Box>
    );
};

export default ObjectDetailScreen; 