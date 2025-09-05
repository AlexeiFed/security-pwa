/**
 * @file: GuardProfile.tsx
 * @description: Компонент для отображения детальной страницы охранника
 * @dependencies: react, material-ui, auth service
 * @created: 2025-01-23
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    IconButton,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    CircularProgress,
    Button,
    Alert,
    useMediaQuery,
    useTheme
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Person as PersonIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    ContentCopy as ContentCopyIcon,
    WhatsApp as WhatsAppIcon,
    Telegram as TelegramIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { getGuardById, getGuardCredentials, updateGuardCredentials } from '../../services/auth';
import { Guard } from '../../types';
import { colors } from '../../utils/colors';
import AdminMobileHeader from '../common/AdminMobileHeader';

const GuardProfile = () => {
    const { uid } = useParams<{ uid: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [guard, setGuard] = useState<Guard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Состояния для управления учетными данными
    const [isEditingCredentials, setIsEditingCredentials] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [guardCredentials, setGuardCredentials] = useState({
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

    useEffect(() => {
        if (uid) {
            loadGuard();
        }
    }, [uid]);

    const loadGuard = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!uid) return;

            const data = await getGuardById(uid);
            if (data) {
                setGuard(data);
                // Загружаем учетные данные
                await loadGuardCredentials(data);
            } else {
                setError('Охранник не найден');
            }
        } catch (error) {
            console.error('Ошибка загрузки охранника:', error);
            setError('Ошибка загрузки данных охранника');
        } finally {
            setLoading(false);
        }
    };

    const loadGuardCredentials = async (guardData: Guard) => {
        try {
            setLoadingCredentials(true);
            const credentials = await getGuardCredentials(guardData.uid);
            if (credentials) {
                setGuardCredentials({
                    email: credentials.email || guardData.email,
                    password: credentials.password || ''
                });
                setEditedCredentials({
                    email: credentials.email || guardData.email,
                    password: credentials.password || ''
                });
            } else {
                setGuardCredentials({
                    email: guardData.email,
                    password: '••••••••'
                });
                setEditedCredentials({
                    email: guardData.email,
                    password: ''
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки учетных данных:', error);
            setGuardCredentials({
                email: guardData.email,
                password: '••••••••'
            });
            setEditedCredentials({
                email: guardData.email,
                password: ''
            });
        } finally {
            setLoadingCredentials(false);
        }
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

    const handleEditCredentials = () => {
        setIsEditingCredentials(true);
    };

    const handleSaveCredentials = async () => {
        try {
            setLoadingCredentials(true);
            if (guard) {
                await updateGuardCredentials(guard.uid, editedCredentials.email, editedCredentials.password);
                setGuardCredentials({
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
            email: guardCredentials.email,
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
        const message = `🔐 Учетные данные для входа в систему:\n\n👤 Охранник: ${guard?.name}\n📧 Email: ${guardCredentials.email}\n🔑 Пароль: ${guardCredentials.password}\n\n🌐 Ссылка для входа: ${window.location.origin}`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    const handleSendViaTelegram = () => {
        const message = `🔐 Учетные данные для входа в систему:\n\n👤 Охранник: ${guard?.name}\n📧 Email: ${guardCredentials.email}\n🔑 Пароль: ${guardCredentials.password}\n\n🌐 Ссылка для входа: ${window.location.origin}`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodedMessage}`, '_blank');
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Загрузка профиля охранника...</Typography>
            </Box>
        );
    }

    if (error || !guard) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error || 'Охранник не найден'}
                </Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/admin/guards')}
                >
                    Вернуться к списку
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)' }}>
            {isMobile && <AdminMobileHeader title="Профиль охранника" />}
            <Box sx={{ p: 3, pt: { xs: 10, sm: 4 } }}>
                {/* Заголовок страницы */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton
                        onClick={() => navigate('/admin/guards')}
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
                    <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                        Профиль охранника
                    </Typography>
                </Box>

                {/* Информация об охраннике */}
                <Box sx={{ mb: 3, p: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box>
                        <Typography variant="h5" component="h2" sx={{ color: '#fff', fontWeight: 700 }}>
                            {guard.name}
                        </Typography>
                        {guard.phone && (
                            <Typography variant="body1" sx={{ color: '#ccc', fontSize: 16 }}>
                                Телефон: {guard.phone}
                            </Typography>
                        )}
                        {guard.assignedObjectName && (
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, mt: 0.5 }}>
                                Объект: {guard.assignedObjectName}
                            </Typography>
                        )}

                        {guard.phone && (
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
                                Телефон: {guard.phone}
                            </Typography>
                        )}
                        {guard.createdAt && (
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, mt: 0.5 }}>
                                Профиль создан: {guard.createdAt.toLocaleDateString('ru-RU')}
                            </Typography>
                        )}
                    </Box>
                    <Chip
                        label={getStatusText(guard.status)}
                        color={getStatusColor(guard.status) as any}
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
                                            {guardCredentials.email || 'Не указан'}
                                        </Typography>
                                        {guardCredentials.email && (
                                            <IconButton
                                                size="small"
                                                onClick={() => copyToClipboard(guardCredentials.email)}
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
                                            {guardCredentials.password}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => copyToClipboard(guardCredentials.password)}
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
                                        <IconButton onClick={handleSendViaWhatsApp} sx={{ backgroundColor: '#25D366', color: '#fff', '&:hover': { backgroundColor: '#128C7E' } }} aria-label="Отправить в WhatsApp">
                                            <WhatsAppIcon />
                                        </IconButton>
                                        <IconButton onClick={handleSendViaTelegram} sx={{ backgroundColor: '#0088cc', color: '#fff', '&:hover': { backgroundColor: '#006699' } }} aria-label="Отправить в Telegram">
                                            <TelegramIcon />
                                        </IconButton>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="contained" startIcon={<WhatsAppIcon />} onClick={handleSendViaWhatsApp} sx={{ backgroundColor: '#25D366', '&:hover': { backgroundColor: '#128C7E' } }}>
                                            Отправить в WhatsApp
                                        </Button>
                                        <Button variant="contained" startIcon={<TelegramIcon />} onClick={handleSendViaTelegram} sx={{ backgroundColor: '#0088cc', '&:hover': { backgroundColor: '#006699' } }}>
                                            Отправить в Telegram
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Box>
                    )}
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
            </Box>
        </Box>
    );
};

export default GuardProfile;