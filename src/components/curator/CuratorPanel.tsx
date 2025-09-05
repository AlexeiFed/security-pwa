/**
 * @file: CuratorPanel.tsx
 * @description: Панель куратора для управления объектами и тревогами
 * @dependencies: react, material-ui, auth context, objects service, alerts service
 * @created: 2025-06-27
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Chip,
    Alert,
    Snackbar,
    CircularProgress
} from '@mui/material';

import {
    Warning as WarningIcon,
    WarningAmber as WarningAmberIcon,
    LocationOn as LocationIcon,
    Security as SecurityIcon,
    MoreVert as MoreVertIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Curator, ObjectData, Alert as AlertType, Task } from '../../types';
import { getCuratorById } from '../../services/auth';
import { createAlert, subscribeActiveAlert, resetAlert } from '../../services/alerts';
import { sendAlarmPushToAll } from '../../services/pushNotifications';
import { stopAlarm } from '../../services/alarmSound';
import Header from '../common/Header';
import InspectorBottomNavigation from '../common/BottomNavigation';
import { cacheManager } from '../../services/cache';

const CuratorPanel = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [curator, setCurator] = useState<Curator | null>(null);
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [alarmDialog, setAlarmDialog] = useState(false);
    const [selectedObject, setSelectedObject] = useState<ObjectData | null>(null);
    const [alarmDescription, setAlarmDescription] = useState('');
    const [activeAlert, setActiveAlert] = useState<AlertType | null>(null);
    const [showAlarm, setShowAlarm] = useState(false);
    const [alarmDismissed, setAlarmDismissed] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [localAlarmActivated, setLocalAlarmActivated] = useState(false);

    // Загружаем состояние alarmDismissed из localStorage при инициализации
    useEffect(() => {
        const savedDismissed = localStorage.getItem('curatorAlarmDismissed');
        if (savedDismissed === 'true') {
            setAlarmDismissed(true);
        }

        // Загружаем информацию о локальной активации тревоги куратора
        const curatorLocalAlarmActivated = localStorage.getItem('curatorLocalAlarmActivated');
        if (curatorLocalAlarmActivated === 'true') {
            setLocalAlarmActivated(true);
            console.log('✅ Локальная активация тревоги куратора установлена в true');
            console.log('📋 Информация о тревоге куратора:', {
                objectName: localStorage.getItem('curatorLocalAlarmObjectName'),
                description: localStorage.getItem('curatorLocalAlarmDescription')
            });
        } else {
            console.log('❌ Локальная активация тревоги куратора не найдена');
        }

        // Добавляем слушатель кастомного события для обновления в той же вкладке
        const handleCuratorLocalAlarmActivated = (e: CustomEvent) => {
            console.log('🔄 Получено кастомное событие curatorLocalAlarmActivated');
            setLocalAlarmActivated(true);
        };

        const handleCuratorLocalAlarmDeactivated = () => {
            console.log('🔄 Получено кастомное событие curatorLocalAlarmDeactivated');
            setLocalAlarmActivated(false);
        };

        window.addEventListener('curatorLocalAlarmActivated', handleCuratorLocalAlarmActivated as EventListener);
        window.addEventListener('curatorLocalAlarmDeactivated', handleCuratorLocalAlarmDeactivated);

        return () => {
            window.removeEventListener('curatorLocalAlarmActivated', handleCuratorLocalAlarmActivated as EventListener);
            window.removeEventListener('curatorLocalAlarmDeactivated', handleCuratorLocalAlarmDeactivated);
        };
    }, []);

    // Проверяем локальное состояние тревоги при каждом рендере
    useEffect(() => {
        const curatorLocalAlarmActivated = localStorage.getItem('curatorLocalAlarmActivated');
        if (curatorLocalAlarmActivated === 'true' && !localAlarmActivated) {
            console.log('🔄 Восстанавливаем локальное состояние тревоги куратора');
            setLocalAlarmActivated(true);
        }
    });

    useEffect(() => {
        if (user?.uid) {
            loadCuratorData();
        }
    }, [user?.uid]);

    // Отдельный useEffect для подписки на изменения объектов и кураторов
    useEffect(() => {
        if (user?.uid && curator) {
            console.log('🔄 CuratorPanel: Настраиваем real-time подписки для куратора:', user.uid);

            let currentObjects: ObjectData[] = [];

            // Подписываемся на изменения объектов в реальном времени
            const unsubscribeObjects = cacheManager.subscribeToObjects((updatedObjects) => {
                console.log('📦 CuratorPanel: Получены обновленные объекты:', updatedObjects.length);
                currentObjects = updatedObjects;

                // Фильтруем объекты куратора из обновленного списка
                const curatorObjects = updatedObjects.filter(obj =>
                    curator.assignedObjects.includes(obj.id)
                );
                console.log('🏢 CuratorPanel: Объекты куратора после фильтрации:', curatorObjects.length);
                setObjects(curatorObjects);
            });

            // Подписываемся на изменения кураторов в реальном времени
            const unsubscribeCurators = cacheManager.subscribeToCurators((updatedCurators) => {
                console.log('👥 CuratorPanel: Получены обновленные кураторы:', updatedCurators.length);
                const currentCurator = updatedCurators.find(c => c.uid === user.uid);
                if (currentCurator) {
                    console.log('✅ CuratorPanel: Обновлены данные куратора:', {
                        uid: currentCurator.uid,
                        assignedObjectsCount: currentCurator.assignedObjects.length,
                        assignedObjects: currentCurator.assignedObjects
                    });
                    setCurator(currentCurator);

                    // Обновляем список объектов куратора из уже полученных объектов
                    const curatorObjects = currentObjects.filter(obj =>
                        currentCurator.assignedObjects.includes(obj.id)
                    );
                    console.log('🏢 CuratorPanel: Обновлены объекты куратора после изменения назначений:', curatorObjects.length);
                    setObjects(curatorObjects);
                }
            });

            return () => {
                console.log('🔄 CuratorPanel: Отписываемся от real-time подписок');
                if (unsubscribeObjects) unsubscribeObjects();
                if (unsubscribeCurators) unsubscribeCurators();
            };
        }
    }, [user?.uid, curator?.uid]); // Изменена зависимость для более точного отслеживания

    useEffect(() => {
        if (user) {
            const unsub = subscribeActiveAlert((alert) => {
                console.log('🚨 CuratorPanel: Получена тревога:', alert);
                setActiveAlert(alert);
                setShowAlarm(!!alert);
                // Если тревога сброшена администратором, скрываем все элементы
                if (!alert) {
                    console.log('🔄 CuratorPanel: Тревога сброшена, очищаем состояние');
                    setAlarmDismissed(false);
                    setLocalAlarmActivated(false);
                    localStorage.removeItem('curatorAlarmDismissed');
                    localStorage.removeItem('curatorLocalAlarmActivated');
                    localStorage.removeItem('curatorLocalAlarmObjectName');
                    localStorage.removeItem('curatorLocalAlarmDescription');
                } else {
                    // Если получена тревога через подписку, сбрасываем локальное состояние только если это не наша тревога
                    if (alert.userId !== user.uid) {
                        setLocalAlarmActivated(false);
                        localStorage.removeItem('curatorLocalAlarmActivated');
                        localStorage.removeItem('curatorLocalAlarmObjectName');
                        localStorage.removeItem('curatorLocalAlarmDescription');
                    } else {
                        console.log('🔄 Получена наша собственная тревога, сохраняем локальное состояние');
                    }
                }
            }, user);
            return () => unsub();
        }
    }, [user]);

    const loadCuratorData = async () => {
        try {
            console.log('🔄 Начинаем загрузку данных куратора...');
            setLoading(true);
            if (!user?.uid) {
                console.log('❌ UID пользователя не найден');
                return;
            }

            console.log('👤 Загружаем данные для пользователя:', user.uid);

            const [curatorData, allObjects] = await Promise.all([
                getCuratorById(user.uid),
                cacheManager.getObjects()
            ]);

            console.log('📊 Получены данные:', {
                curatorData: curatorData ? 'найден' : 'не найден',
                allObjectsCount: allObjects.length
            });

            if (curatorData) {
                console.log('✅ Данные куратора загружены:', {
                    uid: curatorData.uid,
                    name: curatorData.name,
                    assignedObjectsCount: curatorData.assignedObjects.length,
                    assignedObjects: curatorData.assignedObjects
                });

                setCurator(curatorData);

                // Фильтруем объекты, которые курирует данный куратор
                const curatorObjects = allObjects.filter(obj =>
                    curatorData.assignedObjects.includes(obj.id)
                );

                console.log('🏢 Объекты куратора:', {
                    totalObjects: allObjects.length,
                    curatorObjectsCount: curatorObjects.length,
                    curatorObjectIds: curatorObjects.map(obj => obj.id)
                });

                setObjects(curatorObjects);
            } else {
                console.log('❌ Данные куратора не найдены');
                setError('Данные куратора не найдены');
            }
        } catch (err) {
            console.error('❌ Ошибка загрузки данных куратора:', err);
            setError('Ошибка при загрузке данных');
            showSnackbar('Ошибка при загрузке данных', 'error');
        } finally {
            console.log('✅ Загрузка данных куратора завершена');
            setLoading(false);
        }
    };

    // Загрузка заданий для объектов куратора
    useEffect(() => {
        console.log('🔄 useEffect для заданий сработал, objects.length:', objects.length);

        if (objects.length > 0) {
            const objectIds = objects.map(obj => obj.id);
            console.log('📋 ID объектов для подписки на задания:', objectIds);

            // Принудительно обновляем кэш заданий
            cacheManager.refreshCache('tasks');

            // Подписываемся на задания для всех объектов куратора
            const unsubscribe = cacheManager.subscribeToCuratorObjectsTasks(objectIds, (curatorTasks) => {
                console.log('📦 Получены задания для куратора:', curatorTasks.length);
                setTasks(curatorTasks);
            });

            return () => {
                console.log('🔄 Отписываемся от заданий куратора');
                unsubscribe();
            };
        } else {
            console.log('📋 Нет объектов для подписки на задания');
        }
    }, [objects]);

    const handleAlarm = (object: ObjectData) => {
        setSelectedObject(object);
        setAlarmDialog(true);
    };

    const confirmAlarm = async () => {
        if (!user || !selectedObject) return;
        try {
            console.log('🚨 Активация тревоги куратором...');

            // Создаем тревогу в системе
            await createAlert({
                type: 'curator',
                userId: user.uid,
                userName: user.name,
                objectId: selectedObject.id,
                objectName: selectedObject.name,
                description: alarmDescription,
                coordinates: selectedObject.position
            });

            // Отправляем push-уведомления всем пользователям
            console.log('📡 Отправка push-уведомлений...');
            const pushResult = await sendAlarmPushToAll(
                '🚨 ТРЕВОГА!',
                `Тревога от куратора ${user.name} с объекта: ${selectedObject.name}`,
                selectedObject.id,
                selectedObject.name
            );

            if (pushResult.success) {
                console.log('✅ Push-уведомления отправлены:', pushResult.sentCount, 'пользователям');
            } else {
                console.warn('⚠️ Ошибка отправки push-уведомлений:', pushResult.message);
            }

            setAlarmDialog(false);
            setSelectedObject(null);
            setAlarmDescription('');
            showSnackbar('Тревога отправлена!', 'success');

            // Сохраняем информацию о локальной активации тревоги
            localStorage.setItem('curatorLocalAlarmActivated', 'true');
            localStorage.setItem('curatorLocalAlarmObjectName', selectedObject.name);
            localStorage.setItem('curatorLocalAlarmDescription', alarmDescription || 'Тревога от куратора');

            console.log('💾 Информация о тревоге куратора сохранена в localStorage');
            console.log('✅ Тревога активирована, интерфейс обновится автоматически');

            // Отправляем кастомное событие для обновления интерфейса
            window.dispatchEvent(new CustomEvent('curatorLocalAlarmActivated', {
                detail: {
                    objectName: selectedObject.name,
                    description: alarmDescription || 'Тревога от куратора'
                }
            }));
        } catch (err) {
            console.error('Ошибка отправки тревоги:', err);
            showSnackbar('Ошибка при отправке тревоги', 'error');
        }
    };

    const handleObjectClick = (object: ObjectData) => {
        navigate(`/curator/object/${object.id}`);
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

    // Получение последнего задания для объекта (приоритет: новое > в работе > завершенное)
    const getLastIncompleteTask = (objectId: string) => {
        const objectTasks = tasks.filter(task => {
            // Проверяем по objectIds (приоритет) или по objects
            if (task.objectIds && task.objectIds.length > 0) {
                return task.objectIds.includes(objectId);
            }
            return task.objects.some(obj => obj.id === objectId);
        });

        if (objectTasks.length === 0) return null;

        // Сортируем по приоритету: pending > in_progress > completed
        const sortedTasks = objectTasks.sort((a, b) => {
            const priority = { 'pending': 3, 'in_progress': 2, 'completed': 1 };
            const aPriority = priority[a.status] || 0;
            const bPriority = priority[b.status] || 0;

            if (aPriority !== bPriority) {
                return bPriority - aPriority; // Высокий приоритет сначала
            }

            // Если приоритет одинаковый, сортируем по дате создания (новые сначала)
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });

        return sortedTasks[0];
    };

    const handleDismissAlarm = () => {
        console.log('🔙 CuratorPanel: Скрытие тревожного экрана (тревога не сбрасывается)');
        setAlarmDismissed(true);
        localStorage.setItem('curatorAlarmDismissed', 'true');
        stopAlarm(); // Останавливаем звук тревоги
        console.log('💾 CuratorPanel: Состояние сохранено в localStorage');
        console.log('🔇 CuratorPanel: Звук тревоги остановлен');
    };

    const handleDismissLocalAlarm = () => {
        console.log('🔙 Скрытие локальной тревоги куратора');
        setLocalAlarmActivated(false);
        localStorage.removeItem('curatorLocalAlarmActivated');
        localStorage.removeItem('curatorLocalAlarmObjectName');
        localStorage.removeItem('curatorLocalAlarmDescription');

        // Отправляем кастомное событие для обновления интерфейса
        window.dispatchEvent(new CustomEvent('curatorLocalAlarmDeactivated'));

        console.log('💾 Локальная тревога куратора скрыта');
    };

    const handleNavigate = (page: string) => {
        if (page === 'home') {
            navigate('/');
        } else if (page === 'object' && activeAlert?.objectId) {
            navigate(`/object/${activeAlert.objectId}`);
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    console.log('🎨 Рендеринг CuratorPanel:', {
        loading,
        error,
        curator: curator ? 'найден' : 'не найден',
        objectsCount: objects.length,
        tasksCount: tasks.length
    });

    if (loading) {
        console.log('⏳ Показываем индикатор загрузки');
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !curator) {
        console.log('❌ Показываем ошибку:', { error, curator: curator ? 'найден' : 'не найден' });
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error || 'Данные куратора не найдены'}
                </Alert>
            </Box>
        );
    }

    console.log('🔍 CuratorPanel: Состояние компонента:', { activeAlert: !!activeAlert, alarmDismissed, showAlarm, localAlarmActivated });

    // Если локальная тревога куратора активирована, показываем надпись и нижнюю навигацию
    if (localAlarmActivated) {
        console.log('📱 Показываем интерфейс с надписью для тревоги от куратора');

        // Получаем информацию о локальной тревоге
        const localAlarmObjectName = localStorage.getItem('curatorLocalAlarmObjectName') || '';
        const localAlarmDescription = localStorage.getItem('curatorLocalAlarmDescription') || '';

        console.log('📋 Локальная информация куратора:', { localAlarmObjectName, localAlarmDescription });

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
                        {localAlarmDescription ? localAlarmDescription : (localAlarmObjectName ? `Тревога с объекта: ${localAlarmObjectName}` : 'Тревога от куратора')}
                    </Typography>
                </Box>

                {/* Основной контент */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <Typography variant="h4" component="h1" sx={{ color: 'white', mb: 3, p: 3 }}>
                        Мои объекты
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
                        {objects.map((object) => {
                            const lastTask = getLastIncompleteTask(object.id);
                            return (
                                <Card
                                    key={object.id}
                                    sx={{
                                        width: '100%',
                                        cursor: 'pointer',
                                        boxShadow: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            boxShadow: 8,
                                            transform: 'translateY(-2px)',
                                        },
                                        display: 'flex',
                                        flexDirection: 'column',
                                        p: 2,
                                    }}
                                    onClick={() => handleObjectClick(object)}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 600,
                                                    textAlign: 'left',
                                                    mb: 1,
                                                    fontSize: '1.1rem',
                                                }}
                                            >
                                                {object.name}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: 'text.secondary',
                                                    textAlign: 'left',
                                                    mb: 1,
                                                }}
                                            >
                                                {object.address}
                                            </Typography>
                                            <Chip
                                                label={getStatusText(object.status)}
                                                color={getStatusColor(object.status)}
                                                size="small"
                                                sx={{ mr: 1 }}
                                            />
                                            {lastTask && (
                                                <Chip
                                                    label={`Задача: ${lastTask.title}`}
                                                    color="warning"
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                        <IconButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAlarm(object);
                                            }}
                                            sx={{
                                                bgcolor: 'error.main',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: 'error.dark',
                                                },
                                            }}
                                        >
                                            <WarningIcon />
                                        </IconButton>
                                    </Box>
                                </Card>
                            );
                        })}
                    </Box>
                </Box>

                {/* Нижняя навигация */}
                <InspectorBottomNavigation
                    currentPage="home"
                    onNavigate={handleNavigate}
                    showObject={!!localAlarmObjectName}
                />

                {/* Кнопка скрытия локальной тревоги */}
                <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleDismissLocalAlarm}
                        sx={{ fontWeight: 700 }}
                    >
                        Свернуть тревожный экран
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)' }}>
            {/* Показываем тревожный экран только если это не локальная тревога куратора */}
            {showAlarm && !alarmDismissed && !localAlarmActivated && (
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
                    {activeAlert?.description && activeAlert.description !== 'Тревога от инспектора' && (
                        <Typography variant="body1" sx={{ color: '#fff', mb: 2, textAlign: 'center', fontStyle: 'italic' }}>
                            {activeAlert.description}
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
                        <Button variant="contained" color="inherit" onClick={handleDismissAlarm} sx={{ fontWeight: 700 }}>
                            Свернуть тревожный экран
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Если тревожный экран скрыт, показываем обычный интерфейс с информацией о тревоге */}
            {alarmDismissed && activeAlert ? (
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
                            {activeAlert.description ? activeAlert.description : (activeAlert.type === 'admin' ? 'Тревога от администратора' :
                                activeAlert.objectName ? `Тревога с объекта: ${activeAlert.objectName}` :
                                    'Тревога от инспектора')}
                        </Typography>
                    </Box>

                    {/* Шапка как на главном экране куратора */}
                    <Header
                        title="Мои объекты"
                        hideCompanyName={true}
                        hideTitle={true}
                        hideUserName={true}
                        showProfileMenu={true}
                        onProfileClick={() => navigate('/curator/profile')}
                        onLogoClick={() => navigate('/')}
                    />

                    {/* Основной контент */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                        <Typography variant="h4" component="h1" sx={{ color: 'white', mb: 3 }}>
                            Мои объекты
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {objects.map((object) => {
                                const lastTask = getLastIncompleteTask(object.id);
                                return (
                                    <Card
                                        key={object.id}
                                        sx={{
                                            width: '100%',
                                            cursor: 'pointer',
                                            boxShadow: 2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: 8,
                                                transform: 'translateY(-2px)',
                                            },
                                            display: 'flex',
                                            flexDirection: 'column',
                                            p: 2,
                                        }}
                                        onClick={() => handleObjectClick(object)}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 600,
                                                        textAlign: 'left',
                                                        mb: 1,
                                                        fontSize: '1.1rem',
                                                    }}
                                                >
                                                    {object.name}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        textAlign: 'left',
                                                        mb: 1,
                                                    }}
                                                >
                                                    {object.address}
                                                </Typography>
                                                <Chip
                                                    label={getStatusText(object.status)}
                                                    color={getStatusColor(object.status)}
                                                    size="small"
                                                    sx={{ mr: 1 }}
                                                />
                                                {lastTask && (
                                                    <Chip
                                                        label={`Задача: ${lastTask.title}`}
                                                        color="warning"
                                                        size="small"
                                                    />
                                                )}
                                            </Box>
                                            <IconButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAlarm(object);
                                                }}
                                                sx={{
                                                    bgcolor: 'error.main',
                                                    color: 'white',
                                                    '&:hover': {
                                                        bgcolor: 'error.dark',
                                                    },
                                                }}
                                            >
                                                <WarningIcon />
                                            </IconButton>
                                        </Box>
                                    </Card>
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Нижняя навигация */}
                    <InspectorBottomNavigation
                        currentPage="home"
                        onNavigate={handleNavigate}
                        showObject={true}
                    />
                </Box>
            ) : (
                <>
                    <Header
                        title="Мои объекты"
                        hideCompanyName={true}
                        hideTitle={true}
                        hideUserName={true}
                        showProfileMenu={true}
                        onProfileClick={() => navigate('/curator/profile')}
                        onLogoClick={() => navigate('/')}
                    />

                    <Box sx={{ p: 3, pt: { xs: 12, sm: 16 } }}>
                        <Typography variant="h4" component="h1" sx={{ color: 'white', mb: 3 }}>
                            Мои объекты
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {objects.map((object) => {
                                const lastTask = getLastIncompleteTask(object.id);
                                return (
                                    <Card
                                        key={object.id}
                                        sx={{
                                            width: '100%',
                                            cursor: 'pointer',
                                            boxShadow: 2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: 8,
                                                transform: 'translateY(-2px)',
                                            },
                                            display: 'flex',
                                            flexDirection: 'column',
                                            p: 2,
                                        }}
                                        onClick={() => handleObjectClick(object)}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 600,
                                                        textAlign: 'left',
                                                        mb: 1,
                                                        fontSize: '1.1rem',
                                                    }}
                                                >
                                                    {object.name}
                                                </Typography>

                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: '0.9rem',
                                                        textAlign: 'left',
                                                        mb: 1,
                                                    }}
                                                >
                                                    {object.address}
                                                </Typography>

                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: '0.8rem',
                                                        textAlign: 'left',
                                                        mb: 1,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        lineHeight: '1.3em',
                                                        height: '2.6em'
                                                    }}
                                                >
                                                    {object.description || 'Описание отсутствует'}
                                                </Typography>
                                            </Box>

                                            <IconButton
                                                size="medium"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAlarm(object);
                                                }}
                                                sx={{
                                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                    color: '#f44336',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                                        color: '#d32f2f'
                                                    }
                                                }}
                                            >
                                                <WarningIcon fontSize="medium" />
                                            </IconButton>
                                        </Box>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                                            <Chip
                                                label={getStatusText(object.status)}
                                                color={getStatusColor(object.status) as any}
                                                size="small"
                                            />
                                            {lastTask && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ fontSize: '0.8rem' }}
                                                >
                                                    {lastTask.status === 'pending' ? 'Новое' :
                                                        lastTask.status === 'in_progress' ? 'В работе' : 'Завершено'}: {lastTask.createdAt.toLocaleDateString('ru-RU')} {lastTask.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Card>
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Диалог тревоги */}
                    <Dialog open={alarmDialog} onClose={() => setAlarmDialog(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Отправить тревогу</DialogTitle>
                        <DialogContent>
                            <Typography sx={{ mb: 2 }}>
                                Объект: {selectedObject?.name}
                            </Typography>
                            <TextField
                                fullWidth
                                label="Описание тревоги"
                                multiline
                                rows={3}
                                value={alarmDescription}
                                onChange={(e) => setAlarmDescription(e.target.value)}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setAlarmDialog(false)}>Отмена</Button>
                            <Button onClick={confirmAlarm} variant="contained" color="error">
                                Отправить тревогу
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={6000}
                        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    >
                        <Alert
                            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                            severity={snackbar.severity}
                        >
                            {snackbar.message}
                        </Alert>
                    </Snackbar>
                </>
            )}
        </Box>
    );
};

export default CuratorPanel; 