/**
 * @file: CuratorProfile.tsx
 * @description: Компонент профиля куратора
 * @dependencies: react, material-ui, auth context
 * @created: 2025-07-20
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Avatar,
    Chip,
    Divider,
    Alert,
    Snackbar,
    CircularProgress
} from '@mui/material';
import {
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Business as BusinessIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Curator } from '../../types';
import { getCuratorById, updateCuratorProfile } from '../../services/auth';

const CuratorProfile: React.FC = () => {
    const { user } = useAuth();
    const [curator, setCurator] = useState<Curator | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    // Форма для редактирования
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        position: ''
    });

    useEffect(() => {
        if (user?.uid) {
            loadCuratorData();
        }
    }, [user]);

    const loadCuratorData = async () => {
        try {
            setLoading(true);
            if (!user?.uid) return;

            const curatorData = await getCuratorById(user.uid);
            if (curatorData) {
                setCurator(curatorData);
                setFormData({
                    name: curatorData.name || '',
                    email: curatorData.email || '',
                    phone: curatorData.phone || '',
                    position: curatorData.position || ''
                });
            } else {
                setError('Данные куратора не найдены');
            }
        } catch (err) {
            console.error('Ошибка загрузки данных куратора:', err);
            setError('Ошибка при загрузке данных');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setEditing(true);
    };

    const handleCancel = () => {
        setEditing(false);
        // Восстанавливаем исходные данные
        if (curator) {
            setFormData({
                name: curator.name || '',
                email: curator.email || '',
                phone: curator.phone || '',
                position: curator.position || ''
            });
        }
    };

    const handleSave = async () => {
        if (!user?.uid) return;

        try {
            setSaving(true);
            await updateCuratorProfile(user.uid, formData);

            // Обновляем локальные данные
            if (curator) {
                setCurator({
                    ...curator,
                    ...formData
                });
            }

            setEditing(false);
            showSnackbar('Профиль успешно обновлен', 'success');
        } catch (err) {
            console.error('Ошибка обновления профиля:', err);
            showSnackbar('Ошибка при обновлении профиля', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!curator) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">Данные куратора не найдены</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Card sx={{ mb: 3, borderRadius: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'primary.main',
                                fontSize: '2rem',
                                mr: 3
                            }}
                        >
                            {curator.name ? curator.name.charAt(0).toUpperCase() : 'К'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                {curator.name || 'Куратор'}
                            </Typography>
                            <Chip
                                label="Куратор"
                                color="primary"
                                size="small"
                            />
                        </Box>
                        {!editing && (
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={handleEdit}
                                sx={{ ml: 2 }}
                            >
                                Редактировать
                            </Button>
                        )}
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Имя */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                            {editing ? (
                                <TextField
                                    fullWidth
                                    label="Имя"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {curator.name || 'Не указано'}
                                </Typography>
                            )}
                        </Box>

                        {/* Email */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
                            {editing ? (
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {curator.email || 'Не указано'}
                                </Typography>
                            )}
                        </Box>

                        {/* Телефон */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PhoneIcon sx={{ mr: 2, color: 'text.secondary' }} />
                            {editing ? (
                                <TextField
                                    fullWidth
                                    label="Телефон"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {curator.phone || 'Не указано'}
                                </Typography>
                            )}
                        </Box>

                        {/* Должность */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <BusinessIcon sx={{ mr: 2, color: 'text.secondary' }} />
                            {editing ? (
                                <TextField
                                    fullWidth
                                    label="Должность"
                                    value={formData.position}
                                    onChange={(e) => handleInputChange('position', e.target.value)}
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {curator.position || 'Не указано'}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Кнопки редактирования */}
                    {editing && (
                        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                Отмена
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default CuratorProfile; 