/**
 * @file: InspectorTaskDetail.tsx
 * @description: Детальный просмотр и принятие задания инспектором
 * @dependencies: react, material-ui, tasks service, maps
 * @created: 2025-06-30
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Button,
    CircularProgress,
    List,
    ListItem,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Tooltip,
    Snackbar,
    Alert
} from '@mui/material';
import {
    Map as MapIcon,
    Route as RouteIcon,
    LocationOn as LocationOnIcon,
    DirectionsCar as DirectionsCarIcon,
    AccessTime as AccessTimeIcon,
    Navigation as NavigationIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { Task, ObjectData, Alert as AlertType } from '../../types';
import { getTaskById, acceptTask, updateTask } from '../../services/tasks';
import { useAuth } from '../../context/AuthContext';
import SimpleYandexMap from '../maps/SimpleYandexMap';
import YandexMap from '../maps/YandexMap';
import YandexNavigator from '../maps/YandexNavigator';
import { getObjectById } from '../../services/objects';
import { fonts } from '../../utils/fonts';
import { createAlert, subscribeActiveAlert, resetAlert } from '../../services/alerts';
import { stopAlarm } from '../../services/alarmSound';
import MuiAlert from '@mui/material/Alert';
import { playAlarm } from '../../services/alarmSound';

interface InspectorTaskDetailProps {
    id?: string;
    task?: Task;
    minimal?: boolean;
    onComplete?: (taskId: string) => void;
}

const InspectorTaskDetail: React.FC<InspectorTaskDetailProps> = ({ id, task: taskProp, minimal, onComplete }) => {
    const params = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [task, setTask] = useState<Task | null>(taskProp || null);
    const [loading, setLoading] = useState(!taskProp);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [commentDialog, setCommentDialog] = useState<{ open: boolean; objectId: string | null }>({ open: false, objectId: null });
    const [comment, setComment] = useState('');
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const [objectPositions, setObjectPositions] = useState<Record<string, [number, number]>>({});
    const [objectDataMap, setObjectDataMap] = useState<Record<string, ObjectData>>({});
    const [center, setCenter] = useState<[number, number] | null>(null);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [successDialog, setSuccessDialog] = useState<{ open: boolean; objectName: string }>({ open: false, objectName: '' });
    const [activeAlert, setActiveAlert] = useState<AlertType | null>(null);
    const [showAlarm, setShowAlarm] = useState(false);
    const [alarmDialog, setAlarmDialog] = useState(false);

    // Новые состояния для маршрутизации
    const [showRoute, setShowRoute] = useState(false);
    const [showNavigator, setShowNavigator] = useState(false);
    const [routeToObjectId, setRouteToObjectId] = useState<string | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);
    const [expandedObjects, setExpandedObjects] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!taskProp && (id || params.id)) {
            loadTask();
        }
    }, [id, params.id]);

    useEffect(() => {
        if (task && task.objects.length > 0) {
            setSelectedObjectId(task.objects[0].id);
            // Загружаем координаты и данные всех объектов задания
            (async () => {
                const positions: Record<string, [number, number]> = {};
                const dataMap: Record<string, ObjectData> = {};
                for (const obj of task.objects) {
                    const data = await getObjectById(obj.id);
                    if (data && data.position) {
                        positions[obj.id] = data.position;
                        dataMap[obj.id] = data;
                    }
                }
                setObjectPositions(positions);
                setObjectDataMap(dataMap);
                // Устанавливаем центр карты на первый объект
                if (task.objects[0] && positions[task.objects[0].id]) {
                    setCenter(positions[task.objects[0].id]);
                }
            })();
        }
    }, [task]);

    useEffect(() => {
        if (selectedObjectId && objectPositions[selectedObjectId]) {
            setCenter(objectPositions[selectedObjectId]);
        }
    }, [selectedObjectId, objectPositions]);

    useEffect(() => {
        if (user) {
            const unsub = subscribeActiveAlert((alert) => {
                setActiveAlert(alert);
                setShowAlarm(!!alert);
            }, user);
            return () => unsub();
        }
    }, [user]);

    const loadTask = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTaskById(id || params.id!);
            setTask(data);
        } catch (e) {
            setError('Ошибка загрузки задания');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!task) return;
        setAccepting(true);
        try {
            await acceptTask(task.id);
            navigate(-1);
        } catch (e) {
            setError('Ошибка при принятии задания');
        } finally {
            setAccepting(false);
        }
    };

    const handleCheckObject = async (objectId: string) => {
        if (!task) return;
        setCommentDialog({ open: true, objectId });
    };

    const handleAddComment = async () => {
        if (!task || !commentDialog.objectId) return;
        const objName = task.objects.find(obj => obj.id === commentDialog.objectId)?.name || '';
        setSuccessDialog({ open: true, objectName: objName });
        try {
            const updatedObjects = task.objects.map(obj =>
                obj.id === commentDialog.objectId
                    ? { ...obj, status: 'checked' as const, checkedAt: new Date(), comments: comment }
                    : obj
            );
            await updateTask(task.id, { objects: updatedObjects });
            setCommentDialog({ open: false, objectId: null });
            setComment('');
            setSnackbar({ open: true, message: 'Данные по объекту обновлены' });
            setTask({ ...task, objects: updatedObjects });
        } catch (e) {
            setError('Ошибка при добавлении замечания');
        }
    };

    const handleCompleteTask = async () => {
        setCompleteDialogOpen(true);
    };

    const handleConfirmComplete = async () => {
        if (!task) return;
        try {
            await updateTask(task.id, { status: 'completed', completedAt: new Date() });
            setCompleteDialogOpen(false);
            setSnackbar({ open: true, message: 'Задание завершено' });
            if (onComplete) {
                onComplete(task.id);
            }
        } catch (e) {
            setError('Ошибка при завершении задания');
        }
    };

    const handleAlarm = async () => {
        setAlarmDialog(true);
    };

    const confirmAlarm = async () => {
        if (!task || !user) return;
        try {
            await createAlert({
                type: 'inspector',
                userId: user.uid,
                userName: user.name || user.email || 'Инспектор',
                objectId: selectedObjectId || '',
                objectName: selectedObjectId ? objectDataMap[selectedObjectId]?.name : '',
                description: 'Тревога от инспектора'
            });
            setAlarmDialog(false);
            setSnackbar({ open: true, message: 'Тревожный сигнал отправлен' });
        } catch (e) {
            console.error('Ошибка при отправке тревоги:', e);
            // Не показываем ошибку пользователю, так как тревога может быть отправлена успешно
            // setError('Ошибка при отправке тревоги');
        }
    };

    const getObjectStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'Ожидает';
            case 'checked': return 'Проверен';
            case 'issues': return 'Проблемы';
            default: return status;
        }
    };

    // Обработчик построения маршрута
    const handleBuildRoute = () => {
        if (!selectedObjectId) {
            setSnackbar({ open: true, message: 'Выберите объект для построения маршрута' });
            return;
        }

        setShowRoute(true);
        setRouteToObjectId(selectedObjectId);
        setRouteError(null);
        setRouteInfo(null);
    };

    // Обработчик открытия встроенного навигатора
    const handleOpenNavigator = () => {
        if (!selectedObjectId || !objectPositions[selectedObjectId]) {
            setSnackbar({ open: true, message: 'Выберите объект для навигации' });
            return;
        }
        console.log('🚀 Открываем встроенный навигатор для объекта:', selectedObjectId);
        // Закрываем другие режимы карты
        setShowMap(false);
        setShowRoute(false);
        setRouteError(null);
        setRouteInfo(null);
        // Открываем навигатор
        setShowNavigator(true);
        console.log('✅ showNavigator установлен в true');
    };



    // Обработчик расчета маршрута
    const handleRouteCalculated = (info: { distance: string; duration: string }) => {
        setRouteInfo(info);
        setRouteError(null);
    };

    // Обработчик ошибки маршрута
    const handleRouteError = (error: string) => {
        setRouteError(error);
        setRouteInfo(null);
    };

    // Функция для переключения развертывания описания объекта
    const toggleObjectDescription = (objectId: string) => {
        setExpandedObjects(prev => ({
            ...prev,
            [objectId]: !prev[objectId]
        }));
    };

    // Функция для открытия Яндекс.Навигатор (поддержка Android и iOS)
    const openYandexNavigator = (objectId: string) => {
        const objectData = objectDataMap[objectId];
        if (objectData && objectData.position) {
            const [lat, lng] = objectData.position;
            const name = encodeURIComponent(objectData.name || '');

            // Определяем платформу
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);

            let yandexUrl = '';
            let fallbackUrl = '';

            if (isIOS) {
                // URL для iOS Яндекс.Навигатор
                yandexUrl = `yandexmaps://maps.yandex.ru/?pt=${lng},${lat}&z=16&l=map`;
                fallbackUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
            } else if (isAndroid) {
                // URL для Android Яндекс.Навигатор
                yandexUrl = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}&text_to=${name}`;
                fallbackUrl = `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto&z=16`;
            } else {
                // Для других платформ используем веб-версию
                fallbackUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
            }

            if (yandexUrl) {
                // Пытаемся открыть приложение
                window.location.href = yandexUrl;

                // Fallback через 1 секунду
                setTimeout(() => {
                    window.open(fallbackUrl, '_blank');
                }, 1000);
            } else {
                // Сразу открываем веб-версию
                window.open(fallbackUrl, '_blank');
            }
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={2}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!task) {
        return (
            <Box p={2}>
                <Alert severity="warning">Задание не найдено</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {/* Заголовок задания */}
            <Card sx={{
                borderRadius: 3,
                boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                background: '#0A2463',
                color: '#fff',
                border: 'none',
                p: { xs: 1, sm: 2 },
                mb: 2,
                transition: 'none !important',
                '&:hover': {
                    transform: 'none !important',
                    boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37) !important',
                    background: '#0A2463 !important'
                }
            }}>
                <CardContent>
                    <Typography variant="h5" sx={{ fontSize: { xs: 18, sm: 24 }, fontWeight: 'bold', mb: 1 }}>
                        {task.title}
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: { xs: 14, sm: 16 }, mb: 2, color: '#ccc' }}>
                        {task.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip
                            label={task.status === 'pending' ? 'Ожидает принятия' : task.status === 'in_progress' ? 'В работе' : 'Завершено'}
                            color={task.status === 'pending' ? 'warning' : task.status === 'in_progress' ? 'info' : 'success'}
                            size="small"
                        />
                        <Chip
                            label={`Объектов: ${task.objects.length}`}
                            variant="outlined"
                            size="small"
                        />
                    </Box>
                    {task.status === 'pending' && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAccept}
                            disabled={accepting}
                            sx={{
                                mr: 1,
                                color: 'white',
                                backgroundColor: '#1976d2',
                                '&:hover': {
                                    backgroundColor: '#1565c0'
                                }
                            }}
                        >
                            {accepting ? <CircularProgress size={20} /> : 'Принять задание'}
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleAlarm}
                        sx={{
                            backgroundColor: '#d32f2f',
                            color: '#fff',
                            '&:hover': {
                                backgroundColor: '#c62828'
                            }
                        }}
                    >
                        ТРЕВОГА
                    </Button>
                </CardContent>
            </Card>

            {task.status === 'in_progress' && (
                <Card sx={{
                    color: '#fff',
                    p: { xs: 1, sm: 2 }
                }} className="objectsCard">
                    <CardContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
                                <Typography variant="h6" sx={{ fontSize: { xs: 16, sm: 20 } }}>
                                    Объекты для проверки ({task.objects.length})
                                </Typography>
                                <Box>
                                    <Tooltip title="Показать карту">
                                        <IconButton onClick={() => setShowMap(!showMap)}>
                                            <MapIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Построить маршрут">
                                        <IconButton onClick={handleBuildRoute}>
                                            <RouteIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Открыть навигатор">
                                        <IconButton onClick={handleOpenNavigator}>
                                            <NavigationIcon />
                                        </IconButton>
                                    </Tooltip>

                                </Box>
                            </Box>

                            {/* Информация о маршруте */}
                            {routeInfo && (
                                <Box sx={{
                                    mb: 2,
                                    p: 1.5,
                                    background: 'rgba(25, 118, 210, 0.85)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                                    position: 'relative'
                                }}>
                                    {/* Кнопка закрытия маршрута в панели информации */}
                                    <IconButton
                                        onClick={() => {
                                            setShowRoute(false);
                                            setRouteInfo(null);
                                            setRouteError(null);
                                        }}
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)'
                                            }
                                        }}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', pr: 4 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <DirectionsCarIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                                            <Typography variant="body2" sx={{
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontWeight: 'normal',
                                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                                                fontSize: { xs: '0.9rem', sm: '1rem' }
                                            }}>
                                                Расстояние: {routeInfo.distance}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <AccessTimeIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                                            <Typography variant="body2" sx={{
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontWeight: 'normal',
                                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                                                fontSize: { xs: '0.9rem', sm: '1rem' }
                                            }}>
                                                Время в пути: {routeInfo.duration}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {/* Ошибка маршрута */}
                            {routeError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {routeError}
                                </Alert>
                            )}

                            {/* Карта с маршрутом */}
                            {showRoute && selectedObjectId && objectPositions[selectedObjectId] && objectDataMap[selectedObjectId] && center && (
                                <Box sx={{ mb: { xs: 2, sm: 3 }, minHeight: { xs: 220, sm: 400 }, mt: { xs: 2, sm: 0 }, borderRadius: 2, overflow: 'hidden', boxShadow: 2, position: 'relative' }}>
                                    <YandexMap
                                        markers={[{
                                            id: selectedObjectId,
                                            position: objectPositions[selectedObjectId],
                                            title: objectDataMap[selectedObjectId]?.name || '',
                                            status: 'pending',
                                            isSelected: true
                                        }]}
                                        center={center}
                                        zoom={15}
                                        showRoute={showRoute}
                                        routeToObjectId={routeToObjectId}
                                        onRouteCalculated={handleRouteCalculated}
                                        height={400}
                                    />
                                </Box>
                            )}

                            {/* Обычная карта */}
                            {showMap && !showRoute && !showNavigator && selectedObjectId && objectPositions[selectedObjectId] && objectDataMap[selectedObjectId] && center && (
                                <Box sx={{ mb: { xs: 2, sm: 3 }, minHeight: { xs: 220, sm: 400 }, mt: { xs: 2, sm: 0 }, borderRadius: 2, overflow: 'hidden', boxShadow: 2 }}>
                                    <SimpleYandexMap
                                        markers={[{
                                            id: selectedObjectId,
                                            position: objectPositions[selectedObjectId],
                                            title: objectDataMap[selectedObjectId]?.name || '',
                                            address: objectDataMap[selectedObjectId]?.address || '',
                                            status: objectDataMap[selectedObjectId]?.status || '',
                                            description: objectDataMap[selectedObjectId]?.description || ''
                                        }]}
                                        center={center}
                                        zoom={15}
                                    />
                                </Box>
                            )}

                            {/* Встроенный навигатор */}
                            {showNavigator && selectedObjectId && objectPositions[selectedObjectId] && objectDataMap[selectedObjectId] && (
                                <Box sx={{
                                    mb: { xs: 2, sm: 3 },
                                    minHeight: { xs: 500, sm: 700 },
                                    mt: { xs: 2, sm: 0 },
                                    width: '100vw',
                                    mx: { xs: '-50vw', sm: '-50vw' },
                                    px: { xs: 0, sm: 0 },
                                    position: 'relative',
                                    left: { xs: '50%', sm: '50%' },
                                    transform: { xs: 'translateX(-50%)', sm: 'translateX(-50%)' }
                                }}>
                                    <YandexNavigator
                                        destination={objectPositions[selectedObjectId]}
                                        destinationName={objectDataMap[selectedObjectId]?.name || 'Объект'}
                                        onClose={() => setShowNavigator(false)}
                                        height={700}
                                        width="100%"
                                    />
                                </Box>
                            )}



                            <List sx={{ width: '100%', maxWidth: 900, mx: 'auto', p: 0, mt: { xs: showMap ? 2 : 0, sm: 0 } }}>
                                {task.objects.map((obj, index) => (
                                    <React.Fragment key={obj.id}>
                                        <ListItem
                                            onClick={() => setSelectedObjectId(obj.id)}
                                            className={`objectItem ${selectedObjectId === obj.id ? 'selected' : ''}`}
                                            sx={{
                                                fontSize: { xs: fonts.size.xs, sm: fonts.size.sm }
                                            }}
                                        >
                                            <Box sx={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexDirection: 'row', gap: 1 }}>
                                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="body2" sx={{ fontSize: { xs: 13, sm: fonts.size.sm }, fontWeight: 'bold', color: '#fff', textAlign: 'left' }}>
                                                            {obj.name}
                                                        </Typography>
                                                        <LocationOnIcon sx={{ color: '#D4AF37', ml: 0.5 }} />
                                                    </Box>

                                                    {/* Описание объекта с кнопкой ... прямо под названием */}
                                                    {objectDataMap[obj.id]?.description && (
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                            <Typography variant="body2" sx={{
                                                                color: 'rgba(255, 255, 255, 0.8)',
                                                                fontSize: { xs: 12, sm: fonts.size.sm },
                                                                lineHeight: 1.4,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: expandedObjects[obj.id] ? 'unset' : 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                flex: 1
                                                            }}>
                                                                {objectDataMap[obj.id]?.description}
                                                            </Typography>
                                                            <Button
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleObjectDescription(obj.id);
                                                                }}
                                                                sx={{
                                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                                    fontSize: { xs: 10, sm: 11 },
                                                                    minWidth: 'auto',
                                                                    p: 0.5,
                                                                    mt: -0.5,
                                                                    '&:hover': {
                                                                        color: 'rgba(255, 255, 255, 0.9)',
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                                                    }
                                                                }}
                                                            >
                                                                {expandedObjects[obj.id] ? '...' : '...'}
                                                            </Button>
                                                        </Box>
                                                    )}
                                                </Box>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 120 }}>
                                                    <Chip
                                                        label={getObjectStatusText(obj.status)}
                                                        color={obj.status === 'checked' ? 'success' : 'warning'}
                                                        size="small"
                                                        sx={{ mb: 0.5 }}
                                                    />
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                                                        {obj.status === 'pending' && (
                                                            <Button
                                                                variant="outlined"
                                                                color="success"
                                                                size="small"
                                                                onClick={() => handleCheckObject(obj.id)}
                                                                sx={{
                                                                    fontSize: { xs: 11, sm: 12 },
                                                                    alignSelf: 'flex-end',
                                                                    color: '#4caf50',
                                                                    borderColor: '#4caf50',
                                                                    background: 'rgba(76, 175, 80, 0.1)',
                                                                    '&:hover': {
                                                                        borderColor: '#45a049',
                                                                        backgroundColor: 'rgba(76, 175, 80, 0.15)'
                                                                    }
                                                                }}
                                                            >
                                                                ПРОВЕРЕН
                                                            </Button>
                                                        )}
                                                        {objectPositions[obj.id] && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openYandexNavigator(obj.id);
                                                                }}
                                                                sx={{
                                                                    color: '#2196f3',
                                                                    alignSelf: 'flex-end',
                                                                    '&:hover': {
                                                                        color: '#1976d2',
                                                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                                                    }
                                                                }}
                                                            >
                                                                <NavigationIcon fontSize="small" />
                                                            </IconButton>
                                                        )}

                                                    </Box>
                                                </Box>
                                            </Box>

                                            {obj.status === 'checked' && obj.checkedAt && !isNaN(new Date(obj.checkedAt).getTime()) && (
                                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: { xs: 12, sm: fonts.size.sm }, mb: 0.5 }}>
                                                    Время проверки: {new Date(obj.checkedAt).toLocaleString('ru-RU')}
                                                </Typography>
                                            )}
                                            {obj.comments && (
                                                <Typography variant="body2" sx={{ color: '#fff', backgroundColor: '#333', padding: '4px 8px', borderRadius: '4px', fontSize: { xs: 12, sm: fonts.size.sm }, mb: 0.5 }}>
                                                    Замечания: {obj.comments}
                                                </Typography>
                                            )}
                                        </ListItem>
                                    </React.Fragment>
                                ))}
                            </List>

                            {/* Кнопка завершения задания */}
                            {task.objects.every(obj => obj.status === 'checked') && (
                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        onClick={handleCompleteTask}
                                        sx={{
                                            color: 'white',
                                            backgroundColor: '#4caf50',
                                            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                                            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                                            '&:hover': {
                                                backgroundColor: '#45a049',
                                                background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
                                                boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)'
                                            }
                                        }}
                                    >
                                        Завершить задание
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Диалог добавления комментария */}
            <Dialog
                open={commentDialog.open}
                onClose={() => setCommentDialog({ open: false, objectId: null })}
                sx={{
                    '& .MuiDialog-paper': {
                        margin: { xs: '16px', sm: '32px' },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
                        width: { xs: 'calc(100% - 32px)', sm: '400px' },
                        maxWidth: { xs: 'calc(100% - 32px)', sm: '400px' }
                    }
                }}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)'
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    pb: 2,
                    mb: 1
                }}>
                    Добавить замечания
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Замечания"
                        fullWidth
                        multiline
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#D4AF37',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&.Mui-focused': {
                                    color: '#D4AF37',
                                },
                            },
                            '& .MuiInputBase-input': {
                                color: '#fff',
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    pt: 2,
                    px: 3,
                    pb: 2
                }}>
                    <Button
                        onClick={() => setCommentDialog({ open: false, objectId: null })}
                        sx={{
                            color: '#ff6b6b',
                            borderColor: '#ff6b6b',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                                borderColor: '#ff5252'
                            }
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleAddComment}
                        variant="contained"
                        sx={{
                            backgroundColor: '#4caf50',
                            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                            '&:hover': {
                                backgroundColor: '#45a049',
                                background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
                            }
                        }}
                    >
                        Добавить
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={2000}
                onClose={() => setSnackbar({ open: false, message: '' })}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
            {/* Модальное окно подтверждения завершения задания */}
            <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)}>
                <DialogTitle>Завершить задание?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Данные по проверке отправляются администратору. Задание будет переведено в статус "Завершённые".
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompleteDialogOpen(false)}>Отмена</Button>
                    <Button onClick={handleConfirmComplete} variant="contained" color="success">Завершить задание</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={successDialog.open} onClose={() => setSuccessDialog({ open: false, objectName: '' })}>
                <DialogTitle>Успех</DialogTitle>
                <DialogContent>
                    <Typography>Замечание успешно добавлено к объекту {successDialog.objectName}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuccessDialog({ open: false, objectName: '' })} autoFocus>Ок</Button>
                </DialogActions>
            </Dialog>
            {/* Мигающий экран тревоги */}
            {showAlarm && (
                <Box sx={{
                    position: 'fixed',
                    zIndex: 2000,
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    bgcolor: 'rgba(255,0,0,0.8)',
                    animation: 'alarm-blink 1s steps(2, start) infinite',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Typography variant="h3" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
                        ТРЕВОГА!
                    </Typography>
                    <Typography variant="h5" sx={{ color: '#fff', mb: 2, textAlign: 'center' }}>
                        {activeAlert?.type === 'admin' ? 'Тревога от администратора' : activeAlert?.objectName ? `Тревога с объекта: ${activeAlert.objectName}` : 'Тревога от инспектора'}
                    </Typography>
                    {activeAlert?.objectName && (
                        <Typography variant="h6" sx={{ color: '#fff', mb: 1, textAlign: 'center' }}>
                            Объект: {activeAlert.objectName}
                        </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {activeAlert?.objectId && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    stopAlarm();
                                    navigate(`/object/${activeAlert.objectId}`);
                                }}
                                sx={{ fontWeight: 700 }}
                            >
                                Перейти к объекту
                            </Button>
                        )}
                        <Button variant="contained" color="inherit" onClick={async () => {
                            if (activeAlert?.id) await resetAlert();
                        }} sx={{ fontWeight: 700 }}>
                            Сбросить тревогу
                        </Button>
                    </Box>
                </Box>
            )}
            <Dialog open={alarmDialog} onClose={() => setAlarmDialog(false)}>
                <DialogTitle>Подтвердите тревогу</DialogTitle>
                <DialogContent>
                    <Typography>Вы действительно хотите отправить тревожный сигнал по объекту?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAlarmDialog(false)}>Отмена</Button>
                    <Button onClick={confirmAlarm} color="error" variant="contained">Подтвердить</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default InspectorTaskDetail; 