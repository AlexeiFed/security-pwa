/**
 * @file: AdminProfile.tsx
 * @description: Компонент профиля администратора с управлением учетными данными
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
    Snackbar,
    IconButton,
    InputAdornment,
    Divider,
    Paper
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';
import { useNavigate } from 'react-router-dom';

const AdminProfile = () => {
    const { user, updateUserCredentials } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    // Форма для редактирования
    const [formData, setFormData] = useState({
        login: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleShowPassword = () => setShowPassword(!showPassword);
    const handleShowNewPassword = () => setShowNewPassword(!showNewPassword);

    const handleEdit = () => {
        setIsEditing(true);
        setFormData({
            login: user?.email || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({
            login: user?.email || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    const handleSave = async () => {
        // Валидация
        if (!formData.currentPassword) {
            showSnackbar('Введите текущий пароль', 'error');
            return;
        }

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            showSnackbar('Новые пароли не совпадают', 'error');
            return;
        }

        if (formData.newPassword && formData.newPassword.length < 6) {
            showSnackbar('Новый пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        try {
            await updateUserCredentials(
                formData.currentPassword,
                formData.newPassword || undefined
            );

            showSnackbar('Учетные данные успешно обновлены', 'success');
            setIsEditing(false);
        } catch (error) {
            console.error('Ошибка обновления учетных данных:', error);
            showSnackbar('Ошибка при обновлении учетных данных', 'error');
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>

            {/* Основная информация */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: colors.secondary.main, fontWeight: 600 }}>
                    Основная информация
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, mr: 2 }}>
                        Имя:
                    </Typography>
                    <Typography variant="body1">
                        {user?.name || 'Не указано'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, mr: 2 }}>
                        Роль:
                    </Typography>
                    <Typography variant="body1">
                        Администратор
                    </Typography>
                </Box>
            </Paper>

            {/* Учетные данные */}
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" sx={{ color: colors.secondary.main, fontWeight: 600 }}>
                        Учетные данные
                    </Typography>
                    {!isEditing && (
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={handleEdit}
                            sx={{
                                color: colors.secondary.main,
                                borderColor: colors.secondary.main,
                                '&:hover': {
                                    borderColor: colors.secondary.dark,
                                    backgroundColor: 'rgba(212, 175, 55, 0.1)'
                                }
                            }}
                        >
                            Редактировать
                        </Button>
                    )}
                </Box>

                {isEditing ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Логин (Email)"
                            value={formData.login}
                            onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                            fullWidth
                            disabled
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            label="Текущий пароль"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            fullWidth
                            required
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleShowPassword} edge="end">
                                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Новый пароль (оставьте пустым, если не хотите менять)
                        </Typography>

                        <TextField
                            label="Новый пароль"
                            type={showNewPassword ? 'text' : 'password'}
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleShowNewPassword} edge="end">
                                            {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            label="Подтвердите новый пароль"
                            type={showNewPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            fullWidth
                            error={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== ''}
                            helperText={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== '' ? 'Пароли не совпадают' : ''}
                        />

                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                sx={{
                                    backgroundColor: colors.status.success,
                                    '&:hover': {
                                        backgroundColor: '#2e7d32'
                                    }
                                }}
                            >
                                Сохранить
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                onClick={handleCancel}
                                sx={{
                                    color: colors.status.error,
                                    borderColor: colors.status.error,
                                    '&:hover': {
                                        borderColor: '#d32f2f',
                                        backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                    }
                                }}
                            >
                                Отмена
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Логин (Email)"
                            value={user?.email || ''}
                            fullWidth
                            disabled
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            label="Пароль"
                            type="password"
                            value="••••••••"
                            fullWidth
                            disabled
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton disabled edge="end">
                                            <VisibilityOffIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                )}
            </Paper>

            {/* Snackbar для уведомлений */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{
                        backgroundColor: snackbar.severity === 'success' ? '#4caf50' : '#f44336',
                        color: 'white',
                        '& .MuiAlert-icon': {
                            color: 'white'
                        },
                        '& .MuiAlert-message': {
                            color: 'white'
                        }
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AdminProfile; 