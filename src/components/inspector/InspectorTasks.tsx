/**
 * @file: InspectorTasks.tsx
 * @description: Страница инспектора для просмотра и работы с заданиями
 * @dependencies: react, material-ui, tasks service
 * @created: 2025-06-30
 */

import React, { useEffect, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import {
    Box,
    Typography,
    Card,

    Chip,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    CircularProgress,
    Button,
    TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Schedule as ScheduleIcon
} from '@mui/icons-material';
import { Task } from '../../types';
import { acceptTask as acceptTaskService } from '../../services/tasks';
import { useAuth } from '../../context/AuthContext';
import InspectorTaskDetail from './InspectorTaskDetail';
import { cacheManager } from '../../services/cache';

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

const InspectorTasks: React.FC = () => {
    const { user } = useAuth();
    const isMobile = useMediaQuery('(max-width:600px)');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [expanded, setExpanded] = useState<string | false>(false);
    const [filterStartDate, setFilterStartDate] = useState<string>('');
    const [filterEndDate, setFilterEndDate] = useState<string>('');
    const [acceptingTask, setAcceptingTask] = useState<string | null>(null);

    useEffect(() => {
        if (user?.uid) {
            setLoading(true);
            const unsubscribe = cacheManager.subscribeToTasks(user.uid, (data: Task[]) => {
                setTasks(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user?.uid]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
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

    // Массив для вкладок и соответствующих списков
    const tabs = [
        { label: 'Текущие', tasks: pendingTasks },
        { label: 'В работе', tasks: inProgressTasks },
        { label: 'Завершённые', tasks: completedTasks }
    ];

    // Callback для скрытия задания после завершения
    const handleTaskComplete = (taskId: string) => {
        setExpanded(false);
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: { xs: 1, sm: 3 } }}>
                Мои задания
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
                },
                '&:active': {
                    transform: 'none !important',
                    boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37) !important',
                    background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%) !important'
                }
            }} className="inspectorCard">
                <Box sx={{ borderBottom: 1, borderColor: 'divider', background: 'transparent' }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        variant={isMobile ? 'fullWidth' : 'standard'}
                        orientation={isMobile ? 'horizontal' : 'horizontal'}
                        sx={{
                            minHeight: { xs: 36, sm: 48 },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#D4AF37'
                            }
                        }}
                    >
                        {tabs.map((tab, idx) => (
                            <Tab
                                key={tab.label}
                                label={`${tab.label} (${tab.tasks.length})`}
                                sx={{
                                    fontSize: { xs: 13, sm: 16 },
                                    color: '#E0E0E0',
                                    fontWeight: 600,
                                    transition: 'none !important',
                                    background: 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'inherit !important',
                                        boxShadow: 'none !important',
                                        transform: 'none !important',
                                    },
                                    '&.Mui-selected': {
                                        color: '#D4AF37',
                                        backgroundColor: 'rgba(212, 175, 55, 0.08)',
                                        borderRadius: 8,
                                        boxShadow: 'none !important',
                                        transform: 'none !important',
                                    },
                                    '&:active': {
                                        boxShadow: 'none !important',
                                        transform: 'none !important',
                                    }
                                }}
                            />
                        ))}
                    </Tabs>
                </Box>
                <Box sx={{ p: { xs: 1, sm: 2 } }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            {tabValue === 0 && (
                                <List sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
                                    {tabs[0].tasks.map(task => (
                                        <Accordion
                                            key={task.id}
                                            expanded={expanded === task.id}
                                            onChange={handleAccordionChange(task.id)}
                                            sx={{
                                                mb: 1,
                                                borderRadius: { xs: 1, sm: 2 },
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                transition: 'none !important',
                                                '&:hover': {
                                                    transform: 'none !important',
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                                    background: 'rgba(255, 255, 255, 0.03)'
                                                },
                                                '&:active': {
                                                    transform: 'none !important',
                                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                    background: 'rgba(255, 255, 255, 0.02)'
                                                }
                                            }}
                                        >
                                            <AccordionSummary
                                                expandIcon={<ExpandMoreIcon />}
                                                sx={{
                                                    minHeight: { xs: 40, sm: 56 },
                                                    transition: 'none !important',
                                                    '&:hover': {
                                                        backgroundColor: 'inherit !important',
                                                        transform: 'none !important'
                                                    },
                                                    '&:active': {
                                                        backgroundColor: 'inherit !important',
                                                        transform: 'none !important'
                                                    },
                                                    '& .MuiAccordionSummary-content': {
                                                        transition: 'none !important',
                                                        '&:hover': {
                                                            transform: 'none !important'
                                                        }
                                                    }
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                                                    {getTaskStatusIcon(task.status)}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ fontSize: { xs: 15, sm: 18 } }}>
                                                                {task.title}
                                                            </Typography>
                                                            <Chip
                                                                label={getTaskStatusText(task.status)}
                                                                color={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'info' : 'warning'}
                                                                size="small"
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <React.Fragment>
                                                            <span style={{ display: 'block', marginBottom: 4, color: 'rgba(255, 255, 255, 0.8)', fontSize: isMobile ? 12 : 14 }}>
                                                                {task.description}
                                                            </span>
                                                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: isMobile ? 12 : 14 }}>
                                                                Назначено: {task.assignedAt?.toLocaleString('ru-RU')}
                                                            </span>
                                                        </React.Fragment>
                                                    }
                                                />
                                            </AccordionSummary>
                                            <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                                                <List>
                                                    {task.objects.map((obj, idx) => (
                                                        <React.Fragment key={obj.id}>
                                                            <ListItem sx={{ px: { xs: 1, sm: 2 } }}>
                                                                <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>{getTaskStatusIcon(obj.status)}</ListItemIcon>
                                                                <ListItemText
                                                                    primary={<Typography sx={{ fontSize: { xs: 14, sm: 16 } }}>{obj.name}</Typography>}
                                                                    secondary={<Typography sx={{ fontSize: { xs: 12, sm: 14 } }}>{obj.address}</Typography>}
                                                                />
                                                            </ListItem>
                                                            {idx < task.objects.length - 1 && <Divider />}
                                                        </React.Fragment>
                                                    ))}
                                                </List>
                                                {task.status === 'pending' && (
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        size={isMobile ? 'small' : 'medium'}
                                                        sx={{
                                                            mt: 1,
                                                            fontSize: { xs: 13, sm: 16 },
                                                            color: 'white',
                                                            backgroundColor: '#1976d2',
                                                            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                                                            '&:hover': {
                                                                backgroundColor: '#1565c0',
                                                                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                                                                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)'
                                                            }
                                                        }}
                                                        onClick={async () => {
                                                            try {
                                                                setAcceptingTask(task.id);
                                                                await acceptTaskService(task.id);
                                                                setTabValue(1); // Переключаемся на вкладку "В работе"
                                                            } catch (error) {
                                                                console.error('Ошибка принятия задания:', error);
                                                            } finally {
                                                                setAcceptingTask(null);
                                                            }
                                                        }}
                                                        disabled={acceptingTask === task.id}
                                                    >
                                                        {acceptingTask === task.id ? 'Принимается...' : 'Принять задание'}
                                                    </Button>
                                                )}
                                            </AccordionDetails>
                                        </Accordion>
                                    ))}
                                </List>
                            )}
                            {tabValue === 1 && (
                                <>
                                    {tabs[1].tasks.length === 0 ? (
                                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} align="center">
                                            Нет заданий в работе
                                        </Typography>
                                    ) : null}
                                </>
                            )}
                        </>
                    )}
                </Box>
            </Card>
            {tabValue === 1 && tabs[1].tasks.length > 0 && (
                <List sx={{ width: '100%', maxWidth: 900, mx: 'auto', mt: 2 }}>
                    {tabs[1].tasks.map(task => (
                        <Accordion
                            key={task.id}
                            expanded={expanded === task.id}
                            onChange={handleAccordionChange(task.id)}
                            sx={{
                                mb: 1,
                                borderRadius: { xs: 1, sm: 2 },
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.02)',
                                transition: 'none !important',
                                '&:hover': {
                                    transform: 'none !important',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    background: 'rgba(255, 255, 255, 0.03)'
                                },
                                '&:active': {
                                    transform: 'none !important',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.02)'
                                }
                            }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{
                                    minHeight: { xs: 40, sm: 56 },
                                    transition: 'none !important',
                                    '&:hover': {
                                        backgroundColor: 'inherit !important',
                                        transform: 'none !important'
                                    },
                                    '&:active': {
                                        backgroundColor: 'inherit !important',
                                        transform: 'none !important'
                                    },
                                    '& .MuiAccordionSummary-content': {
                                        transition: 'none !important',
                                        '&:hover': {
                                            transform: 'none !important'
                                        }
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                                    {getTaskStatusIcon(task.status)}
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ fontSize: { xs: 15, sm: 18 } }}>{task.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">{task.description}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        Назначено: {task.assignedAt?.toLocaleString('ru-RU')}
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: { xs: 0.25, sm: 0.5 } }}>
                                <InspectorTaskDetail id={task.id} minimal onComplete={handleTaskComplete} />
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </List>
            )}
            <TabPanel value={tabValue} index={2}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', mt: 2 }}>
                    <TextField
                        label="С"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={filterStartDate}
                        onChange={e => setFilterStartDate(e.target.value)}
                        sx={{
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.8)'
                            },
                            '& .MuiInputBase-input': {
                                color: 'white'
                            },
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)'
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.5)'
                                }
                            }
                        }}
                    />
                    <TextField
                        label="По"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={filterEndDate}
                        onChange={e => setFilterEndDate(e.target.value)}
                        sx={{
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.8)'
                            },
                            '& .MuiInputBase-input': {
                                color: 'white'
                            },
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)'
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.5)'
                                }
                            }
                        }}
                    />
                </Box>
                {completedTasks.length === 0 ? (
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} align="center">
                        Нет выполненных заданий
                    </Typography>
                ) : (
                    <List sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
                        {completedTasks.map(task => (
                            <Accordion
                                key={task.id}
                                expanded={expanded === task.id}
                                onChange={handleAccordionChange(task.id)}
                                sx={{ mb: 1, borderRadius: { xs: 1, sm: 2 }, boxShadow: 0, border: '1px solid #eee' }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: { xs: 40, sm: 56 } }}>
                                    <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                                        {getTaskStatusIcon('completed')}
                                    </ListItemIcon>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ fontSize: { xs: 15, sm: 18 } }}>{task.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">{task.description}</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Назначено: {task.assignedAt?.toLocaleString('ru-RU')}
                                        </Typography>
                                        {task.completedAt && (
                                            <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                                                Завершено: {task.completedAt.toLocaleString('ru-RU')}
                                            </Typography>
                                        )}
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                                    <List>
                                        {task.objects.filter(obj => obj.status === 'checked').map((obj, idx) => (
                                            <React.Fragment key={obj.id}>
                                                <ListItem sx={{ px: { xs: 1, sm: 2 } }}>
                                                    <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>{getTaskStatusIcon(obj.status)}</ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography sx={{ fontSize: { xs: 14, sm: 16 } }}>{obj.name}</Typography>
                                                                <Chip label="Проверен" color="success" size="small" />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <React.Fragment>
                                                                <span style={{ display: 'block', color: '#666', fontSize: isMobile ? 12 : 14 }}>{obj.address}</span>
                                                                {obj.checkedAt && !isNaN(new Date(obj.checkedAt).getTime()) && (
                                                                    <span style={{ display: 'block', color: '#666', fontSize: isMobile ? 12 : 14 }}>
                                                                        Время проверки: {new Date(obj.checkedAt).toLocaleString('ru-RU')}
                                                                    </span>
                                                                )}
                                                                {obj.comments && (
                                                                    <span style={{ display: 'block', color: '#fff', backgroundColor: '#333', padding: '4px 8px', borderRadius: '4px', fontSize: isMobile ? 12 : 14 }}>
                                                                        Замечания: {obj.comments}
                                                                    </span>
                                                                )}
                                                            </React.Fragment>
                                                        }
                                                    />
                                                </ListItem>
                                                {idx < task.objects.filter(obj => obj.status === 'checked').length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </List>
                )}
            </TabPanel>
        </Box>
    );
};

export default InspectorTasks; 