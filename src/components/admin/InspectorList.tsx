import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,

    IconButton,
    Chip,
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
    CircularProgress,
    useTheme,
    useMediaQuery,
    Fab
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ContentCopy as CopyIcon,
    Person as PersonIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import { useNavigate } from 'react-router-dom';
import { updateInspectorStatus, deleteInspector, authService } from '../../services/auth';
import { Inspector, InspectorStatus } from '../../types';
import { cacheManager } from '../../services/cache';
import { colors } from '../../utils/colors';

const InspectorList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [inspectors, setInspectors] = useState<Inspector[]>([]);
    const [filteredInspectors, setFilteredInspectors] = useState<Inspector[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
    const [creatingDialogOpen, setCreatingDialogOpen] = useState(false);
    const [selectedInspector, setSelectedInspector] = useState<Inspector | null>(null);
    const [statusSaving, setStatusSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [deletingInspector, setDeletingInspector] = useState<string | null>(null);

    // Форма добавления инспектора
    const [newInspector, setNewInspector] = useState({
        firstName: '',
        lastName: '',
        email: '@vityaz.com',
        phone: '',
        password: ''
    });

    // Созданные учетные данные
    const [createdCredentials, setCreatedCredentials] = useState({
        email: '',
        password: ''
    });

    const navigate = useNavigate();

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
        setNewInspector(prev => ({
            ...prev,
            lastName,
            email: transliteratedLastName ? `${transliteratedLastName}@vityaz.com` : '@vityaz.com'
        }));
    };

    const loadInspectors = React.useCallback(async () => {
        try {
            setLoading(true);
            console.log('🔄 Загрузка инспекторов с кэшированием...');

            // Используем кэшированные данные
            const data = await cacheManager.getInspectors();
            setInspectors(data);
            setFilteredInspectors(data);

            console.log('✅ Инспекторы загружены из кэша:', data.length);
        } catch (error) {
            console.error('❌ Ошибка загрузки инспекторов:', error);
            showSnackbar('Ошибка загрузки инспекторов', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInspectors();
    }, [loadInspectors]);

    useEffect(() => {
        const filtered = inspectors.filter(inspector =>
            inspector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inspector.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredInspectors(filtered);
    }, [searchQuery, inspectors]);

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleAddInspector = async () => {
        try {
            // Валидация полей
            if (!newInspector.firstName.trim() || !newInspector.lastName.trim() || !newInspector.email.trim() || !newInspector.phone.trim()) {
                showSnackbar('Заполните все обязательные поля', 'error');
                return;
            }

            // Валидация email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newInspector.email)) {
                showSnackbar('Введите корректный email', 'error');
                return;
            }

            setCreatingDialogOpen(true);
            setAddDialogOpen(false);

            const password = generatePassword();
            const email = newInspector.email.toLowerCase();
            const name = `${newInspector.lastName} ${newInspector.firstName}`;

            // Создаем пользователя в Firebase Auth без входа в систему
            await authService.createUserWithoutLogin(email, password, 'inspector', name, newInspector.phone);

            setCreatedCredentials({ email, password });
            setCreatingDialogOpen(false);
            setCredentialsDialogOpen(true);

            // Сброс формы
            setNewInspector({
                firstName: '',
                lastName: '',
                email: '@vityaz.com',
                phone: '',
                password: ''
            });

            // Обновляем кэш и перезагружаем список
            cacheManager.clearCache('inspectors');
            await loadInspectors();

            showSnackbar('Инспектор создан успешно', 'success');
        } catch (error) {
            console.error('Ошибка создания инспектора:', error);
            setCreatingDialogOpen(false);
            setAddDialogOpen(true);
            showSnackbar('Ошибка создания инспектора', 'error');
        }
    };

    const handleDeleteInspector = async (uid: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этого инспектора?')) {
            try {
                setDeletingInspector(uid);

                // Отправляем push-уведомление о принудительном выходе
                try {
                    const { sendForceLogoutNotification } = await import('../../services/notifications');
                    await sendForceLogoutNotification(uid, 'Ваш аккаунт был удален администратором');
                } catch (notificationError) {
                    console.warn('Не удалось отправить уведомление о выходе:', notificationError);
                }

                // Удаляем инспектора
                await deleteInspector(uid);

                // Принудительно очищаем кэш и перезагружаем список
                cacheManager.clearCache('inspectors');
                await loadInspectors();

                showSnackbar('Инспектор удален', 'success');
            } catch (error) {
                console.error('Ошибка удаления инспектора:', error);
                showSnackbar('Ошибка удаления инспектора', 'error');
            } finally {
                setDeletingInspector(null);
            }
        }
    };

    const handleStatusChange = async (uid: string, status: InspectorStatus) => {
        try {
            await updateInspectorStatus(uid, status);

            // Обновляем кэш и перезагружаем список
            cacheManager.clearCache('inspectors');
            await loadInspectors();

            setStatusDialogOpen(false);
            setSelectedInspector(null);
            showSnackbar('Статус обновлен', 'success');
        } catch (error) {
            console.error('❌ Ошибка обновления статуса:', error);
            showSnackbar('Ошибка обновления статуса', 'error');
        }
    };

    const handleStatusSave = async () => {
        if (selectedInspector) {
            setStatusSaving(true);
            try {
                await handleStatusChange(selectedInspector.uid, selectedInspector.status);
            } finally {
                setStatusSaving(false);
            }
        }
    };

    const handleInspectorClick = (inspector: Inspector) => {
        navigate(`/admin/inspector/${inspector.uid}`);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar('Скопировано в буфер обмена', 'success');
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

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const getStatusColor = (status: InspectorStatus) => {
        switch (status) {
            case 'working': return 'success';
            case 'vacation': return 'warning';
            case 'sick': return 'error';
            default: return 'default';
        }
    };

    const getStatusText = (status: InspectorStatus) => {
        switch (status) {
            case 'working': return 'Работает';
            case 'vacation': return 'Отпуск';
            case 'sick': return 'Болен';
            default: return status;
        }
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
                        Загрузка инспекторов...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{
            p: 3,
            pt: isMobile ? 2 : { xs: 12, sm: 16 },
            pb: isMobile ? 8 : 3 // Дополнительный отступ снизу для мобильной версии под FAB
        }}>
            {/* Заголовок страницы */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 3, flexDirection: 'column', width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
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
                    <Typography
                        variant={isMobile ? "h5" : "h4"}
                        component="h1"
                        sx={{
                            color: colors.text.primary,
                            fontWeight: 600,
                            fontSize: isMobile ? '1.25rem' : undefined
                        }}
                    >
                        Управление инспекторами
                    </Typography>
                </Box>
                <TextField
                    fullWidth
                    placeholder="Поиск инспектора..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        mb: 2,
                        '& .MuiInputBase-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 2,
                            color: '#fff',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                        },
                        '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                        },
                        '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: colors.secondary.main,
                        },
                    }}
                />
            </Box>

            {/* Кнопка добавления - только для десктопа */}
            {!isMobile && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setAddDialogOpen(true)}
                    >
                        Добавить инспектора
                    </Button>
                </Box>
            )}

            <Box sx={{
                display: 'grid',
                gap: isMobile ? 2 : 3,
                gridTemplateColumns: isMobile
                    ? 'repeat(auto-fill, minmax(140px, 1fr))'
                    : 'repeat(auto-fill, minmax(250px, 1fr))'
            }}>
                {filteredInspectors.map((inspector) => (
                    <Card
                        key={inspector.uid}
                        sx={{
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                            border: '2px solid #D4AF37',
                            borderRadius: isMobile ? 2 : 3,
                            boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: isMobile ? 'scale(1.05)' : 'translateY(-8px) scale(1.02)',
                                boxShadow: '0 16px 48px 0 rgba(212, 175, 55, 0.3)',
                                borderColor: '#E5C158',
                                '& .card-icon': {
                                    transform: 'scale(1.1)',
                                }
                            },
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            py: isMobile ? 2 : 3,
                            px: isMobile ? 1 : 2,
                        }}
                        onClick={() => handleInspectorClick(inspector)}
                    >
                        <PersonIcon
                            className="card-icon"
                            sx={{
                                fontSize: isMobile ? 24 : 32,
                                color: '#ffffff',
                                mb: isMobile ? 0.5 : 1,
                                transition: 'transform 0.3s ease'
                            }}
                        />
                        <Typography
                            variant={isMobile ? "body2" : "h6"}
                            sx={{
                                fontWeight: 600,
                                textAlign: 'center',
                                mb: isMobile ? 0.5 : 1,
                                fontSize: isMobile ? '0.8rem' : '0.9rem',
                                color: '#ffffff',
                                lineHeight: isMobile ? 1.2 : undefined
                            }}
                        >
                            {inspector.name}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                fontSize: isMobile ? '0.65rem' : '0.75rem',
                                textAlign: 'center',
                                mb: isMobile ? 0.5 : 1,
                                color: 'rgba(255, 255, 255, 0.8)',
                                lineHeight: isMobile ? 1.1 : undefined
                            }}
                        >
                            {inspector.email}
                        </Typography>
                        <Chip
                            label={getStatusText(inspector.status)}
                            color={getStatusColor(inspector.status) as any}
                            size="small"
                            sx={{
                                mb: 1,
                                fontWeight: 600,
                                '& .MuiChip-label': {
                                    color: '#ffffff'
                                }
                            }}
                        />
                        <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInspector(inspector);
                                    setStatusDialogOpen(true);
                                }}
                                sx={{
                                    color: '#2196F3',
                                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                        transform: 'scale(1.1)'
                                    }
                                }}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteInspector(inspector.uid);
                                }}
                                sx={{
                                    color: '#F44336',
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                        transform: 'scale(1.1)'
                                    }
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Card>
                ))}
            </Box>

            {/* FAB кнопка для мобильной версии */}
            {isMobile && (
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => setAddDialogOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        backgroundColor: colors.secondary.main,
                        color: '#000',
                        boxShadow: '0 4px 12px rgba(212, 175, 55, 0.5)',
                        '&:hover': {
                            backgroundColor: '#E5C158',
                            transform: 'scale(1.1)'
                        },
                        transition: 'all 0.3s ease',
                        zIndex: 1000
                    }}
                >
                    <AddIcon />
                </Fab>
            )}

            {/* Диалог добавления инспектора */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Добавить инспектора</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Имя*"
                        value={newInspector.firstName}
                        onChange={(e) => setNewInspector({ ...newInspector, firstName: e.target.value })}
                        margin="normal"
                        required
                        error={!newInspector.firstName.trim()}
                        helperText={!newInspector.firstName.trim() ? 'Обязательное поле' : ''}
                        sx={textFieldStyles}
                    />
                    <TextField
                        fullWidth
                        label="Фамилия*"
                        value={newInspector.lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        margin="normal"
                        required
                        error={!newInspector.lastName.trim()}
                        helperText={!newInspector.lastName.trim() ? 'Обязательное поле' : ''}
                        sx={textFieldStyles}
                    />
                    <TextField
                        fullWidth
                        label="Email*"
                        type="email"
                        value={newInspector.email}
                        onChange={(e) => setNewInspector({ ...newInspector, email: e.target.value })}
                        margin="normal"
                        sx={textFieldStyles}
                        required
                        error={!newInspector.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newInspector.email)}
                        helperText={
                            !newInspector.email.trim()
                                ? 'Обязательное поле'
                                : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newInspector.email)
                                    ? 'Введите корректный email'
                                    : ''
                        }
                    />
                    <TextField
                        fullWidth
                        label="Номер телефона*"
                        type="tel"
                        value={newInspector.phone}
                        onChange={(e) => setNewInspector({ ...newInspector, phone: e.target.value })}
                        margin="normal"
                        sx={textFieldStyles}
                        required
                        placeholder="+7 (999) 123-45-67"
                        error={!newInspector.phone.trim()}
                        helperText={!newInspector.phone.trim() ? 'Обязательное поле' : ''}
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
                        ОТМЕНА
                    </Button>
                    <Button
                        onClick={handleAddInspector}
                        variant="contained"
                        disabled={!newInspector.firstName.trim() || !newInspector.lastName.trim() || !newInspector.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newInspector.email)}
                        sx={{
                            backgroundColor: '#4CAF50',
                            '&:hover': {
                                backgroundColor: '#45a049'
                            }
                        }}
                    >
                        ДОБАВИТЬ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог изменения статуса */}
            <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
                <DialogTitle>Изменить статус инспектора</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        {selectedInspector?.name}
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>Статус</InputLabel>
                        <Select
                            value={selectedInspector?.status || 'working'}
                            onChange={(e) => {
                                if (selectedInspector) {
                                    setSelectedInspector({
                                        ...selectedInspector,
                                        status: e.target.value as InspectorStatus
                                    });
                                }
                            }}
                        >
                            <MenuItem value="working">Работает</MenuItem>
                            <MenuItem value="vacation">Отпуск</MenuItem>
                            <MenuItem value="sick">Болен</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setStatusDialogOpen(false)}
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
                        onClick={handleStatusSave}
                        variant="contained"
                        disabled={statusSaving}
                        startIcon={statusSaving ? <CircularProgress size={20} /> : null}
                        sx={{
                            backgroundColor: '#4CAF50',
                            '&:hover': {
                                backgroundColor: '#45a049'
                            }
                        }}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог с учетными данными */}
            <Dialog open={credentialsDialogOpen} onClose={() => setCredentialsDialogOpen(false)}>
                <DialogTitle>Учетные данные созданы</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Сохраните эти данные для передачи инспектору:
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
                                <CopyIcon />
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
                                InputProps={{
                                    readOnly: true,
                                    sx: { background: 'transparent', fontFamily: 'monospace', p: 1, borderRadius: 1 }
                                }}
                                variant="outlined"
                                sx={textFieldStyles}
                                fullWidth
                            />
                            <IconButton onClick={() => copyToClipboard(createdCredentials.password)}>
                                <CopyIcon />
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
                    <Button
                        onClick={() => setCredentialsDialogOpen(false)}
                        variant="contained"
                        sx={{
                            backgroundColor: '#2196F3',
                            '&:hover': {
                                backgroundColor: '#1976D2'
                            }
                        }}
                    >
                        Понятно
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог создания (эффект загрузки) */}
            <Dialog open={creatingDialogOpen} PaperProps={{ sx: { background: 'rgba(20,20,40,0.95)', boxShadow: 0 } }}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <CircularProgress color="primary" sx={{ mb: 2 }} />
                    <Typography sx={{ color: 'white' }}>Идет процесс создания профиля инспектора...</Typography>
                </DialogContent>
            </Dialog>

            {/* Диалог удаления (эффект загрузки) */}
            <Dialog open={!!deletingInspector} PaperProps={{ sx: { background: 'rgba(20,20,40,0.95)', boxShadow: 0 } }}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <CircularProgress color="primary" sx={{ mb: 2 }} />
                    <Typography sx={{ color: 'white' }}>Идет процесс удаления инспектора...</Typography>
                </DialogContent>
            </Dialog>

            {/* Snackbar для уведомлений */}
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
        </Box>
    );
};

export default InspectorList; 