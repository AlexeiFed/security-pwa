/**
 * @file: CuratorManagement.tsx
 * @description: Компонент для управления кураторами администратором
 * @dependencies: react, material-ui, auth service, objects service
 * @created: 2025-06-27
 */

import React, { useState, useEffect } from 'react';
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
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Alert,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    CircularProgress,
    Fab,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    Person as PersonIcon,
    Security as SecurityIcon,
    ContentCopy as ContentCopyIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import Tooltip from '@mui/material/Tooltip';
import { useNavigate } from 'react-router-dom';
import { Curator, ObjectData, CreateCuratorForm } from '../../types';
import { getCurators, authService, deleteCurator, updateCuratorObjects, updateCuratorStatus, updateCuratorCredentials } from '../../services/auth';
import { getObjects } from '../../services/objects';
import AdminMobileHeader from '../common/AdminMobileHeader';
import { cacheManager } from '../../services/cache';
import { colors } from '../../utils/colors';

const CuratorManagement = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [curators, setCurators] = useState<Curator[]>([]);
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCurator, setSelectedCurator] = useState<Curator | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const [newCurator, setNewCurator] = useState<CreateCuratorForm>({
        firstName: '',
        lastName: '',
        email: '@vityaz.com',
        phone: '',
        assignedObjects: []
    });

    const [editCurator, setEditCurator] = useState<CreateCuratorForm>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        assignedObjects: []
    });

    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string }>({ email: '', password: '' });
    const [creating, setCreating] = useState(false);
    const [deletingCurator, setDeletingCurator] = useState<string | null>(null);

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusCurator, setStatusCurator] = useState<Curator | null>(null);
    const [newStatus, setNewStatus] = useState('working');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Стили для TextField в темной теме
    const textFieldStyles = {
        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#1976d2' },
        '& .MuiOutlinedInput-root': {
            color: '#fff',
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#1976d2' }
        }
    };

    // Функция транслитерации русских символов в латиницу
    const transliterate = (text: string): string => {
        const transliterationMap: { [key: string]: string } = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
            'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
            'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
            'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
            'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
        };

        return text.split('').map(char => transliterationMap[char] || char).join('').toLowerCase();
    };

    // Обработчик изменения фамилии с автозаполнением email
    const handleLastNameChange = (lastName: string) => {
        const transliteratedLastName = transliterate(lastName);
        setNewCurator(prev => ({
            ...prev,
            lastName,
            email: transliteratedLastName ? `${transliteratedLastName}@vityaz.com` : '@vityaz.com'
        }));
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            console.log('🔄 Загрузка данных кураторов с кэшированием...');

            const [curatorsData, objectsData] = await Promise.all([
                cacheManager.getCurators(),
                cacheManager.getObjects()
            ]);

            setCurators(curatorsData);
            setObjects(objectsData);

            console.log('✅ Данные кураторов загружены из кэша:', {
                curators: curatorsData.length,
                objects: objectsData.length
            });
        } catch (err) {
            console.error('❌ Ошибка загрузки данных:', err);
            setError('Ошибка при загрузке данных');
            showSnackbar('Ошибка при загрузке данных', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCurator = async () => {
        try {
            if (!newCurator.firstName || !newCurator.lastName || !newCurator.email || !newCurator.phone) {
                showSnackbar('Заполните все обязательные поля', 'error');
                return;
            }
            setCreating(true);
            const password = generatePassword();
            const name = `${newCurator.firstName} ${newCurator.lastName}`;

            // Создаем пользователя в Firebase Auth без входа в систему
            const user = await authService.createUserWithoutLogin(newCurator.email, password, 'curator', name, newCurator.phone);

            // Сохраняем пароль в Firestore для возможности его просмотра/изменения
            if (user.uid) {
                await updateCuratorCredentials(user.uid, newCurator.email, password);
            }

            setCreatedCredentials({ email: newCurator.email, password });
            setCredentialsDialogOpen(true);

            // Обновляем кэш и список кураторов
            cacheManager.clearCache('curators');
            await loadData();

            setAddDialogOpen(false);
            setNewCurator({
                firstName: '',
                lastName: '',
                email: '@vityaz.com',
                phone: '',
                assignedObjects: []
            });
        } catch (err) {
            console.error('Ошибка создания куратора:', err);
            showSnackbar('Ошибка при создании куратора', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleEditCurator = async () => {
        if (!selectedCurator) return;

        try {
            await updateCuratorObjects(selectedCurator.uid, editCurator.assignedObjects);

            // Обновляем кэш и список кураторов
            cacheManager.clearCache('curators');
            await loadData();
            setEditDialogOpen(false);
            setSelectedCurator(null);

            showSnackbar('Объекты куратора обновлены', 'success');
        } catch (err) {
            console.error('Ошибка обновления куратора:', err);
            showSnackbar('Ошибка при обновлении куратора', 'error');
        }
    };

    const handleDeleteCurator = async () => {
        if (!selectedCurator) return;

        try {
            setDeletingCurator(selectedCurator.uid);

            // Отправляем push-уведомление о принудительном выходе
            try {
                const { sendForceLogoutNotification } = await import('../../services/notifications');
                await sendForceLogoutNotification(selectedCurator.uid, 'Ваш аккаунт был удален администратором');
            } catch (notificationError) {
                console.warn('Не удалось отправить уведомление о выходе:', notificationError);
            }

            // Удаляем куратора
            await deleteCurator(selectedCurator.uid);

            // Принудительно очищаем кэш и перезагружаем список
            cacheManager.clearCache('curators');
            await loadData();
            setDeleteDialogOpen(false);
            setSelectedCurator(null);

            showSnackbar('Куратор удален', 'success');
        } catch (err) {
            console.error('Ошибка удаления куратора:', err);
            showSnackbar('Ошибка при удалении куратора', 'error');
        } finally {
            setDeletingCurator(null);
        }
    };

    const generatePassword = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'working': return 'success';
            case 'vacation': return 'warning';
            case 'sick': return 'error';
            case 'business': return 'info';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'working': return 'Работает';
            case 'vacation': return 'Отпуск';
            case 'sick': return 'Болен';
            case 'business': return 'Командировка';
            default: return status;
        }
    };

    const getCuratorObjects = (curator: Curator) => {
        return objects.filter(obj => curator.assignedObjects.includes(obj.id));
    };

    // Получение объектов, которые еще не имеют куратора
    const getAvailableObjects = (currentCuratorId?: string) => {
        // Получаем все объекты, которые уже назначены другим кураторам
        const assignedObjectIds = curators
            .filter(curator => curator.uid !== currentCuratorId) // Исключаем текущего куратора при редактировании
            .flatMap(curator => curator.assignedObjects);

        // Возвращаем объекты, которые не назначены ни одному куратору
        return objects.filter(obj => !assignedObjectIds.includes(obj.id));
    };

    // Фильтрация кураторов по поисковому запросу
    const filteredCurators = curators.filter(curator =>
        curator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        curator.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar('Скопировано', 'success');
    };

    const sendToWhatsApp = () => {
        const appUrl = `${window.location.origin}?email=${encodeURIComponent(createdCredentials.email)}&password=${encodeURIComponent(createdCredentials.password)}`;
        const message = `Добрый день! Ваши учетные данные для входа в систему безопасности ЧОО "ВИТЯЗЬ":\n\n👤 Логин: ${createdCredentials.email}\n🔐 Пароль: ${createdCredentials.password}\n\n🚀 Для быстрого входа используйте эту ссылку:\n${appUrl}\n\nС уважением, администрация ЧОО "ВИТЯЗЬ"`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    const sendToTelegram = () => {
        const appUrl = `${window.location.origin}?email=${encodeURIComponent(createdCredentials.email)}&password=${encodeURIComponent(createdCredentials.password)}`;
        const message = `Добрый день! Ваши учетные данные для входа в систему безопасности ЧОО "ВИТЯЗЬ":\n\n👤 Логин: ${createdCredentials.email}\n🔐 Пароль: ${createdCredentials.password}\n\n🚀 Для быстрого входа используйте эту ссылку:\n${appUrl}\n\nС уважением, администрация ЧОО "ВИТЯЗЬ"`;
        const encodedMessage = encodeURIComponent(message);
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodedMessage}`;
        window.open(telegramUrl, '_blank');
    };

    const handleCuratorClick = (curator: Curator) => {
        navigate(`/admin/curator/${curator.uid}`);
    };

    if (loading) {
        return (
            <Box sx={{
                p: 3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px'
            }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress
                        size={60}
                        sx={{
                            color: colors.secondary.main,
                            mb: 2,
                            '& .MuiCircularProgress-circle': {
                                strokeWidth: 4
                            }
                        }}
                    />
                    <Typography variant="h6" sx={{ color: colors.text.primary }}>
                        Загрузка кураторов...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)',
            pb: isMobile ? 8 : 3 // Отступ снизу для FAB кнопки на мобильных
        }}>
            {/* Шапка только на мобильных */}
            {isMobile && <AdminMobileHeader title="Управление кураторами" />}
            <Box sx={{
                p: 3,
                pt: isMobile ? 10 : 16,
                pb: isMobile ? 1 : 3
            }}>

                {/* Иконка назад и заголовок в одной строке */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: isMobile ? 2 : 3,
                    gap: 2
                }}>
                    <IconButton
                        onClick={() => navigate('/admin')}
                        sx={{
                            color: '#ffffff',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                transform: 'scale(1.1)',
                                boxShadow: '0 4px 12px rgba(255, 255, 255, 0.3)'
                            }
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>

                    <Typography
                        variant={isMobile ? "h5" : "h4"}
                        sx={{
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: isMobile ? '1.5rem' : undefined
                        }}
                    >
                        Управление кураторами
                    </Typography>
                </Box>

                {/* Поле поиска */}
                <Box sx={{ mb: 3 }}>
                    <TextField
                        fullWidth
                        placeholder="Поиск куратора по имени или email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            ...textFieldStyles,
                            '& .MuiOutlinedInput-root': {
                                ...textFieldStyles['& .MuiOutlinedInput-root'],
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: 2
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <Box sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                                    🔍
                                </Box>
                            )
                        }}
                    />
                </Box>

                {/* Кнопка добавления только для десктопа */}
                {!isMobile && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setAddDialogOpen(true)}
                            sx={{ backgroundColor: '#D4AF37', '&:hover': { backgroundColor: '#B8941F' } }}
                        >
                            Добавить куратора
                        </Button>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{
                    display: 'grid',
                    gap: isMobile ? 1.5 : 3,
                    gridTemplateColumns: isMobile
                        ? 'repeat(auto-fill, minmax(160px, 1fr))'
                        : 'repeat(auto-fill, minmax(250px, 1fr))'
                }}>
                    {filteredCurators.map((curator) => (
                        <Card
                            key={curator.uid}
                            sx={{
                                cursor: 'pointer',
                                background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                                border: '2px solid #D4AF37',
                                borderRadius: 3,
                                boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: isMobile ? 'translateY(-4px) scale(1.01)' : 'translateY(-8px) scale(1.02)',
                                    boxShadow: '0 16px 48px 0 rgba(212, 175, 55, 0.3)',
                                    borderColor: '#E5C158',
                                    '& .card-icon': {
                                        transform: 'scale(1.1)',
                                    }
                                }
                            }}
                            onClick={() => handleCuratorClick(curator)}
                        >
                            <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 1 : 2 }}>
                                    <PersonIcon sx={{
                                        mr: isMobile ? 0.5 : 1,
                                        color: '#ffffff',
                                        fontSize: isMobile ? '1.2rem' : undefined,
                                        transition: 'transform 0.3s ease',
                                        className: 'card-icon'
                                    }} />
                                    <Typography
                                        variant={isMobile ? "body2" : "h6"}
                                        component="div"
                                        sx={{
                                            color: '#ffffff',
                                            fontWeight: 600,
                                            fontSize: isMobile ? '0.9rem' : undefined
                                        }}
                                    >
                                        {curator.name}
                                    </Typography>
                                </Box>
                                <Typography
                                    sx={{
                                        mb: isMobile ? 0.5 : 1,
                                        textAlign: 'left',
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: isMobile ? '0.7rem' : undefined
                                    }}
                                >
                                    {curator.email}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: '#ffffff',
                                        mb: isMobile ? 1 : 2,
                                        textAlign: 'left',
                                        fontWeight: 500,
                                        fontSize: isMobile ? '0.65rem' : undefined
                                    }}
                                >
                                    Объектов — {(curator.assignedObjects && curator.assignedObjects.length) || 0}
                                </Typography>

                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    justifyContent: 'space-between',
                                    alignItems: isMobile ? 'flex-start' : 'center',
                                    gap: isMobile ? 1 : 0
                                }}>
                                    <Chip
                                        label={getStatusText(curator.status)}
                                        color={getStatusColor(curator.status) as any}
                                        size={isMobile ? "small" : "small"}
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: isMobile ? '0.7rem' : undefined,
                                            '& .MuiChip-label': {
                                                color: '#ffffff'
                                            }
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1 }}>
                                        <Tooltip title="Добавить объект" arrow>
                                            <IconButton
                                                size={isMobile ? "small" : "small"}
                                                sx={{
                                                    color: '#4CAF50',
                                                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setSelectedCurator(curator);
                                                    setEditCurator({
                                                        firstName: curator.name.split(' ')[0] || '',
                                                        lastName: curator.name.split(' ')[1] || '',
                                                        email: curator.email,
                                                        phone: curator.phone || '',
                                                        assignedObjects: curator.assignedObjects
                                                    });
                                                    setEditDialogOpen(true);
                                                }}
                                            >
                                                <AddIcon />
                                            </IconButton>
                                        </Tooltip>

                                        <Tooltip title="Изменить статус" arrow>
                                            <IconButton
                                                size={isMobile ? "small" : "small"}
                                                sx={{
                                                    color: '#2196F3',
                                                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setStatusCurator(curator);
                                                    setNewStatus(curator.status);
                                                    setStatusDialogOpen(true);
                                                }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Удалить куратора" arrow>
                                            <IconButton
                                                size={isMobile ? "small" : "small"}
                                                sx={{
                                                    color: '#F44336',
                                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setSelectedCurator(curator);
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                {filteredCurators.length === 0 && (
                    <Card sx={{
                        background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)',
                        border: '2px solid #D4AF37',
                        borderRadius: 3
                    }}>
                        <CardContent sx={{ textAlign: 'center', py: isMobile ? 3 : 4 }}>
                            <Typography
                                variant={isMobile ? "body1" : "h6"}
                                sx={{
                                    color: 'white',
                                    mb: 2,
                                    fontSize: isMobile ? '1.1rem' : undefined
                                }}
                            >
                                {searchQuery ? 'Кураторы не найдены по запросу' : 'Кураторы не найдены'}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#ccc',
                                    fontSize: isMobile ? '0.85rem' : undefined
                                }}
                            >
                                {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте первого куратора для управления объектами'}
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

            {/* FAB кнопка для мобильной версии */}
            {isMobile && (
                <Fab
                    color="primary"
                    aria-label="add curator"
                    onClick={() => setAddDialogOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        backgroundColor: '#D4AF37',
                        color: '#000000',
                        '&:hover': {
                            backgroundColor: '#B8941F'
                        },
                        zIndex: 1000,
                        '& .MuiSvgIcon-root': {
                            fontSize: '1.5rem'
                        }
                    }}
                >
                    <AddIcon />
                </Fab>
            )}

            {/* Диалог добавления куратора */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Добавить куратора</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Имя"
                        value={newCurator.firstName}
                        onChange={(e) => setNewCurator(prev => ({ ...prev, firstName: e.target.value }))}
                        margin="normal"
                        required
                        sx={textFieldStyles}
                    />
                    <TextField
                        fullWidth
                        label="Фамилия"
                        value={newCurator.lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        margin="normal"
                        required
                        sx={textFieldStyles}
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={newCurator.email}
                        onChange={(e) => setNewCurator(prev => ({ ...prev, email: e.target.value }))}
                        margin="normal"
                        required
                        sx={textFieldStyles}
                    />
                    <TextField
                        fullWidth
                        label="Номер телефона"
                        type="tel"
                        value={newCurator.phone}
                        onChange={(e) => setNewCurator(prev => ({ ...prev, phone: e.target.value }))}
                        margin="normal"
                        required
                        placeholder="+7 (999) 123-45-67"
                        sx={textFieldStyles}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setAddDialogOpen(false)}
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
                        onClick={handleAddCurator}
                        variant="contained"
                        disabled={creating}
                        sx={{
                            backgroundColor: '#4CAF50',
                            '&:hover': {
                                backgroundColor: '#45a049'
                            }
                        }}
                    >
                        {creating ? <><CircularProgress size={18} sx={{ mr: 1 }} />Создание...</> : 'Добавить'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог редактирования куратора */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Редактировать объекты куратора</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Выберите объекты для курирования:
                    </Typography>
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {(() => {
                            const availableObjects = getAvailableObjects(selectedCurator?.uid);
                            const currentAssignedObjects = objects.filter(obj =>
                                editCurator.assignedObjects.includes(obj.id)
                            );

                            // Создаем Set для избежания дублирования
                            const uniqueObjects = new Map();

                            // Добавляем доступные объекты
                            availableObjects.forEach(obj => {
                                uniqueObjects.set(obj.id, obj);
                            });

                            // Добавляем уже назначенные объекты
                            currentAssignedObjects.forEach(obj => {
                                uniqueObjects.set(obj.id, obj);
                            });

                            const allAvailableObjects = Array.from(uniqueObjects.values());

                            if (allAvailableObjects.length === 0) {
                                return (
                                    <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                                        Все объекты уже назначены кураторам
                                    </Typography>
                                );
                            }

                            return (
                                <List sx={{ width: '100%' }}>
                                    {allAvailableObjects.map((obj) => (
                                        <ListItem key={obj.id} sx={{ px: 0 }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={editCurator.assignedObjects.includes(obj.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setEditCurator(prev => ({
                                                                    ...prev,
                                                                    assignedObjects: [...prev.assignedObjects, obj.id]
                                                                }));
                                                            } else {
                                                                setEditCurator(prev => ({
                                                                    ...prev,
                                                                    assignedObjects: prev.assignedObjects.filter(id => id !== obj.id)
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                            {obj.name}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                            {obj.address}
                                                        </Typography>
                                                    </Box>
                                                }
                                                sx={{ width: '100%', m: 0 }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            );
                        })()}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setEditDialogOpen(false)}
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
                        onClick={handleEditCurator}
                        variant="contained"
                        sx={{
                            backgroundColor: '#2196F3',
                            '&:hover': {
                                backgroundColor: '#1976D2'
                            }
                        }}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог удаления куратора */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Удалить куратора</DialogTitle>
                <DialogContent>
                    <Typography>
                        Вы уверены, что хотите удалить куратора "{selectedCurator?.name}"?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{
                            color: '#2196F3',
                            '&:hover': {
                                backgroundColor: 'rgba(33, 150, 243, 0.1)'
                            }
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleDeleteCurator}
                        variant="contained"
                        sx={{
                            backgroundColor: '#F44336',
                            '&:hover': {
                                backgroundColor: '#D32F2F'
                            }
                        }}
                    >
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог учетных данных */}
            <Dialog open={credentialsDialogOpen} onClose={() => setCredentialsDialogOpen(false)}>
                <DialogTitle>Учетные данные созданы</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Сохраните эти данные для передачи куратору:
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Логин (Email):
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                value={createdCredentials.email}
                                InputProps={{
                                    readOnly: true,
                                    sx: { background: 'transparent', fontFamily: 'monospace', p: 1, borderRadius: 1 }
                                }}
                                variant="outlined"
                                fullWidth
                                sx={textFieldStyles}
                            />
                            <IconButton onClick={() => copyToClipboard(createdCredentials.email)}>
                                <ContentCopyIcon />
                            </IconButton>
                        </Box>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Пароль:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                value={createdCredentials.password}
                                sx={textFieldStyles}
                                InputProps={{
                                    readOnly: true,
                                    sx: { background: 'transparent', fontFamily: 'monospace', p: 1, borderRadius: 1 }
                                }}
                                variant="outlined"
                                fullWidth
                            />
                            <IconButton onClick={() => copyToClipboard(createdCredentials.password)}>
                                <ContentCopyIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={sendToWhatsApp}
                        startIcon={<WhatsAppIcon />}
                        sx={{
                            backgroundColor: '#25D366',
                            color: 'white',
                            '&:hover': { backgroundColor: '#128C7E' }
                        }}
                    >
                        Отправить в WhatsApp
                    </Button>
                    <Button
                        onClick={sendToTelegram}
                        startIcon={<TelegramIcon />}
                        sx={{
                            backgroundColor: '#0088cc',
                            color: 'white',
                            '&:hover': { backgroundColor: '#006699' }
                        }}
                    >
                        Отправить в Telegram
                    </Button>
                    <Button onClick={() => setCredentialsDialogOpen(false)} variant="contained">
                        Понятно
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог изменения статуса куратора */}
            <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
                <DialogTitle>Изменить статус куратора</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="curator-status-label">Статус</InputLabel>
                        <Select
                            labelId="curator-status-label"
                            value={newStatus}
                            label="Статус"
                            disabled={updatingStatus}
                            onChange={e => setNewStatus(e.target.value)}
                        >
                            <MenuItem value="working">Работает</MenuItem>
                            <MenuItem value="sick">Болен</MenuItem>
                            <MenuItem value="vacation">Отпуск</MenuItem>
                            <MenuItem value="business">Командировка</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setStatusDialogOpen(false)}
                        disabled={updatingStatus}
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
                        variant="contained"
                        disabled={updatingStatus}
                        onClick={async () => {
                            if (statusCurator) {
                                try {
                                    setUpdatingStatus(true);
                                    await updateCuratorStatus(statusCurator.uid, newStatus as import('../../types').InspectorStatus);

                                    // Обновляем кэш и список кураторов
                                    cacheManager.clearCache('curators');
                                    await loadData();

                                    setStatusDialogOpen(false);
                                    setStatusCurator(null);
                                    showSnackbar('Статус куратора обновлен', 'success');
                                } catch (error) {
                                    console.error('Ошибка обновления статуса куратора:', error);
                                    showSnackbar('Ошибка при обновлении статуса куратора', 'error');
                                } finally {
                                    setUpdatingStatus(false);
                                }
                            }
                        }}
                        sx={{
                            backgroundColor: '#4CAF50',
                            '&:hover': {
                                backgroundColor: '#45a049'
                            }
                        }}
                    >
                        {updatingStatus ? (
                            <>
                                <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} />
                                Обновление...
                            </>
                        ) : (
                            'Сохранить'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог создания (эффект) */}
            <Dialog open={creating} PaperProps={{ sx: { background: 'rgba(20,20,40,0.95)', boxShadow: 0 } }}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <CircularProgress color="primary" sx={{ mb: 2 }} />
                    <Typography>Создаются данные для куратора...</Typography>
                </DialogContent>
            </Dialog>

            {/* Диалог удаления (эффект загрузки) */}
            <Dialog open={!!deletingCurator} PaperProps={{ sx: { background: 'rgba(20,20,40,0.95)', boxShadow: 0 } }}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <CircularProgress color="primary" sx={{ mb: 2 }} />
                    <Typography sx={{ color: 'white' }}>Идет процесс удаления куратора...</Typography>
                </DialogContent>
            </Dialog>

            {/* Диалог изменения статуса (эффект загрузки) */}
            <Dialog open={updatingStatus} PaperProps={{ sx: { background: 'rgba(20,20,40,0.95)', boxShadow: 0 } }}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <CircularProgress color="primary" sx={{ mb: 2 }} />
                    <Typography sx={{ color: 'white' }}>Идет изменение статуса куратора...</Typography>
                </DialogContent>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default CuratorManagement; 