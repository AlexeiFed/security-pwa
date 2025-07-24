import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Warning,
    LocationOn,
    Directions,
    Close,
    Phone,
    AccessTime,
    Navigation
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import YandexMap from '../maps/YandexMap';
import { getObjectById } from '../../services/objects';
import { SecurityObject } from '../../types';
import InspectorBottomNavigation from '../common/BottomNavigation';
import Header from '../common/Header';
import { subscribeActiveAlert } from '../../services/alerts';
import { Alert as AlertType } from '../../types';
import { stopAlarm } from '../../services/alarmSound';

export const AlarmScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { objectId } = useParams<{ objectId: string }>();
    const [object, setObject] = useState<SecurityObject | null>(null);
    const [loading, setLoading] = useState(true);
    const [showMap, setShowMap] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAlarmMessage, setShowAlarmMessage] = useState(true);
    const [alarmDismissed, setAlarmDismissed] = useState(false);
    const [activeAlert, setActiveAlert] = useState<AlertType | null>(null);

    // Загружаем состояние alarmDismissed из localStorage при инициализации
    useEffect(() => {
        const savedDismissed = localStorage.getItem('alarmDismissed');
        console.log('🔍 AlarmScreen: Загружено из localStorage:', savedDismissed);
        if (savedDismissed === 'true') {
            setAlarmDismissed(true);
            console.log('✅ AlarmScreen: Состояние alarmDismissed установлено в true');
        }
    }, []);

    useEffect(() => {
        console.log('🚨 AlarmScreen загружен, objectId:', objectId);
        console.log('📍 Текущий URL:', window.location.pathname);

        if (objectId) {
            loadObject();
        } else {
            // Если объект не указан, показываем общий тревожный экран
            setLoading(false);
            console.log('⚠️ Тревожный экран открыт без указания объекта');
        }

        // Мерцание сообщения о тревоге
        const blinkInterval = setInterval(() => {
            setShowAlarmMessage(prev => !prev);
        }, 500);

        return () => clearInterval(blinkInterval);
    }, [objectId]);

    // Подписка на активные тревоги
    useEffect(() => {
        if (user) {
            const unsub = subscribeActiveAlert((alert) => {
                setActiveAlert(alert);
                // Если тревога сброшена администратором, скрываем все элементы
                if (!alert) {
                    setAlarmDismissed(false);
                    localStorage.removeItem('alarmDismissed');
                }
            }, user);
            return () => unsub();
        }
    }, [user]);

    const loadObject = async () => {
        try {
            setLoading(true);
            const objectData = await getObjectById(objectId!);
            if (objectData) {
                // Преобразуем ObjectData в SecurityObject
                const securityObject: SecurityObject = {
                    id: objectData.id,
                    name: objectData.name,
                    address: objectData.address,
                    city: '',
                    coordinates: {
                        lat: objectData.position[0],
                        lng: objectData.position[1]
                    },
                    type: 'office',
                    securityLevel: 'high',
                    status: objectData.status,
                    description: objectData.description
                };
                setObject(securityObject);
            } else {
                setError('Объект не найден');
            }
        } catch (error) {
            console.error('Ошибка загрузки объекта:', error);
            setError('Ошибка загрузки данных объекта');
        } finally {
            setLoading(false);
        }
    };

    const handleNavigateToObject = () => {
        if (object) {
            // Открываем Яндекс.Навигатор в телефоне
            const { lat, lng } = object.coordinates;
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

    const handleCallEmergency = () => {
        // Номер экстренной службы
        window.location.href = 'tel:112';
    };

    const handleDismissAlarm = () => {
        console.log('🔙 Скрытие тревожного экрана (тревога не сбрасывается)');
        setAlarmDismissed(true);
        localStorage.setItem('alarmDismissed', 'true');
        stopAlarm(); // Останавливаем звук тревоги
        console.log('🔇 Звук тревоги остановлен');
    };

    const handleNavigate = (page: string) => {
        if (page === 'home') {
            navigate('/');
        } else if (page === 'object' && objectId) {
            navigate(`/object/${objectId}`);
        }
    };

    console.log('🔍 AlarmScreen: Состояние компонента:', { activeAlert: !!activeAlert, alarmDismissed, loading, error });

    // Если тревога сброшена администратором, не показываем ничего
    if (!activeAlert) {
        console.log('📱 AlarmScreen: Показываем сообщение "Тревога сброшена"');
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography variant="h6">Тревога сброшена</Typography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                bgcolor="error.main"
            >
                <CircularProgress color="inherit" />
            </Box>
        );
    }

    if (error) {
        return (
            <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                bgcolor="error.main"
                color="error.contrastText"
                p={3}
            >
                <Warning sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h4" gutterBottom>
                    Ошибка загрузки
                </Typography>
                <Typography variant="body1" textAlign="center" mb={3}>
                    {error}
                </Typography>
                <Button
                    variant="contained"
                    color="inherit"
                    onClick={() => navigate('/')}
                >
                    Вернуться назад
                </Button>
            </Box>
        );
    }

    // Если тревожный экран скрыт, показываем обычный интерфейс с информацией о тревоге
    if (alarmDismissed) {
        console.log('📱 AlarmScreen: Показываем скрытый интерфейс с красной надписью');
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                {/* Красная надпись с информацией о тревоге */}
                <Box
                    sx={{
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                        p: 2,
                        textAlign: 'center',
                        borderBottom: '2px solid #fff'
                    }}
                >
                    <Typography variant="h6" fontWeight="bold">
                        🚨 АКТИВНАЯ ТРЕВОГА
                    </Typography>
                    <Typography variant="body2">
                        {activeAlert.type === 'admin' ? 'Тревога от администратора' :
                            activeAlert.objectName ? `Тревога с объекта: ${activeAlert.objectName}` :
                                'Тревога от инспектора'}
                    </Typography>
                    {activeAlert.objectName && (
                        <Typography variant="body2">
                            Объект: {activeAlert.objectName}
                        </Typography>
                    )}
                </Box>

                {/* Шапка как на главном экране инспектора */}
                <Header
                    title="Панель инспектора"
                    hideCompanyName={true}
                    hideTitle={true}
                    hideUserName={true}
                    showProfileMenu={true}
                    onProfileClick={() => navigate('/inspector/profile')}
                    onLogoClick={() => navigate('/')}
                />

                {/* Основной контент */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h5" gutterBottom>
                                Информация о тревоге
                            </Typography>
                            <Typography variant="body1" mb={2}>
                                Тревога активна. Будьте готовы к действиям.
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <AccessTime />
                                <Typography variant="body2">
                                    Получена: {new Date().toLocaleTimeString()}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {object && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Информация об объекте
                                </Typography>
                                <Typography variant="h5" gutterBottom fontWeight="bold">
                                    {object.name}
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <LocationOn />
                                    <Typography variant="body1">
                                        {object.address}
                                    </Typography>
                                </Box>
                                <Box display="flex" gap={1} mb={2}>
                                    <Chip
                                        label={`Уровень: ${object.securityLevel}`}
                                        color="warning"
                                        variant="filled"
                                    />
                                    <Chip
                                        label={object.type}
                                        color="info"
                                        variant="filled"
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    )}

                    <Box display="flex" flexDirection="column" gap={2}>
                        {object && (
                            <>
                                <Button
                                    variant="contained"
                                    color="warning"
                                    size="large"
                                    startIcon={<Navigation />}
                                    onClick={handleNavigateToObject}
                                    sx={{ py: 2, fontSize: '1.1rem' }}
                                >
                                    Навигация
                                </Button>

                                <Button
                                    variant="contained"
                                    color="info"
                                    size="large"
                                    startIcon={<LocationOn />}
                                    onClick={() => setShowMap(true)}
                                    sx={{ py: 2, fontSize: '1.1rem' }}
                                >
                                    Открыть карту
                                </Button>
                            </>
                        )}

                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            startIcon={<Phone />}
                            onClick={handleCallEmergency}
                            sx={{ py: 2, fontSize: '1.1rem' }}
                        >
                            Вызвать экстренную службу
                        </Button>
                    </Box>
                </Box>

                {/* Нижняя навигация */}
                <InspectorBottomNavigation
                    currentPage="object"
                    onNavigate={handleNavigate}
                />

                {/* Диалог с картой */}
                {object && (
                    <Dialog
                        open={showMap}
                        onClose={() => setShowMap(false)}
                        maxWidth="lg"
                        fullWidth
                        PaperProps={{
                            style: {
                                height: '80vh',
                                maxHeight: '80vh'
                            }
                        }}
                    >
                        <DialogTitle>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Typography variant="h6">
                                    Карта объекта: {object.name}
                                </Typography>
                                <IconButton onClick={() => setShowMap(false)}>
                                    <Close />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        <DialogContent>
                            <Box height="100%" position="relative">
                                <YandexMap
                                    center={[object.coordinates.lat, object.coordinates.lng]}
                                    zoom={16}
                                    markers={[
                                        {
                                            id: object.id,
                                            position: [object.coordinates.lat, object.coordinates.lng],
                                            title: object.name
                                        }
                                    ]}
                                />
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={handleNavigateToObject}
                                variant="contained"
                                color="primary"
                                startIcon={<Navigation />}
                            >
                                Навигация
                            </Button>
                            <Button onClick={() => setShowMap(false)}>
                                Закрыть
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}
            </Box>
        );
    }

    console.log('📱 AlarmScreen: Показываем тревожный экран с мерцанием');
    // Оригинальный тревожный экран с мерцанием
    return (
        <Box
            minHeight="100vh"
            bgcolor="error.main"
            color="error.contrastText"
            position="relative"
        >
            {/* Мерцающее сообщение о тревоге */}
            {showAlarmMessage && !alarmDismissed && (
                <Box
                    position="fixed"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    zIndex={2000}
                    bgcolor="error.dark"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                        animation: 'blink 0.5s ease-in-out infinite alternate'
                    }}
                >
                    <Typography
                        variant="h2"
                        fontWeight="bold"
                        textAlign="center"
                        sx={{
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                            fontSize: { xs: '2rem', sm: '3rem', md: '4rem' }
                        }}
                    >
                        🚨 ТРЕВОГА АКТИВИРОВАНА АДМИНИСТРАТОРОМ 🚨
                    </Typography>
                </Box>
            )}

            {/* Шапка как на главном экране инспектора */}
            <Header
                title="Панель инспектора"
                hideCompanyName={true}
                hideTitle={true}
                hideUserName={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/inspector/profile')}
                onLogoClick={() => navigate('/')}
            />

            {/* Основной контент */}
            <Box p={3}>
                {/* Информация об объекте или общее сообщение */}
                <Card
                    sx={{
                        bgcolor: 'error.dark',
                        color: 'error.contrastText',
                        mb: 3,
                        border: 2,
                        borderColor: 'error.light'
                    }}
                >
                    <CardContent>
                        {object ? (
                            <>
                                <Typography variant="h4" gutterBottom fontWeight="bold">
                                    {object.name}
                                </Typography>

                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <LocationOn />
                                    <Typography variant="body1">
                                        {object.address}
                                    </Typography>
                                </Box>

                                <Box display="flex" gap={1} mb={2}>
                                    <Chip
                                        label={`Уровень: ${object.securityLevel}`}
                                        color="warning"
                                        variant="filled"
                                    />
                                    <Chip
                                        label={object.type}
                                        color="info"
                                        variant="filled"
                                    />
                                </Box>

                                {object.description && (
                                    <Typography variant="body2" mb={2}>
                                        {object.description}
                                    </Typography>
                                )}
                            </>
                        ) : (
                            <>
                                <Typography variant="h4" gutterBottom fontWeight="bold">
                                    Общая тревога
                                </Typography>
                                <Typography variant="body1" mb={2}>
                                    Получен сигнал тревоги от администратора
                                </Typography>
                            </>
                        )}

                        <Box display="flex" alignItems="center" gap={1}>
                            <AccessTime />
                            <Typography variant="body2">
                                Тревога получена: {new Date().toLocaleTimeString()}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* Кнопки действий */}
                <Box display="flex" flexDirection="column" gap={2}>
                    {object ? (
                        <>
                            <Button
                                variant="contained"
                                color="warning"
                                size="large"
                                startIcon={<Navigation />}
                                onClick={handleNavigateToObject}
                                sx={{ py: 2, fontSize: '1.1rem' }}
                            >
                                Навигация
                            </Button>

                            <Button
                                variant="contained"
                                color="info"
                                size="large"
                                startIcon={<LocationOn />}
                                onClick={() => setShowMap(true)}
                                sx={{ py: 2, fontSize: '1.1rem' }}
                            >
                                Открыть карту
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="contained"
                            color="info"
                            size="large"
                            startIcon={<LocationOn />}
                            onClick={() => navigate('/inspector')}
                            sx={{ py: 2, fontSize: '1.1rem' }}
                        >
                            Перейти к заданиям
                        </Button>
                    )}

                    <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        startIcon={<Phone />}
                        onClick={handleCallEmergency}
                        sx={{ py: 2, fontSize: '1.1rem' }}
                    >
                        Вызвать экстренную службу
                    </Button>

                    <Button
                        variant="contained"
                        color="inherit"
                        size="large"
                        startIcon={<Close />}
                        onClick={handleDismissAlarm}
                        sx={{ py: 2, fontSize: '1.1rem' }}
                    >
                        Сбросить тревогу
                    </Button>
                </Box>

                {/* Предупреждение */}
                <Alert
                    severity="warning"
                    sx={{
                        mt: 3,
                        bgcolor: 'warning.dark',
                        color: 'warning.contrastText',
                        '& .MuiAlert-icon': {
                            color: 'warning.contrastText'
                        }
                    }}
                >
                    <Typography variant="body1" fontWeight="bold">
                        Внимание!
                    </Typography>
                    <Typography variant="body2">
                        Немедленно направляйтесь к объекту. Сохраняйте бдительность и следуйте инструкциям безопасности.
                    </Typography>
                </Alert>
            </Box>

            {/* CSS для мерцания */}
            <style>
                {`
                    @keyframes blink {
                        0% { opacity: 1; }
                        100% { opacity: 0.3; }
                    }
                `}
            </style>
        </Box>
    );
}; 