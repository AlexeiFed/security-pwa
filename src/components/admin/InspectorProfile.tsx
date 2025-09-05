import React, { useState, useEffect } from 'react';
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
    Button,
    Alert,
    IconButton,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    ContentCopy as ContentCopyIcon,
    WhatsApp as WhatsAppIcon,
    Telegram as TelegramIcon,
    AccessTime as TimeIcon,
    LocationOn as LocationIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { getInspectorById, getInspectorCredentials, updateInspectorCredentials } from '../../services/auth';
import { getInspectorTasks } from '../../services/tasks';
import { Inspector } from '../../types';
import { colors } from '../../utils/colors';

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
            id={`inspector-tabpanel-${index}`}
            aria-labelledby={`inspector-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </Box>
    );
}

const InspectorProfile = () => {
    const { uid } = useParams<{ uid: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [inspector, setInspector] = useState<Inspector | null>(null);
    const [inspectorTasks, setInspectorTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);

    // Состояния для управления учетными данными
    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
    const [isEditingCredentials, setIsEditingCredentials] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [inspectorCredentials, setInspectorCredentials] = useState({
        email: '',
        password: ''
    });
    const [editedCredentials, setEditedCredentials] = useState({
        email: '',
        password: ''
    });
    const [loadingCredentials, setLoadingCredentials] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    // Состояния для фильтрации по дате
    const [dateFilter, setDateFilter] = useState<{
        startDate: string;
        endDate: string;
    }>({
        startDate: '',
        endDate: ''
    });

    // Состояния для раскрывающихся объектов
    const [expandedObjects, setExpandedObjects] = useState<{ [taskId: string]: boolean }>({});

    useEffect(() => {
        if (uid) {
            loadInspector();
        }
    }, [uid]);

    const loadInspector = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!uid) return;

            const data = await getInspectorById(uid);
            if (data) {
                setInspector(data);
                // Загружаем учетные данные
                await loadInspectorCredentials(data);
                // Загружаем задания инспектора
                await loadInspectorTasks(uid);
            } else {
                setError('Инспектор не найден');
            }
        } catch (error) {
            console.error('Ошибка загрузки инспектора:', error);
            setError('Ошибка загрузки данных инспектора');
        } finally {
            setLoading(false);
        }
    };

    const loadInspectorTasks = async (inspectorId: string) => {
        try {
            const tasks = await getInspectorTasks(inspectorId);
            setInspectorTasks(tasks);
        } catch (error) {
            console.error('Ошибка загрузки заданий инспектора:', error);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'working': return 'success';
            case 'vacation': return 'warning';
            case 'sick': return 'error';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'working': return 'Работает';
            case 'vacation': return 'Отпуск';
            case 'sick': return 'Болен';
            default: return status;
        }
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
            case 'completed': return 'Выполнено';
            case 'in_progress': return 'В работе';
            case 'pending': return 'Ожидает';
            default: return status;
        }
    };

    const getTaskStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'in_progress': return 'primary';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    // Функции для работы с учетными данными
    const loadInspectorCredentials = async (inspectorData: Inspector) => {
        try {
            setLoadingCredentials(true);
            const credentials = await getInspectorCredentials(inspectorData.uid);
            if (credentials) {
                setInspectorCredentials({
                    email: credentials.email || inspectorData.email,
                    password: credentials.password || ''
                });
                setEditedCredentials({
                    email: credentials.email || inspectorData.email,
                    password: credentials.password || ''
                });
            } else {
                setInspectorCredentials({
                    email: inspectorData.email,
                    password: '••••••••'
                });
                setEditedCredentials({
                    email: inspectorData.email,
                    password: ''
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки учетных данных:', error);
            setInspectorCredentials({
                email: inspectorData.email,
                password: '••••••••'
            });
            setEditedCredentials({
                email: inspectorData.email,
                password: ''
            });
        } finally {
            setLoadingCredentials(false);
        }
    };

    const handleEditCredentials = () => {
        setIsEditingCredentials(true);
    };

    const handleSaveCredentials = async () => {
        try {
            setLoadingCredentials(true);
            if (inspector) {
                await updateInspectorCredentials(inspector.uid, editedCredentials);
                setInspectorCredentials({
                    email: editedCredentials.email,
                    password: editedCredentials.password
                });
                setIsEditingCredentials(false);
                showSnackbar('Учетные данные обновлены', 'success');
            }
        } catch (error) {
            console.error('Ошибка сохранения учетных данных:', error);
            showSnackbar('Ошибка сохранения учетных данных', 'error');
        } finally {
            setLoadingCredentials(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedCredentials({
            email: inspectorCredentials.email,
            password: ''
        });
        setIsEditingCredentials(false);
        setShowPassword(false);
    };

    const generatePassword = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleGeneratePassword = () => {
        const newPassword = generatePassword();
        setEditedCredentials(prev => ({ ...prev, password: newPassword }));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar('Скопировано в буфер обмена', 'success');
    };

    const handleSendViaWhatsApp = () => {
        const message = `🔐 Учетные данные для входа в систему:\n\n👤 Инспектор: ${inspector?.name}\n📧 Email: ${inspectorCredentials.email}\n🔑 Пароль: ${inspectorCredentials.password}\n\n🌐 Ссылка для входа: ${window.location.origin}`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    const handleSendViaTelegram = () => {
        const message = `🔐 Учетные данные для входа в систему:\n\n👤 Инспектор: ${inspector?.name}\n📧 Email: ${inspectorCredentials.email}\n🔑 Пароль: ${inspectorCredentials.password}\n\n🌐 Ссылка для входа: ${window.location.origin}`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodedMessage}`, '_blank');
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    // Функции для фильтрации заданий
    const filterTasksByDate = (tasks: any[]) => {
        if (!dateFilter.startDate && !dateFilter.endDate) {
            return tasks;
        }

        return tasks.filter(task => {
            const taskDate = task.createdAt || task.assignedAt || new Date();
            const taskDateObj = new Date(taskDate);

            if (dateFilter.startDate && dateFilter.endDate) {
                const startDate = new Date(dateFilter.startDate);
                const endDate = new Date(dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999); // Включаем весь день
                return taskDateObj >= startDate && taskDateObj <= endDate;
            } else if (dateFilter.startDate) {
                const startDate = new Date(dateFilter.startDate);
                return taskDateObj >= startDate;
            } else if (dateFilter.endDate) {
                const endDate = new Date(dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999);
                return taskDateObj <= endDate;
            }

            return true;
        });
    };

    const handleDateFilterChange = (field: 'startDate' | 'endDate', value: string) => {
        setDateFilter(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const clearDateFilter = () => {
        setDateFilter({
            startDate: '',
            endDate: ''
        });
    };

    const toggleObjectsExpansion = (taskId: string) => {
        setExpandedObjects(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    };

    // Фильтрованные задания
    const allTasks = inspectorTasks || [];
    const filteredTasks = filterTasksByDate(allTasks);
    const currentTasks = filteredTasks.filter(task => task.status !== 'completed');
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Загрузка профиля инспектора...</Typography>
            </Box>
        );
    }

    if (error || !inspector) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error || 'Инспектор не найден'}
                </Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/admin/inspectors')}
                >
                    Вернуться к списку
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{
            p: 3,
            pt: isMobile ? 10 : { xs: 12, sm: 16 }
        }}>
            {/* Заголовок страницы */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 3 }}>
                <IconButton
                    onClick={() => navigate('/admin/inspectors')}
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
                <Typography
                    variant={isMobile ? "h5" : "h4"}
                    component="h1"
                    sx={{
                        color: colors.text.primary,
                        fontWeight: 600,
                        fontSize: isMobile ? '1.25rem' : undefined
                    }}
                >
                    Профиль инспектора
                </Typography>
            </Box>

            {/* Информация об инспекторе */}
            <Box sx={{ mb: 3, p: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box>
                    <Typography variant="h5" component="h2" sx={{ color: '#fff', fontWeight: 700 }}>
                        {inspector.name}
                    </Typography>
                    {inspector.createdAt && (
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, mt: 0.5 }}>
                            Профиль создан: {inspector.createdAt.toLocaleDateString('ru-RU')}
                        </Typography>
                    )}
                </Box>
                <Chip
                    label={getStatusText(inspector.status)}
                    color={getStatusColor(inspector.status) as any}
                    sx={{ ml: 'auto' }}
                />
            </Box>

            {/* Секция учетных данных */}
            <Box sx={{ mt: 2, p: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                        Учетные данные
                    </Typography>
                    {!isEditingCredentials && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            sx={{
                                color: '#D4AF37',
                                borderColor: '#D4AF37',
                                '&:hover': {
                                    borderColor: '#FFD700',
                                    color: '#FFD700'
                                }
                            }}
                            onClick={handleEditCredentials}
                        >
                            Изменить
                        </Button>
                    )}
                </Box>

                {isEditingCredentials ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Email"
                            value={editedCredentials.email}
                            onChange={(e) => setEditedCredentials(prev => ({ ...prev, email: e.target.value }))}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                                },
                                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                '& .MuiInputBase-input': { color: '#fff' },
                            }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                fullWidth
                                label="Пароль"
                                type={showPassword ? 'text' : 'password'}
                                value={editedCredentials.password}
                                onChange={(e) => setEditedCredentials(prev => ({ ...prev, password: e.target.value }))}
                                InputProps={{
                                    endAdornment: (
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                        >
                                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                        '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                                    },
                                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                    '& .MuiInputBase-input': { color: '#fff' },
                                }}
                            />
                            <Button
                                variant="outlined"
                                onClick={handleGeneratePassword}
                                sx={{
                                    color: '#D4AF37',
                                    borderColor: '#D4AF37',
                                    minWidth: 'auto',
                                    px: 2,
                                    '&:hover': {
                                        borderColor: '#FFD700',
                                        color: '#FFD700'
                                    }
                                }}
                            >
                                Сгенерировать
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSaveCredentials}
                                disabled={loadingCredentials}
                                sx={{
                                    backgroundColor: '#4caf50',
                                    '&:hover': { backgroundColor: '#45a049' }
                                }}
                            >
                                {loadingCredentials ? <CircularProgress size={20} /> : 'Сохранить'}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                onClick={handleCancelEdit}
                                disabled={loadingCredentials}
                                sx={{
                                    color: '#ff6b6b',
                                    borderColor: '#ff6b6b',
                                    '&:hover': {
                                        borderColor: '#ff5252',
                                        color: '#ff5252'
                                    }
                                }}
                            >
                                Отмена
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {loadingCredentials ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                                <CircularProgress size={20} sx={{ color: '#D4AF37' }} />
                                <Typography variant="body2" sx={{ color: '#ccc' }}>
                                    Загрузка учетных данных...
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body1" sx={{ color: '#ccc', minWidth: 80 }}>
                                        Email:
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500 }}>
                                        {inspectorCredentials.email || 'Не указан'}
                                    </Typography>
                                    {inspectorCredentials.email && (
                                        <IconButton
                                            size="small"
                                            onClick={() => copyToClipboard(inspectorCredentials.email)}
                                            sx={{ color: '#D4AF37' }}
                                        >
                                            <ContentCopyIcon />
                                        </IconButton>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body1" sx={{ color: '#ccc', minWidth: 80 }}>
                                        Пароль:
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500, wordBreak: 'break-all' }}>
                                        {inspectorCredentials.password}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => copyToClipboard(inspectorCredentials.password)}
                                        sx={{ color: '#D4AF37' }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Box>
                            </>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            {isMobile ? (
                                <>
                                    <IconButton
                                        onClick={handleSendViaWhatsApp}
                                        sx={{
                                            backgroundColor: '#25D366',
                                            color: '#fff',
                                            '&:hover': { backgroundColor: '#128C7E' }
                                        }}
                                    >
                                        <WhatsAppIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={handleSendViaTelegram}
                                        sx={{
                                            backgroundColor: '#0088cc',
                                            color: '#fff',
                                            '&:hover': { backgroundColor: '#006699' }
                                        }}
                                    >
                                        <TelegramIcon />
                                    </IconButton>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="contained"
                                        startIcon={<WhatsAppIcon />}
                                        onClick={handleSendViaWhatsApp}
                                        sx={{
                                            backgroundColor: '#25D366',
                                            '&:hover': { backgroundColor: '#128C7E' }
                                        }}
                                    >
                                        Отправить в WhatsApp
                                    </Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<TelegramIcon />}
                                        onClick={handleSendViaTelegram}
                                        sx={{
                                            backgroundColor: '#0088cc',
                                            '&:hover': { backgroundColor: '#006699' }
                                        }}
                                    >
                                        Отправить в Telegram
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Вкладки с заданиями */}
            <Box sx={{ mt: 4, p: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2 }}>
                {/* Фильтр по дате */}
                <Box sx={{ mb: 3, pb: 2, borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            label="Дата с"
                            type="date"
                            value={dateFilter.startDate}
                            onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                minWidth: 150,
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                                },
                                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                '& .MuiInputBase-input': { color: '#fff' },
                            }}
                        />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            по
                        </Typography>
                        <TextField
                            label="Дата по"
                            type="date"
                            value={dateFilter.endDate}
                            onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                minWidth: 150,
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                                },
                                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                '& .MuiInputBase-input': { color: '#fff' },
                            }}
                        />
                        <Button
                            variant="outlined"
                            onClick={clearDateFilter}
                            sx={{
                                color: '#D4AF37',
                                borderColor: '#D4AF37',
                                '&:hover': {
                                    borderColor: '#FFD700',
                                    color: '#FFD700'
                                }
                            }}
                        >
                            Сбросить фильтр
                        </Button>
                        {(dateFilter.startDate || dateFilter.endDate) && (
                            <Chip
                                label={`Найдено: ${filteredTasks.length} заданий`}
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Box>

                <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        sx={{
                            '& .MuiTab-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: isMobile ? '0.8rem' : undefined,
                                minHeight: isMobile ? 40 : undefined,
                                padding: isMobile ? '6px 12px' : undefined,
                                '&.Mui-selected': {
                                    color: '#D4AF37'
                                }
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#D4AF37'
                            }
                        }}
                    >
                        <Tab
                            label={isMobile ? `Текущие (${currentTasks.length})` : `Текущие задания (${currentTasks.length})`}
                            id="inspector-tab-0"
                            aria-controls="inspector-tabpanel-0"
                        />
                        <Tab
                            label={isMobile ? `Выполненные (${completedTasks.length})` : `Выполненные задания (${completedTasks.length})`}
                            id="inspector-tab-1"
                            aria-controls="inspector-tabpanel-1"
                        />
                    </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                    {currentTasks.length === 0 ? (
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
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
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        p: isMobile ? 1 : 2
                                    }}>
                                        {/* Статус только для десктопа */}
                                        {!isMobile && task.status === 'completed' && (
                                            <Chip
                                                label="Выполнено"
                                                color="success"
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    fontWeight: 600,
                                                    fontSize: '0.7rem',
                                                    '& .MuiChip-label': {
                                                        color: '#ffffff'
                                                    }
                                                }}
                                            />
                                        )}
                                        {/* Иконка статуса только для десктопа */}
                                        {!isMobile && (
                                            <ListItemIcon>
                                                {getTaskStatusIcon(task.status)}
                                            </ListItemIcon>
                                        )}
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography
                                                        variant={isMobile ? "body1" : "h6"}
                                                        sx={{
                                                            color: '#ffffff',
                                                            fontSize: isMobile ? '0.9rem' : undefined,
                                                            fontWeight: isMobile ? 500 : 600
                                                        }}
                                                    >
                                                        {task.title}
                                                    </Typography>
                                                    {/* Статус только для десктопа */}
                                                    {!isMobile && (
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
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                                                        {task.description}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <TimeIcon fontSize="small" sx={{ color: '#ffffff' }} />
                                                            <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                                                Назначено: {task.assignedAt?.toLocaleString('ru-RU') || 'Не указано'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    {task.acceptedAt && (
                                                        <Typography
                                                            variant="body2"
                                                            color="success.main"
                                                            sx={{
                                                                fontSize: isMobile ? '0.7rem' : undefined
                                                            }}
                                                        >
                                                            ✅ Принято к выполнению: {task.acceptedAt.toLocaleString('ru-RU')}
                                                        </Typography>
                                                    )}
                                                    {task.objects && task.objects.length > 0 && (
                                                        <Box sx={{ mt: 2 }}>
                                                            <Typography
                                                                variant="subtitle2"
                                                                sx={{
                                                                    color: '#D4AF37',
                                                                    display: 'block',
                                                                    mb: 1,
                                                                    cursor: 'pointer',
                                                                    fontWeight: 500
                                                                }}
                                                                onClick={() => toggleObjectsExpansion(task.id)}
                                                            >
                                                                🏢 Объекты для проверки ({task.objects.length})
                                                            </Typography>
                                                            {expandedObjects[task.id] && (
                                                                <List dense>
                                                                    {task.objects.map((obj: any, objIndex: number) => {
                                                                        const checkedDate = obj.checkedAt instanceof Date && !isNaN(obj.checkedAt.getTime())
                                                                            ? obj.checkedAt
                                                                            : (typeof obj.checkedAt === 'string' ? new Date(obj.checkedAt) : null);
                                                                        const isValidChecked = checkedDate instanceof Date && !isNaN(checkedDate.getTime());
                                                                        return (
                                                                            <ListItem key={objIndex} sx={{
                                                                                alignItems: 'flex-start',
                                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                                borderRadius: 1,
                                                                                mb: 1,
                                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                                p: isMobile ? 1 : 2
                                                                            }}>
                                                                                {!isMobile && (
                                                                                    <ListItemIcon>
                                                                                        <LocationIcon fontSize="small" sx={{ color: '#ffffff' }} />
                                                                                    </ListItemIcon>
                                                                                )}
                                                                                <Box sx={{ width: '100%' }}>
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                        <Typography component="span" sx={{
                                                                                            fontWeight: 500,
                                                                                            color: '#ffffff',
                                                                                            fontSize: isMobile ? '0.875rem' : undefined
                                                                                        }}>
                                                                                            {obj.name || obj.address}
                                                                                        </Typography>
                                                                                        {!isMobile && (
                                                                                            obj.status === 'checked' ? (
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
                                                                                            )
                                                                                        )}
                                                                                    </Box>
                                                                                    <Typography variant="body2" component="span" sx={{
                                                                                        color: 'rgba(255, 255, 255, 0.8)',
                                                                                        fontSize: isMobile ? '0.75rem' : undefined
                                                                                    }}>
                                                                                        {obj.address}
                                                                                    </Typography>
                                                                                    {obj.status === 'checked' && isValidChecked && (
                                                                                        <Typography variant="body2" color="success.main" component="span" sx={{
                                                                                            display: 'block',
                                                                                            mt: 0.5,
                                                                                            fontSize: isMobile ? '0.7rem' : undefined
                                                                                        }}>
                                                                                            ✅ Проверен: {checkedDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                        </Typography>
                                                                                    )}
                                                                                    {obj.comments && (
                                                                                        <Typography variant="body2" component="span" sx={{
                                                                                            display: 'block',
                                                                                            mt: 0.5,
                                                                                            fontStyle: 'italic',
                                                                                            color: 'rgba(255, 255, 255, 0.7)',
                                                                                            fontSize: isMobile ? '0.7rem' : undefined
                                                                                        }}>
                                                                                            Замечания: {obj.comments}
                                                                                        </Typography>
                                                                                    )}
                                                                                </Box>
                                                                            </ListItem>
                                                                        );
                                                                    })}
                                                                </List>
                                                            )}
                                                        </Box>
                                                    )}
                                                    {task.location && (
                                                        <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                                                            📍 {task.location.address}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < currentTasks.length - 1 && <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    {completedTasks.length === 0 ? (
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
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
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        p: isMobile ? 1 : 2
                                    }}>
                                        {!isMobile && (
                                            <ListItemIcon>
                                                {getTaskStatusIcon(task.status)}
                                            </ListItemIcon>
                                        )}
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography
                                                        variant={isMobile ? "body1" : "h6"}
                                                        sx={{
                                                            color: '#ffffff',
                                                            fontSize: isMobile ? '0.9rem' : undefined,
                                                            fontWeight: isMobile ? 500 : 600
                                                        }}
                                                    >
                                                        {task.title}
                                                    </Typography>
                                                    {!isMobile && (
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
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                                                        {task.description}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <TimeIcon fontSize="small" sx={{ color: '#ffffff' }} />
                                                            <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                                                Назначено: {task.assignedAt?.toLocaleString('ru-RU') || 'Не указано'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    {task.acceptedAt && (
                                                        <Typography variant="body2" color="success.main">
                                                            ✅ Принято к выполнению: {task.acceptedAt.toLocaleString('ru-RU')}
                                                        </Typography>
                                                    )}
                                                    {task.completedAt && (
                                                        <Typography variant="body2" color="success.main">
                                                            ✅ Выполнено: {task.completedAt.toLocaleString('ru-RU')}
                                                        </Typography>
                                                    )}
                                                    {task.objects && task.objects.length > 0 && (
                                                        <Box sx={{ mt: 2 }}>
                                                            <Typography
                                                                variant="subtitle2"
                                                                sx={{
                                                                    color: '#D4AF37',
                                                                    display: 'block',
                                                                    mb: 1,
                                                                    cursor: 'pointer',
                                                                    fontWeight: 500
                                                                }}
                                                                onClick={() => toggleObjectsExpansion(task.id)}
                                                            >
                                                                🏢 Объекты для проверки ({task.objects.length})
                                                            </Typography>
                                                            {expandedObjects[task.id] && (
                                                                <List dense>
                                                                    {task.objects.map((obj: any, objIndex: number) => {
                                                                        const checkedDate = obj.checkedAt instanceof Date && !isNaN(obj.checkedAt.getTime())
                                                                            ? obj.checkedAt
                                                                            : (typeof obj.checkedAt === 'string' ? new Date(obj.checkedAt) : null);
                                                                        const isValidChecked = checkedDate instanceof Date && !isNaN(checkedDate.getTime());
                                                                        return (
                                                                            <ListItem key={objIndex} sx={{
                                                                                alignItems: 'flex-start',
                                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                                borderRadius: 1,
                                                                                mb: 1,
                                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                                p: isMobile ? 1 : 2
                                                                            }}>
                                                                                {!isMobile && (
                                                                                    <ListItemIcon>
                                                                                        <LocationIcon fontSize="small" sx={{ color: '#ffffff' }} />
                                                                                    </ListItemIcon>
                                                                                )}
                                                                                <Box sx={{ width: '100%' }}>
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                        <Typography component="span" sx={{
                                                                                            fontWeight: 500,
                                                                                            color: '#ffffff',
                                                                                            fontSize: isMobile ? '0.875rem' : undefined
                                                                                        }}>
                                                                                            {obj.name || obj.address}
                                                                                        </Typography>
                                                                                        {!isMobile && (
                                                                                            obj.status === 'checked' ? (
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
                                                                                            )
                                                                                        )}
                                                                                    </Box>
                                                                                    <Typography variant="body2" component="span" sx={{
                                                                                        color: 'rgba(255, 255, 255, 0.8)',
                                                                                        fontSize: isMobile ? '0.75rem' : undefined
                                                                                    }}>
                                                                                        {obj.address}
                                                                                    </Typography>
                                                                                    {obj.status === 'checked' && isValidChecked && (
                                                                                        <Typography variant="body2" color="success.main" component="span" sx={{
                                                                                            display: 'block',
                                                                                            mt: 0.5,
                                                                                            fontSize: isMobile ? '0.7rem' : undefined
                                                                                        }}>
                                                                                            ✅ Проверен: {checkedDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                        </Typography>
                                                                                    )}
                                                                                    {obj.comments && (
                                                                                        <Typography variant="body2" component="span" sx={{
                                                                                            display: 'block',
                                                                                            mt: 0.5,
                                                                                            fontStyle: 'italic',
                                                                                            color: 'rgba(255, 255, 255, 0.7)',
                                                                                            fontSize: isMobile ? '0.7rem' : undefined
                                                                                        }}>
                                                                                            Замечания: {obj.comments}
                                                                                        </Typography>
                                                                                    )}
                                                                                </Box>
                                                                            </ListItem>
                                                                        );
                                                                    })}
                                                                </List>
                                                            )}
                                                        </Box>
                                                    )}
                                                    {task.location && (
                                                        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                                                            📍 {task.location.address}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < completedTasks.length - 1 && <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </TabPanel>
            </Box>

            {/* Snackbar для уведомлений */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    sx={{
                        '& .MuiAlert-message': {
                            color: '#000'
                        }
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box >
    );
};

export default InspectorProfile; 