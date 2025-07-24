import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
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
    CircularProgress
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
import { getInspectors, updateInspectorStatus, deleteInspector, authService } from '../../services/auth';
import { Inspector, InspectorStatus } from '../../types';
import { cacheManager } from '../../services/cache';
import { colors } from '../../utils/colors';

const InspectorList = () => {
    const [inspectors, setInspectors] = useState<Inspector[]>([]);
    const [loading, setLoading] = useState(true);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
    const [creatingDialogOpen, setCreatingDialogOpen] = useState(false);
    const [selectedInspector, setSelectedInspector] = useState<Inspector | null>(null);
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
        email: '',
        password: ''
    });

    // Созданные учетные данные
    const [createdCredentials, setCreatedCredentials] = useState({
        email: '',
        password: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        loadInspectors();
    }, []);

    const loadInspectors = async () => {
        try {
            setLoading(true);
            console.log('🔄 Загрузка инспекторов с кэшированием...');

            // Используем кэшированные данные
            const data = await cacheManager.getInspectors();
            setInspectors(data);

            console.log('✅ Инспекторы загружены из кэша:', data.length);
        } catch (error) {
            console.error('❌ Ошибка загрузки инспекторов:', error);
            showSnackbar('Ошибка загрузки инспекторов', 'error');
        } finally {
            setLoading(false);
        }
    };

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
            if (!newInspector.firstName.trim() || !newInspector.lastName.trim() || !newInspector.email.trim()) {
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
            const user = await authService.createUserWithoutLogin(email, password, 'inspector', name);

            setCreatedCredentials({ email, password });
            setCreatingDialogOpen(false);
            setCredentialsDialogOpen(true);

            // Сброс формы
            setNewInspector({
                firstName: '',
                lastName: '',
                email: '',
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
            await handleStatusChange(selectedInspector.uid, selectedInspector.status);
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
        const message = `Добрый день! Ваши учетные данные для входа в систему:\n\nЛогин: ${createdCredentials.email}\nПароль: ${createdCredentials.password}\n\nС уважением, администрация ЧОО "ВИТЯЗЬ"`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    const sendToTelegram = () => {
        const message = `Добрый день! Ваши учетные данные для входа в систему:\n\nЛогин: ${createdCredentials.email}\nПароль: ${createdCredentials.password}\n\nС уважением, администрация ЧОО "ВИТЯЗЬ"`;
        const encodedMessage = encodeURIComponent(message);
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodedMessage}`;
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
        <Box sx={{ p: 3 }}>
            {/* Заголовок страницы */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
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
                <Typography variant="h4" component="h1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                    Управление инспекторами
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDialogOpen(true)}
                >
                    Добавить инспектора
                </Button>
            </Box>

            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {inspectors.map((inspector) => (
                    <Card
                        key={inspector.uid}
                        sx={{
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                            border: '2px solid #D4AF37',
                            borderRadius: 3,
                            boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-8px) scale(1.02)',
                                boxShadow: '0 16px 48px 0 rgba(212, 175, 55, 0.3)',
                                borderColor: '#E5C158',
                                '& .card-icon': {
                                    transform: 'scale(1.1)',
                                }
                            },
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            py: 3,
                            px: 2,
                        }}
                        onClick={() => handleInspectorClick(inspector)}
                    >
                        <PersonIcon
                            className="card-icon"
                            sx={{
                                fontSize: 32,
                                color: '#ffffff',
                                mb: 1,
                                transition: 'transform 0.3s ease'
                            }}
                        />
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                textAlign: 'center',
                                mb: 1,
                                fontSize: '0.9rem',
                                color: '#ffffff'
                            }}
                        >
                            {inspector.name}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                fontSize: '0.75rem',
                                textAlign: 'center',
                                mb: 1,
                                color: 'rgba(255, 255, 255, 0.8)'
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
                    />
                    <TextField
                        fullWidth
                        label="Фамилия*"
                        value={newInspector.lastName}
                        onChange={(e) => setNewInspector({ ...newInspector, lastName: e.target.value })}
                        margin="normal"
                        required
                        error={!newInspector.lastName.trim()}
                        helperText={!newInspector.lastName.trim() ? 'Обязательное поле' : ''}
                    />
                    <TextField
                        fullWidth
                        label="Email*"
                        type="email"
                        value={newInspector.email}
                        onChange={(e) => setNewInspector({ ...newInspector, email: e.target.value })}
                        margin="normal"
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