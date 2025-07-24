/**
 * @file: CuratorObjectDetail.tsx
 * @description: Детальная страница объекта для куратора с заданиями
 * @dependencies: react, material-ui, tasks service
 * @created: 2025-07-20
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    CircularProgress,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    LocationOn as LocationIcon
} from '@mui/icons-material';
import { Task, ObjectData } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Header from '../common/Header';
import { cacheManager } from '../../services/cache';
import { getObjectById } from '../../services/objects';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
        </div>
    );
}

const CuratorObjectDetail: React.FC = () => {
    const { objectId } = useParams<{ objectId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [object, setObject] = useState<ObjectData | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [filterStartDate, setFilterStartDate] = useState<string>('');
    const [filterEndDate, setFilterEndDate] = useState<string>('');

    useEffect(() => {
        if (objectId) {
            loadObjectData();
        }
    }, [objectId]);

    useEffect(() => {
        if (objectId) {
            loadTasks();
        }
    }, [objectId]);

    const loadObjectData = async () => {
        try {
            if (!objectId) return;
            const objectData = await getObjectById(objectId);
            setObject(objectData);
            setLoading(false);
        } catch (error) {
            console.error('Ошибка загрузки объекта:', error);
            setLoading(false);
        }
    };

    const loadTasks = () => {
        if (!objectId) return;

        const unsubscribe = cacheManager.subscribeToObjectTasks(objectId, (data: Task[]) => {
            console.log('📦 Получены задания для объекта:', objectId, data.length);
            console.log('📋 Детали заданий:', data.map(t => ({
                id: t.id,
                title: t.title,
                status: t.status,
                objects: t.objects.map(o => ({
                    id: o.id,
                    name: o.name,
                    comments: o.comments,
                    notes: o.notes
                }))
            })));
            setTasks(data);
            setLoading(false);
        });

        return () => unsubscribe();
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const getTaskStatusIcon = (status: string) => {
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
    };

    const getTaskStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Новое';
            case 'in_progress':
                return 'В работе';
            case 'completed':
                return 'Завершено';
            case 'cancelled':
                return 'Отменено';
            default:
                return 'Неизвестно';
        }
    };

    // Фильтрация по статусу
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
    let completedTasks = tasks.filter(task => task.status === 'completed');

    // Фильтрация по дате завершения
    if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        completedTasks = completedTasks.filter(task => task.completedAt && task.completedAt >= start);
    }
    if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        completedTasks = completedTasks.filter(task => task.completedAt && task.completedAt <= end);
    }

    const tabs = [
        { label: 'Текущие', tasks: pendingTasks },
        { label: 'В работе', tasks: inProgressTasks },
        { label: 'Завершённые', tasks: completedTasks }
    ];

    if (loading) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!object) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Объект не найден</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)' }}>
            <Box sx={{ position: 'sticky', top: 0, zIndex: 1000, background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)' }}>
                <Header
                    title={`Объект: ${object.name}`}
                    hideCompanyName={true}
                    hideTitle={true}
                    hideUserName={true}
                    showProfileMenu={true}
                    onProfileClick={() => navigate('/curator/profile')}
                    onLogoClick={() => navigate('/curator')}
                />

                <Box sx={{ p: 3, pb: 1 }}>
                    {/* Заголовок и кнопка назад */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <IconButton
                            onClick={() => navigate('/curator')}
                            sx={{
                                mr: 2,
                                color: '#fff',
                                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.2)',
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h4" component="h1" sx={{ color: 'white', fontWeight: 700 }}>
                                {object.name}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#ccc', fontSize: 16 }}>
                                {object.address}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Информация об объекте */}
                    <Card sx={{
                        mb: 3,
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <CardContent sx={{ textAlign: 'left' }}>
                            <Typography variant="h6" sx={{ color: '#fff', mb: 2, textAlign: 'left' }}>
                                Информация об объекте
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-start' }}>
                                <Chip
                                    icon={<LocationIcon />}
                                    label={object.address}
                                    variant="outlined"
                                    sx={{ color: '#fff', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                                />
                                <Chip
                                    label={object.status === 'active' ? 'Активен' : object.status === 'inactive' ? 'Неактивен' : 'На обслуживании'}
                                    color={object.status === 'active' ? 'success' : object.status === 'inactive' ? 'error' : 'warning'}
                                    size="small"
                                />
                            </Box>
                            {object.description && (
                                <Typography variant="body2" sx={{ color: '#ccc', mt: 2, textAlign: 'left' }}>
                                    {object.description}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Задания */}
                    <Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
                        Задания объекта
                    </Typography>

                    <Card sx={{
                        borderRadius: 3,
                        boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                        background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        p: { xs: 1, sm: 2 },
                        transition: 'none !important',
                        '&:hover': {
                            transform: 'none !important',
                            boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37) !important',
                            background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%) !important',
                            borderColor: 'rgba(255, 255, 255, 0.1) !important'
                        }
                    }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', background: 'transparent' }}>
                            <Tabs
                                value={tabValue}
                                onChange={handleTabChange}
                                variant="fullWidth"
                                sx={{
                                    minHeight: { xs: 36, sm: 48 },
                                    '& .MuiTabs-indicator': {
                                        backgroundColor: '#D4AF37'
                                    }
                                }}
                            >
                                {tabs.map((tab, index) => (
                                    <Tab
                                        key={tab.label}
                                        label={`${tab.label} (${tab.tasks.length})`}
                                        sx={{
                                            color: '#fff',
                                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                            minHeight: { xs: 36, sm: 48 },
                                            '&.Mui-selected': {
                                                color: '#D4AF37'
                                            }
                                        }}
                                    />
                                ))}
                            </Tabs>
                        </Box>

                        {/* Фильтр для завершенных заданий */}
                        {tabValue === 2 && (
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
                                    Фильтр по дате завершения:
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <TextField
                                        label="С даты"
                                        type="date"
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                        size="small"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                                '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                                            },
                                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                            '& .MuiInputBase-input': { color: '#fff' }
                                        }}
                                    />
                                    <TextField
                                        label="По дату"
                                        type="date"
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                        size="small"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                                '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                                            },
                                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                            '& .MuiInputBase-input': { color: '#fff' }
                                        }}
                                    />
                                </Box>
                            </Box>
                        )}

                        {tabs.map((tab, index) => (
                            <TabPanel key={tab.label} value={tabValue} index={index}>
                                {tab.tasks.length === 0 ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <Typography sx={{ color: '#ccc' }}>
                                            Нет заданий в категории "{tab.label}"
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List sx={{ p: 0 }}>
                                        {tab.tasks.map((task, taskIndex) => (
                                            <React.Fragment key={task.id}>
                                                <ListItem
                                                    sx={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        margin: '8px 0',
                                                        borderRadius: '16px',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        transition: 'none !important',
                                                        '&:hover': {
                                                            background: 'rgba(255, 255, 255, 0.08) !important',
                                                            transform: 'none !important',
                                                            border: '1px solid rgba(255, 255, 255, 0.15) !important'
                                                        }
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        {getTaskStatusIcon(task.status)}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                                                {task.title}
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                    <PersonIcon sx={{ fontSize: 16, color: '#ccc' }} />
                                                                    <Typography variant="body2" sx={{ color: '#ccc' }}>
                                                                        {task.assignedToName || 'Не назначен'}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                    <CalendarIcon sx={{ fontSize: 16, color: '#ccc' }} />
                                                                    <Typography variant="body2" sx={{ color: '#ccc' }}>
                                                                        Назначено: {task.createdAt.toLocaleDateString('ru-RU')} {task.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                                    </Typography>
                                                                </Box>
                                                                {task.completedAt && (
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                        <Typography variant="body2" sx={{ color: '#4caf50' }}>
                                                                            Завершено: {task.completedAt.toLocaleDateString('ru-RU')} {task.completedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                                {task.status === 'completed' && task.objects && task.objects.length > 0 && task.objects.some(obj => obj.comments) && (
                                                                    <Box sx={{ mt: 1 }}>
                                                                        <Typography variant="body2" sx={{ color: '#ccc', fontWeight: 500, mb: 0.5 }}>
                                                                            Замечания:
                                                                        </Typography>
                                                                        {task.objects.map((obj, objIndex) => (
                                                                            obj.comments && (
                                                                                <Typography key={objIndex} variant="body2" sx={{ color: '#ccc', ml: 1, mb: 0.5 }}>
                                                                                    • {obj.comments}
                                                                                </Typography>
                                                                            )
                                                                        ))}
                                                                    </Box>
                                                                )}
                                                                {task.status !== 'completed' && (
                                                                    <Chip
                                                                        label={getTaskStatusText(task.status)}
                                                                        size="small"
                                                                        color={
                                                                            task.status === 'in_progress' ? 'primary' :
                                                                                task.status === 'pending' ? 'warning' : 'default'
                                                                        }
                                                                    />
                                                                )}
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                                {taskIndex < tab.tasks.length - 1 && <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                )}
                            </TabPanel>
                        ))}
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default CuratorObjectDetail; 