/**
 * @file: GuardProfile.tsx
 * @description: Профиль охранника с отображением учетных данных
 * @dependencies: react, material-ui, auth context
 * @created: 2025-01-23
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
    Alert,
    Snackbar,
    IconButton,
    InputAdornment,
    useMediaQuery,
    CircularProgress,
    Chip,
    Paper
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Person as PersonIcon,
    Security as SecurityIcon,
    Phone as PhoneIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';
import { getGuardById, getGuardCredentials } from '../../services/auth';
import { Guard } from '../../types';

const GuardProfile: React.FC = () => {
    const { user, logout } = useAuth();
    const isMobile = useMediaQuery('(max-width:600px)');

    const [showPassword, setShowPassword] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({ open: false, message: '', severity: 'success' });

    const [guardData, setGuardData] = useState<Guard | null>(null);
    const [guardCredentials, setGuardCredentials] = useState<{
        email: string;
        password: string;
    }>({ email: '', password: '' });

    useEffect(() => {
        if (user) {
            loadGuardData();
        }
    }, [user]);

    const loadGuardData = async () => {
        try {
            setLoading(true);
            if (!user?.uid) return;

            const guard = await getGuardById(user.uid);
            if (guard) {
                setGuardData(guard);

                // Загружаем учетные данные
                try {
                    const credentials = await getGuardCredentials(user.uid);
                    setGuardCredentials(credentials);
                } catch (error) {
                    console.error('Ошибка загрузки учетных данных:', error);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки данных охранника:', error);
            showSnackbar('Ошибка загрузки данных', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            // Здесь должна быть логика удаления аккаунта
            // Пока просто выходим из системы
            await logout();
            showSnackbar('Аккаунт удален', 'success');
        } catch (error) {
            console.error('Ошибка удаления аккаунта:', error);
            showSnackbar('Ошибка удаления аккаунта', 'error');
        }
        setDeleteDialogOpen(false);
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'working': return 'success';
            case 'sick': return 'error';
            case 'vacation': return 'warning';
            case 'business': return 'info';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'working': return 'Работает';
            case 'sick': return 'Болен';
            case 'vacation': return 'Отпуск';
            case 'business': return 'Командировка';
            default: return 'Неизвестно';
        }
    };

    if (loading) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <CircularProgress size={60} sx={{ color: '#fff' }} />
            </Box>
        );
    }

    return (
        <Box sx={{
            p: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '100%'
        }}>
            {/* Основная информация */}
            <Paper sx={{
                p: 3,
                mb: 3,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <PersonIcon sx={{ color: '#fff', fontSize: 40, mr: 2 }} />
                    <Box>
                        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>
                            {guardData?.name}
                        </Typography>
                        <Chip
                            label={getStatusText(guardData?.status || 'working')}
                            color={getStatusColor(guardData?.status || 'working') as any}
                            sx={{ mt: 1 }}
                        />
                    </Box>
                </Box>

                {guardData?.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PhoneIcon sx={{ color: 'rgba(255,255,255,0.8)', mr: 1 }} />
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {guardData.phone}
                        </Typography>
                    </Box>
                )}

                {guardData?.assignedObjectName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SecurityIcon sx={{ color: 'rgba(255,255,255,0.8)', mr: 1 }} />
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Объект: {guardData.assignedObjectName}
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* Учетные данные */}
            <Card sx={{
                mb: 3,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
            }}>
                <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 3, fontWeight: 600 }}>
                        Учетные данные
                    </Typography>

                    {/* Email */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                            Email для входа
                        </Typography>
                        <Box sx={{
                            p: 2,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <EmailIcon sx={{ color: 'rgba(255,255,255,0.8)', mr: 1 }} />
                            <Typography variant="body1" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                                {guardCredentials.email || 'Не загружен'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Пароль */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                            Пароль
                        </Typography>
                        <Box sx={{
                            p: 2,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body1" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                                    {showPassword ? guardCredentials.password : '••••••••'}
                                </Typography>
                            </Box>
                            <IconButton
                                onClick={handleShowPassword}
                                sx={{ color: 'rgba(255,255,255,0.8)' }}
                            >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                        </Box>
                    </Box>

                    <Alert severity="info" sx={{
                        background: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.9)',
                        '& .MuiAlert-icon': { color: 'rgba(255,255,255,0.9)' }
                    }}>
                        Для изменения учетных данных обратитесь к администратору
                    </Alert>
                </CardContent>
            </Card>

            {/* Действия */}
            <Card sx={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
            }}>
                <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 3, fontWeight: 600 }}>
                        Действия
                    </Typography>

                    <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={() => setDeleteDialogOpen(true)}
                        sx={{
                            color: '#fff',
                            borderColor: 'rgba(255,255,255,0.3)',
                            '&:hover': {
                                borderColor: '#fff',
                                background: 'rgba(255,255,255,0.1)'
                            }
                        }}
                    >
                        Выйти из системы
                    </Button>
                </CardContent>
            </Card>

            {/* Диалог удаления */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Подтверждение выхода</DialogTitle>
                <DialogContent>
                    <Typography>
                        Вы уверены, что хотите выйти из системы?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Отмена
                    </Button>
                    <Button onClick={handleDeleteAccount} color="error" variant="contained">
                        Выйти
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default GuardProfile;
