/**
 * @file: TaskManagement.tsx
 * @description: Компонент для управления заданиями администратором
 * @dependencies: react, material-ui, types
 * @created: 2025-06-27
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    IconButton,
    Chip,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Snackbar,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Checkbox,
    ListItemButton,

} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Schedule as ScheduleIcon,
    Add as AddIcon,
    ExpandMore as ExpandMoreIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon,
    AccessTime as TimeIcon,
    ArrowBack as ArrowBackIcon,

} from '@mui/icons-material';
import { Task, Inspector, ObjectData, ObjectStatus } from '../../types';
import { createTask, subscribeTasks } from '../../services/tasks';
import { getInspectors } from '../../services/auth';
import { getObjects, getActiveObjects } from '../../services/objects';
import SimpleYandexMap from '../maps/SimpleYandexMap';
import { sendPushToUsers } from '../../services/pushNotifications';
import { cacheManager } from '../../services/cache';
import { colors } from '../../utils/colors';
import { useLoadingState } from '../../hooks/useLoadingState';
import LoadingIndicator from '../common/LoadingIndicator';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`task-tabpanel-${index}`}
            aria-labelledby={`task-tab-${index}`}
            sx={{ height: '100%', overflow: 'hidden' }}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
                    {children}
                </Box>
            )}
        </Box>
    );
}

const TaskManagement = React.memo(() => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [inspectors, setInspectors] = useState<Inspector[]>([]);
    const { showLoading, startLoading, stopLoading } = useLoadingState({
        minLoadingTime: 800,
        debounceDelay: 200
    });
    const [tabValue, setTabValue] = useState(0);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [objectsDialogOpen, setObjectsDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [selectedObjects, setSelectedObjects] = useState<string[]>([]);

    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        assignedTo: '',
        objects: [] as string[]
    });



    const [objectsDialogKey, setObjectsDialogKey] = useState(0);
    const [creatingTask, setCreatingTask] = useState(false);

    // Мемоизированные функции для стабильности с дебаунсингом
    const handleTasksUpdate = useCallback((tasksData: Task[]) => {
        console.log('📊 TaskManagement: Получено обновление заданий:', tasksData.length);
        setTasks(tasksData);
        stopLoading();
    }, [stopLoading]);

    // Простая функция дебаунсинга
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const debouncedTasksUpdate = useCallback((tasksData: Task[]) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            console.log('⏱️ TaskManagement: Дебаунсированное обновление:', tasksData.length);
            setTasks(tasksData);
            stopLoading();
        }, 300);
    }, [stopLoading]);

    const loadInitialData = useCallback(async () => {
        try {
            console.log('🔄 Загрузка данных заданий с кэшированием...');
            const [inspectorsData, objectsData] = await Promise.all([
                cacheManager.getInspectors(),
                cacheManager.getObjects()
            ]);
            setInspectors(inspectorsData);
            setObjects(objectsData);
            console.log('✅ Данные заданий загружены из кэша:', {
                inspectors: inspectorsData.length,
                objects: objectsData.length
            });
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            showSnackbar('Ошибка загрузки данных', 'error');
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initializeData = async () => {
            if (!isMounted) return;

            startLoading();
            console.log('🔄 TaskManagement: Инициализация данных...');

            try {
                // Загружаем данные асинхронно
                await loadInitialData();

                if (!isMounted) return;

                // Подписываемся на задания только после загрузки данных
                const unsubscribe = subscribeTasks((tasksData) => {
                    if (isMounted) {
                        console.log('📊 TaskManagement: Обновление заданий:', tasksData.length);
                        debouncedTasksUpdate(tasksData);
                    }
                });

                return unsubscribe;
            } catch (error) {
                console.error('❌ TaskManagement: Ошибка инициализации:', error);
                if (isMounted) {
                    stopLoading();
                }
            }
        };

        initializeData().then(unsubscribe => {
            if (unsubscribe && isMounted) {
                return () => {
                    console.log('🧹 TaskManagement: Отписка от обновлений');
                    unsubscribe();
                };
            }
        });

        return () => {
            isMounted = false;
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []); // Убираем зависимости для предотвращения лишних перезапусков

    // Загрузка только активных объектов для создания задания
    const loadActiveObjects = async () => {
        try {
            const activeObjects = await getActiveObjects();
            setObjects(activeObjects);
        } catch (error) {
            console.error('Ошибка загрузки активных объектов:', error);
            showSnackbar('Ошибка загрузки активных объектов', 'error');

            // Fallback: загружаем все объекты и фильтруем на клиенте
            try {
                const allObjects = await getObjects();
                const activeOnly = allObjects.filter(obj => obj.status === 'active');
                setObjects(activeOnly);
                showSnackbar(`Загружено ${activeOnly.length} активных объектов`, 'success');
            } catch (fallbackError) {
                console.error('Ошибка fallback загрузки:', fallbackError);
                showSnackbar('Не удалось загрузить объекты', 'error');
            }
        }
    };

    const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    }, []);

    const handleAddTask = async () => {
        try {
            setCreatingTask(true);
            if (!newTask.title || !newTask.assignedTo || selectedObjects.length === 0) {
                showSnackbar('Заполните все обязательные поля', 'error');
                setCreatingTask(false);
                return;
            }

            // Получаем данные инспектора
            const inspector = inspectors.find(i => i.uid === newTask.assignedTo);
            if (!inspector) {
                showSnackbar('Инспектор не найден', 'error');
                setCreatingTask(false);
                return;
            }

            // Проверяем, что инспектор работает
            if (inspector.status !== 'working') {
                showSnackbar('Нельзя назначить задание инспектору, который не работает', 'error');
                setCreatingTask(false);
                return;
            }

            // Получаем данные объектов
            const taskObjects = objects
                .filter(obj => selectedObjects.includes(obj.id))
                .map(obj => ({
                    id: obj.id,
                    name: obj.name,
                    address: obj.address,
                    status: 'pending' as const
                }));

            const taskData = {
                title: newTask.title,
                description: newTask.description,
                assignedTo: newTask.assignedTo,
                assignedToName: inspector.name,
                objectIds: selectedObjects,
                objects: taskObjects
            };

            await createTask(taskData);

            // Отправляем push уведомление инспектору
            try {
                const pushResult = await sendPushToUsers(
                    [newTask.assignedTo],
                    'Новое задание',
                    `Вам назначено новое задание: ${newTask.title}`,
                    undefined,
                    undefined
                );

                if (pushResult.success) {
                    console.log('✅ Push уведомление отправлено инспектору:', pushResult);
                } else {
                    console.warn('⚠️ Ошибка отправки push уведомления:', pushResult.message);
                }
            } catch (pushError) {
                console.error('❌ Ошибка отправки push уведомления:', pushError);
            }

            // Сброс формы
            setNewTask({
                title: '',
                description: '',
                assignedTo: '',
                objects: []
            });
            setSelectedObjects([]);
            setAddDialogOpen(false);

            showSnackbar('Задание создано успешно', 'success');
            setCreatingTask(false);
        } catch (error) {
            setCreatingTask(false);
            console.error('Ошибка создания задания:', error);
            showSnackbar('Ошибка создания задания', 'error');
        }
    };

    const handleObjectSelection = (objectId: string) => {
        setSelectedObjects(prev =>
            prev.includes(objectId)
                ? prev.filter(id => id !== objectId)
                : [...prev, objectId]
        );
    };

    const openObjectsDialog = () => {
        loadActiveObjects();
        setObjectsDialogKey(prev => prev + 1);
        setObjectsDialogOpen(true);
    };

    const getTaskStatusIcon = useCallback((status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon color="success" />;
            case 'in_progress':
                return <ScheduleIcon color="primary" />;
            case 'pending':
                return <PendingIcon color="warning" />;
            default:
                return <AssignmentIcon />;
        }
    }, []);

    const getTaskStatusText = useCallback((status: string) => {
        switch (status) {
            case 'pending':
                return 'Ожидает';
            case 'in_progress':
                return 'В работе';
            case 'completed':
                return 'Завершено';
            case 'cancelled':
                return 'Отменено';
            default:
                return 'Неизвестно';
        }
    }, []);

    const getTaskStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'in_progress':
                return 'info';
            case 'completed':
                return 'success';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    }, []);

    const getObjectStatusColor = useCallback((status: ObjectStatus) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'error';
            case 'maintenance':
                return 'warning';
            default:
                return 'default';
        }
    }, []);

    const getObjectStatusText = useCallback((status: ObjectStatus) => {
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
    }, []);

    const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    // Мемоизированные фильтрованные данные
    const currentTasks = useMemo(() => tasks.filter(task => task.status !== 'completed'), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(task => task.status === 'completed'), [tasks]);

    if (showLoading) {
        return <LoadingIndicator message="Загрузка заданий..." />;
    }

    return (
        <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Заголовок страницы */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexShrink: 0 }}>
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
                <Typography variant="h4" component="h1" sx={{ color: colors.text.primary, fontWeight: 600, flexGrow: 1 }}>
                    Управление заданиями
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDialogOpen(true)}
                    sx={{
                        backgroundColor: '#4CAF50',
                        '&:hover': {
                            backgroundColor: '#45a049'
                        }
                    }}
                >
                    Создать задание
                </Button>
            </Box>

            <Card sx={{
                background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                border: '2px solid #D4AF37',
                borderRadius: 3,
                boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <Box sx={{
                    borderBottom: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    flexShrink: 0,
                    '& .MuiTabs-root': {
                        '& .MuiTab-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&.Mui-selected': {
                                color: '#ffffff'
                            }
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#D4AF37'
                        }
                    }
                }}>
                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab
                            label={`Текущие задания (${currentTasks.length})`}
                            id="task-tab-0"
                            aria-controls="task-tabpanel-0"
                        />
                        <Tab
                            label={`Выполненные задания (${completedTasks.length})`}
                            id="task-tab-1"
                            aria-controls="task-tabpanel-1"
                        />
                    </Tabs>
                </Box>

                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <TabPanel value={tabValue} index={0}>
                        {currentTasks.length === 0 ? (
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', py: 4 }}>
                                Нет текущих заданий
                            </Typography>
                        ) : (
                            <List>
                                {currentTasks.map((task, index) => (
                                    <React.Fragment key={task.id}>
                                        <ListItem sx={{
                                            color: '#ffffff',
                                            border: '2px solid rgba(255, 255, 255, 0.3)',
                                            borderRadius: 2,
                                            mb: 2,
                                            background: 'rgba(255, 255, 255, 0.05)'
                                        }}>
                                            <ListItemIcon>
                                                <Box sx={{ color: '#ffffff' }}>
                                                    {getTaskStatusIcon(task.status)}
                                                </Box>
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="h6" sx={{ color: '#ffffff' }}>
                                                            {task.title}
                                                        </Typography>
                                                        <Chip
                                                            label={getTaskStatusText(task.status)}
                                                            color={getTaskStatusColor(task.status) as any}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 600,
                                                                '& .MuiChip-label': {
                                                                    color: '#ffffff'
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                                                            {task.description}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <PersonIcon fontSize="small" sx={{ color: '#ffffff' }} />
                                                                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                                                    {task.assignedToName}
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <TimeIcon fontSize="small" sx={{ color: '#ffffff' }} />
                                                                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                                                    Назначено: {task.assignedAt?.toLocaleString('ru-RU')}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                        {task.acceptedAt && (
                                                            <Typography variant="body2" color="success.main">
                                                                ✅ Принято к выполнению: {task.acceptedAt.toLocaleString('ru-RU')}
                                                            </Typography>
                                                        )}

                                                        <Accordion sx={{
                                                            mt: 2,
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            '& .MuiAccordionSummary-root': {
                                                                color: '#ffffff'
                                                            },
                                                            '& .MuiAccordionDetails-root': {
                                                                color: '#ffffff'
                                                            }
                                                        }}>
                                                            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
                                                                <Typography variant="subtitle2" sx={{ color: '#ffffff' }}>
                                                                    Объекты для проверки ({task.objects.length})
                                                                </Typography>
                                                            </AccordionSummary>
                                                            <AccordionDetails>
                                                                <List dense>
                                                                    {task.objects.map((obj) => {
                                                                        const checkedDate = obj.checkedAt instanceof Date && !isNaN(obj.checkedAt.getTime())
                                                                            ? obj.checkedAt
                                                                            : (typeof obj.checkedAt === 'string' ? new Date(obj.checkedAt) : null);
                                                                        const isValidChecked = checkedDate instanceof Date && !isNaN(checkedDate.getTime());
                                                                        return (
                                                                            <ListItem key={obj.id} sx={{
                                                                                alignItems: 'flex-start',
                                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                                borderRadius: 1,
                                                                                mb: 1,
                                                                                background: 'rgba(255, 255, 255, 0.03)'
                                                                            }}>
                                                                                <ListItemIcon>
                                                                                    <LocationIcon fontSize="small" sx={{ color: '#ffffff' }} />
                                                                                </ListItemIcon>
                                                                                <Box sx={{ width: '100%' }}>
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                        <Typography component="span" sx={{ fontWeight: 500, color: '#ffffff' }}>{obj.name}</Typography>
                                                                                        {obj.status === 'checked' ? (
                                                                                            <Chip label="Проверен" color="success" size="small" sx={{
                                                                                                fontWeight: 600,
                                                                                                '& .MuiChip-label': {
                                                                                                    color: '#ffffff'
                                                                                                }
                                                                                            }} />
                                                                                        ) : (
                                                                                            <Chip label="Ожидает" color="warning" size="small" sx={{
                                                                                                fontWeight: 600,
                                                                                                '& .MuiChip-label': {
                                                                                                    color: '#ffffff'
                                                                                                }
                                                                                            }} />
                                                                                        )}
                                                                                    </Box>
                                                                                    <Typography variant="body2" component="span" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                                                        {obj.address}
                                                                                    </Typography>
                                                                                    {obj.status === 'checked' && isValidChecked && (
                                                                                        <Typography variant="body2" color="success.main" component="span" sx={{ display: 'block', mt: 0.5 }}>
                                                                                            ✅ Проверен: {checkedDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                        </Typography>
                                                                                    )}
                                                                                    {obj.comments && (
                                                                                        <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                                                                            Замечания: {obj.comments}
                                                                                        </Typography>
                                                                                    )}
                                                                                </Box>
                                                                            </ListItem>
                                                                        );
                                                                    })}
                                                                </List>
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        {index < currentTasks.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        {completedTasks.length === 0 ? (
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', py: 4 }}>
                                Нет выполненных заданий
                            </Typography>
                        ) : (
                            <List>
                                {completedTasks.map((task, index) => (
                                    <React.Fragment key={task.id}>
                                        <ListItem sx={{
                                            color: '#ffffff',
                                            border: '2px solid rgba(255, 255, 255, 0.3)',
                                            borderRadius: 2,
                                            mb: 2,
                                            background: 'rgba(255, 255, 255, 0.05)'
                                        }}>
                                            <ListItemIcon>
                                                {getTaskStatusIcon(task.status)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="h6">
                                                            {task.title}
                                                        </Typography>
                                                        <Chip
                                                            label={getTaskStatusText(task.status)}
                                                            color={getTaskStatusColor(task.status) as any}
                                                            size="small"
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            {task.description}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <PersonIcon fontSize="small" />
                                                                <Typography variant="body2">
                                                                    {task.assignedToName}
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <TimeIcon fontSize="small" />
                                                                <Typography variant="body2">
                                                                    Назначено: {task.assignedAt?.toLocaleString('ru-RU')}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                        {task.completedAt && (
                                                            <Typography variant="body2" color="success.main">
                                                                ✅ Выполнено: {task.completedAt.toLocaleString('ru-RU')}
                                                            </Typography>
                                                        )}

                                                        <Accordion sx={{ mt: 2 }}>
                                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                                <Typography variant="subtitle2">
                                                                    Проверенные объекты ({task.objects.length})
                                                                </Typography>
                                                            </AccordionSummary>
                                                            <AccordionDetails>
                                                                <List dense>
                                                                    {task.objects.map((obj) => {
                                                                        const checkedDate = obj.checkedAt instanceof Date && !isNaN(obj.checkedAt.getTime())
                                                                            ? obj.checkedAt
                                                                            : (typeof obj.checkedAt === 'string' ? new Date(obj.checkedAt) : null);
                                                                        const isValidChecked = checkedDate instanceof Date && !isNaN(checkedDate.getTime());
                                                                        return (
                                                                            <ListItem key={obj.id} sx={{
                                                                                alignItems: 'flex-start',
                                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                                borderRadius: 1,
                                                                                mb: 1,
                                                                                background: 'rgba(255, 255, 255, 0.03)'
                                                                            }}>
                                                                                <ListItemIcon>
                                                                                    <LocationIcon fontSize="small" />
                                                                                </ListItemIcon>
                                                                                <Box sx={{ width: '100%' }}>
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                        <Typography component="span" sx={{ fontWeight: 500 }}>{obj.name}</Typography>
                                                                                        {obj.status === 'checked' ? (
                                                                                            <Chip label="Проверен" color="success" size="small" />
                                                                                        ) : (
                                                                                            <Chip label="Ожидает" color="warning" size="small" />
                                                                                        )}
                                                                                    </Box>
                                                                                    <Typography variant="body2" color="text.secondary" component="span">
                                                                                        {obj.address}
                                                                                    </Typography>
                                                                                    {obj.status === 'checked' && isValidChecked && (
                                                                                        <Typography variant="body2" color="success.main" component="span" sx={{ display: 'block', mt: 0.5 }}>
                                                                                            ✅ Проверен: {checkedDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                        </Typography>
                                                                                    )}
                                                                                    {obj.comments && (
                                                                                        <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                                                                            Замечания: {obj.comments}
                                                                                        </Typography>
                                                                                    )}
                                                                                </Box>
                                                                            </ListItem>
                                                                        );
                                                                    })}
                                                                </List>
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        {index < completedTasks.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </TabPanel>
                </Box>
            </Card>

            <Dialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                maxWidth="sm"
                fullWidth
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
                    Создать новое задание
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Название задания"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        sx={{
                            mb: 2,
                            mt: 1,
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
                    <TextField
                        fullWidth
                        label="Описание"
                        multiline
                        rows={3}
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        sx={{
                            mb: 2,
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
                    <FormControl fullWidth>
                        <InputLabel sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&.Mui-focused': {
                                color: '#D4AF37',
                            },
                        }}>
                            Назначить инспектору ({inspectors.filter(i => i.status === 'working').length} доступно)
                        </InputLabel>
                        <Select
                            value={newTask.assignedTo}
                            onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        backgroundColor: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%) !important',
                                        boxShadow: '0 8px 32px rgba(10, 36, 99, 0.5) !important',
                                        border: '1px solid rgba(255, 255, 255, 0.2) !important',
                                        borderRadius: 2,
                                        mt: 1,
                                        '& .MuiMenuItem-root': {
                                            color: '#fff !important',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
                                            },
                                            '&.Mui-selected': {
                                                backgroundColor: 'rgba(212, 175, 55, 0.2) !important',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(212, 175, 55, 0.3) !important',
                                                }
                                            }
                                        }
                                    }
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#D4AF37',
                                },
                                '& .MuiSelect-icon': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                },
                                '& .MuiSelect-select': {
                                    color: '#fff !important',
                                    fontWeight: 500,
                                },
                            }}
                        >
                            {inspectors.filter(inspector => inspector.status === 'working').length === 0 ? (
                                <MenuItem disabled>
                                    Нет доступных инспекторов
                                </MenuItem>
                            ) : (
                                inspectors
                                    .filter(inspector => inspector.status === 'working')
                                    .map((inspector) => (
                                        <MenuItem key={inspector.uid} value={inspector.uid}>
                                            {inspector.name}
                                        </MenuItem>
                                    ))
                            )}
                        </Select>
                    </FormControl>

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            Выбранные объекты ({selectedObjects.length})
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<LocationIcon />}
                            onClick={openObjectsDialog}
                            fullWidth
                            sx={{
                                color: 'rgba(255, 255, 255, 0.8)',
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                }
                            }}
                        >
                            Выбрать объекты для проверки
                        </Button>
                        {selectedObjects.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                                {selectedObjects.map(objId => {
                                    const obj = objects.find(o => o.id === objId);
                                    return (
                                        <Chip
                                            key={objId}
                                            label={obj?.name}
                                            size="small"
                                            onDelete={() => handleObjectSelection(objId)}
                                            sx={{
                                                mr: 0.5,
                                                mb: 0.5,
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                '& .MuiChip-deleteIcon': {
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    '&:hover': {
                                                        color: '#ff6b6b',
                                                    }
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    pt: 2,
                    px: 3,
                    pb: 2
                }}>
                    <Button
                        onClick={() => setAddDialogOpen(false)}
                        sx={{
                            color: '#F44336',
                            '&:hover': {
                                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                            }
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleAddTask}
                        variant="contained"
                        disabled={!newTask.title || !newTask.assignedTo}
                        sx={{
                            backgroundColor: '#4caf50',
                            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                            '&:hover': {
                                backgroundColor: '#45a049',
                                background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
                            },
                            '&:disabled': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.3)',
                            }
                        }}
                    >
                        Создать
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Диалог выбора объектов */}
            <Dialog
                open={objectsDialogOpen}
                onClose={() => setObjectsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Выбор объектов для задания
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Показаны только активные объекты
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                        {/* Список объектов */}
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Выберите объекты ({objects.length} доступно)
                            </Typography>
                            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                                {objects.map((obj) => (
                                    <ListItemButton
                                        key={obj.id}
                                        onClick={() => handleObjectSelection(obj.id)}
                                        selected={selectedObjects.includes(obj.id)}
                                        sx={{
                                            border: '1px solid',
                                            borderColor: selectedObjects.includes(obj.id) ? 'primary.main' : 'divider',
                                            borderRadius: 1,
                                            mb: 1
                                        }}
                                    >
                                        <ListItemIcon>
                                            <Checkbox
                                                edge="start"
                                                checked={selectedObjects.includes(obj.id)}
                                                tabIndex={-1}
                                                disableRipple
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={<Box component="span">{obj.name}</Box>}
                                            secondary={
                                                <Box component="span">
                                                    <Typography variant="body2" color="text.secondary" component="span">
                                                        {obj.address}
                                                    </Typography>
                                                    <Chip
                                                        label={getObjectStatusText(obj.status)}
                                                        size="small"
                                                        color={getObjectStatusColor(obj.status)}
                                                        sx={{ mt: 0.5 }}
                                                    />
                                                </Box>
                                            }
                                        />
                                    </ListItemButton>
                                ))}
                            </List>
                        </Box>

                        {/* Карта с объектами */}
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Карта объектов
                            </Typography>
                            <Box sx={{ height: 400, border: '1px solid #ddd', borderRadius: 1 }}>
                                <SimpleYandexMap
                                    key={objectsDialogKey}
                                    center={[48.4827, 135.0840]}
                                    zoom={12}
                                    markers={objects.map(obj => ({
                                        id: obj.id,
                                        position: obj.position,
                                        title: obj.name
                                    }))}
                                    onMarkerClick={(id) => handleObjectSelection(id)}
                                />
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setObjectsDialogOpen(false)}
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
                        onClick={() => setObjectsDialogOpen(false)}
                        variant="contained"
                        sx={{
                            backgroundColor: '#2196F3',
                            '&:hover': {
                                backgroundColor: '#1976D2'
                            }
                        }}
                    >
                        Выбрать ({selectedObjects.length})
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={creatingTask} maxWidth="xs" fullWidth>
                <DialogTitle>Создание задания</DialogTitle>
                <DialogContent sx={{ textAlign: 'center', py: 4 }}>
                    <LoadingIndicator message="Задание создается..." showText={false} size={40} />
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        Задание создается и передается инспектору...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Пожалуйста, подождите. Не закрывайте окно до завершения операции.
                    </Typography>
                </DialogContent>
            </Dialog>
        </Box>
    );
});

export default TaskManagement; 