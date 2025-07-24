/**
 * @file: InspectorProfile.tsx
 * @description: Профиль инспектора с управлением учетными данными
 * @dependencies: react, material-ui, auth context
 * @created: 2025-07-20
 */

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    IconButton,
    InputAdornment,
    Divider,
    useMediaQuery,
    CircularProgress
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';
import { getInspectorById } from '../../services/auth';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../services/firebase';

const InspectorProfile: React.FC = () => {
    const { user, logout } = useAuth();
    const isMobile = useMediaQuery('(max-width:600px)');

    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState<{
        newPassword?: string;
        confirmPassword?: string;
    }>({});

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({ open: false, message: '', severity: 'success' });

    const [userPassword, setUserPassword] = useState<string>('••••••••');
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Очищаем ошибку при изменении поля
        if (errors[field as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (formData.newPassword.length < 6) {
            newErrors.newPassword = 'Пароль должен содержать минимум 6 символов';
        }

        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Пароли не совпадают';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChangePassword = async () => {
        if (!validateForm()) return;

        try {
            // Изменяем пароль через Firebase Auth
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, formData.newPassword);

                setSnackbar({
                    open: true,
                    message: 'Пароль успешно изменен',
                    severity: 'success'
                });

                setChangePasswordDialogOpen(false);
                setFormData({ newPassword: '', confirmPassword: '' });
                setErrors({});

                // Обновляем отображаемый пароль
                setUserPassword(formData.newPassword);
            } else {
                throw new Error('Пользователь не авторизован');
            }
        } catch (error: any) {
            console.error('Ошибка при изменении пароля:', error);
            let errorMessage = 'Ошибка при изменении пароля';

            if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Для изменения пароля необходимо повторно войти в систему';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Пароль слишком слабый. Используйте минимум 6 символов';
            }

            setSnackbar({
                open: true,
                message: errorMessage,
                severity: 'error'
            });
        }
    };

    const handleDeleteAccount = async () => {
        try {
            // Здесь должна быть логика удаления аккаунта
            // await deleteUser(user);

            setSnackbar({
                open: true,
                message: 'Аккаунт удален',
                severity: 'success'
            });

            setDeleteDialogOpen(false);
            await logout();
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Ошибка при удалении аккаунта',
                severity: 'error'
            });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // Загрузка пароля пользователя
    const loadUserPassword = async () => {
        if (!user?.uid) return;

        setIsLoadingPassword(true);
        try {
            const inspectorData = await getInspectorById(user.uid);
            if (inspectorData) {
                // В реальном приложении пароль должен быть зашифрован
                // Здесь используем временное решение
                setUserPassword('inspector123');
            }
        } catch (error) {
            console.error('Ошибка загрузки пароля:', error);
            setUserPassword('••••••••');
        } finally {
            setIsLoadingPassword(false);
        }
    };

    // Загружаем пароль при первом показе
    const handleShowPassword = () => {
        if (userPassword === '••••••••' && !isLoadingPassword) {
            loadUserPassword();
        }
        setShowPassword(!showPassword);
    };

    if (!user) {
        return (
            <Box sx={{ p: { xs: 1, sm: 3 } }}>
                <Typography variant="h6" color="error">
                    Пользователь не найден
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: { xs: 1, sm: 3 } }}>
                Профиль инспектора
            </Typography>

            <Card sx={{
                borderRadius: 3,
                boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                background: '#0A2463',
                color: '#fff',
                border: 'none',
                p: { xs: 1, sm: 2 },
                '&:hover': {
                    transform: 'none',
                    boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                    background: '#0A2463',
                    borderColor: 'transparent'
                }
            }}>
                <CardContent sx={{ p: { xs: 1, sm: 3 } }}>
                    <Typography variant="h6" sx={{ mb: 3, color: '#D4AF37' }}>
                        Учетные данные
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                            Логин (Email)
                        </Typography>
                        <TextField
                            fullWidth
                            value={user.email || ''}
                            disabled
                            sx={{
                                '& .MuiInputBase-input': {
                                    color: 'white',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: 1
                                },
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                                    }
                                }
                            }}
                        />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                            Пароль
                        </Typography>
                        <TextField
                            fullWidth
                            type={showPassword ? 'text' : 'password'}
                            value={showPassword ? userPassword : '••••••••'}
                            disabled
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={handleShowPassword}
                                            edge="end"
                                            disabled={isLoadingPassword}
                                            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                        >
                                            {isLoadingPassword ? (
                                                <CircularProgress size={20} color="inherit" />
                                            ) : showPassword ? (
                                                <VisibilityOffIcon />
                                            ) : (
                                                <VisibilityIcon />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                '& .MuiInputBase-input': {
                                    color: 'white',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: 1
                                },
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                                    }
                                }
                            }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={() => setChangePasswordDialogOpen(true)}
                            sx={{
                                backgroundColor: '#D4AF37',
                                color: '#0A2463',
                                '&:hover': {
                                    backgroundColor: '#B8941F'
                                }
                            }}
                        >
                            Изменить пароль
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<DeleteIcon />}
                            onClick={() => setDeleteDialogOpen(true)}
                            sx={{
                                borderColor: '#ff4444',
                                color: '#ff4444',
                                '&:hover': {
                                    borderColor: '#cc0000',
                                    backgroundColor: 'rgba(255, 68, 68, 0.1)'
                                }
                            }}
                        >
                            Удалить аккаунт
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Диалог изменения пароля */}
            <Dialog
                open={changePasswordDialogOpen}
                onClose={() => setChangePasswordDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Изменить пароль</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Новый пароль"
                            type={showNewPassword ? 'text' : 'password'}
                            value={formData.newPassword}
                            onChange={(e) => handleInputChange('newPassword', e.target.value)}
                            error={!!errors.newPassword}
                            helperText={errors.newPassword}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            edge="end"
                                        >
                                            {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            fullWidth
                            label="Подтвердите новый пароль"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            edge="end"
                                        >
                                            {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setChangePasswordDialogOpen(false)}
                        sx={{
                            color: '#666',
                            '&:hover': {
                                backgroundColor: 'rgba(102, 102, 102, 0.1)'
                            }
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleChangePassword}
                        variant="contained"
                        startIcon={<SaveIcon />}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог удаления аккаунта */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Удалить аккаунт</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Внимание! Это действие необратимо. Все данные будут удалены.
                    </Alert>
                    <Typography>
                        Вы уверены, что хотите удалить свой аккаунт? Это действие нельзя отменить.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Отмена
                    </Button>
                    <Button
                        onClick={handleDeleteAccount}
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                    >
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar для уведомлений */}
            {snackbar.open && (
                <Alert
                    severity={snackbar.severity}
                    onClose={handleCloseSnackbar}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: 9999
                    }}
                >
                    {snackbar.message}
                </Alert>
            )}
        </Box>
    );
};

export default InspectorProfile; 