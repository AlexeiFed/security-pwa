/**
 * @file: GuardPanel.tsx
 * @description: Панель охранника для работы с назначенным объектом охраны
 * @dependencies: react, material-ui, auth context, objects service
 * @created: 2025-01-23
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Alert,
    Snackbar,
    CircularProgress,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton
} from '@mui/material';

import {
    LocationOn as LocationIcon,
    Security as SecurityIcon,
    Assignment as AssignmentIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Guard, ObjectData } from '../../types';
import { getGuardById } from '../../services/auth';
import { getObjectById } from '../../services/objects';
import { createAlert } from '../../services/alerts';
import { sendAlarmPushToAll } from '../../services/pushNotifications';
import Header from '../common/Header';
import GuardBottomNavigation from './GuardBottomNavigation';

const GuardPanel = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [guard, setGuard] = useState<Guard | null>(null);
    const [assignedObject, setAssignedObject] = useState<ObjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [alarmDialog, setAlarmDialog] = useState(false);
    const [alarmDescription, setAlarmDescription] = useState('');

    const loadGuardData = useCallback(async () => {
        try {
            setLoading(true);
            console.log('🔄 Загрузка данных охранника...');

            if (!user?.uid) {
                setError('Пользователь не найден');
                return;
            }

            // Загружаем данные охранника
            const guardData = await getGuardById(user.uid);
            if (!guardData) {
                setError('Данные охранника не найдены');
                return;
            }

            setGuard(guardData);

            // Загружаем назначенный объект
            if (guardData.assignedObject) {
                try {
                    const objectData = await getObjectById(guardData.assignedObject);
                    setAssignedObject(objectData);
                } catch (objectError) {
                    console.error('Ошибка загрузки объекта:', objectError);
                    setError('Ошибка загрузки назначенного объекта');
                }
            }

            console.log('✅ Данные охранника загружены:', {
                guard: guardData.name,
                object: guardData.assignedObjectName
            });
        } catch (err) {
            console.error('❌ Ошибка загрузки данных:', err);
            setError('Ошибка при загрузке данных');
            showSnackbar('Ошибка при загрузке данных', 'error');
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (user) {
            loadGuardData();
        }
    }, [user, loadGuardData]);

    const handleNavigate = (page: string) => {
        if (page === 'home') {
            navigate('/guard');
        } else if (page === 'profile') {
            navigate('/guard/profile');
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleAlarm = () => {
        setAlarmDialog(true);
    };

    const confirmAlarm = async () => {
        if (!user || !assignedObject) return;
        try {
            console.log('🚨 Активация тревоги охранником...');

            // Создаем тревогу в системе
            await createAlert({
                type: 'guard',
                userId: user.uid,
                userName: user.name,
                objectId: assignedObject.id,
                objectName: assignedObject.name,
                description: alarmDescription,
                coordinates: assignedObject.position
            });

            // Отправляем push-уведомления всем пользователям
            console.log('📡 Отправка push-уведомлений...');
            const pushResult = await sendAlarmPushToAll(
                '🚨 ТРЕВОГА!',
                `Тревога от охранника ${user.name} с объекта: ${assignedObject.name}`,
                assignedObject.id,
                assignedObject.name
            );

            if (pushResult.success) {
                console.log('✅ Push-уведомления отправлены:', pushResult.sentCount, 'пользователям');
            } else {
                console.warn('⚠️ Ошибка отправки push-уведомлений:', pushResult.message);
            }

            setAlarmDialog(false);
            setAlarmDescription('');
            showSnackbar('Тревога отправлена!', 'success');
        } catch (err) {
            console.error('Ошибка отправки тревоги:', err);
            showSnackbar('Ошибка при отправке тревоги', 'error');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <Header
                    title="Панель охранника"
                    hideCompanyName={true}
                    hideTitle={true}
                    hideUserName={true}
                    showProfileMenu={true}
                    onProfileClick={() => navigate('/guard/profile')}
                    onLogoClick={() => navigate('/guard')}
                />
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)'
                }}>
                    <CircularProgress size={60} sx={{ color: '#fff' }} />
                </Box>
                <GuardBottomNavigation
                    currentPage="home"
                    onNavigate={handleNavigate}
                />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <Header
                    title="Панель охранника"
                    hideCompanyName={true}
                    hideTitle={true}
                    hideUserName={true}
                    showProfileMenu={true}
                    onProfileClick={() => navigate('/guard/profile')}
                    onLogoClick={() => navigate('/guard')}
                />
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                    p: 3
                }}>
                    <Alert severity="error" sx={{ maxWidth: 400 }}>
                        {error}
                    </Alert>
                </Box>
                <GuardBottomNavigation
                    currentPage="home"
                    onNavigate={handleNavigate}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title="Панель охранника"
                hideCompanyName={true}
                hideTitle={true}
                hideUserName={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/guard/profile')}
                onLogoClick={() => navigate('/guard')}
            />

            <Box sx={{
                flex: 1,
                overflow: 'auto',
                background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                p: { xs: 1, sm: 3 },
                pt: { xs: 2, sm: 4 },
                mt: { xs: 8, sm: 10 }
            }}>
                <Typography variant="h4" sx={{
                    mb: { xs: 1, sm: 3 },
                    color: '#fff',
                    fontWeight: 700,
                    textAlign: 'center'
                }}>
                    Панель охранника
                </Typography>

                {/* Объект охраны */}
                {assignedObject ? (
                    <Card sx={{
                        mb: 3,
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <LocationIcon sx={{ color: '#D4AF37', fontSize: 30, mr: 2 }} />
                                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                                        Объект охраны
                                    </Typography>
                                </Box>
                                <IconButton
                                    onClick={handleAlarm}
                                    sx={{
                                        bgcolor: 'error.main',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: 'error.dark',
                                        },
                                    }}
                                >
                                    <WarningIcon />
                                </IconButton>
                            </Box>

                            <Typography variant="h5" sx={{ color: '#fff', mb: 1, textAlign: 'left' }}>
                                {assignedObject.name}
                            </Typography>

                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2, textAlign: 'left' }}>
                                {assignedObject.address}
                            </Typography>
                        </CardContent>
                    </Card>
                ) : (
                    <Card sx={{
                        mb: 3,
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <SecurityIcon sx={{ color: '#D4AF37', fontSize: 30, mr: 2 }} />
                                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                                    Объект охраны
                                </Typography>
                            </Box>

                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'left' }}>
                                Вам не назначен объект охраны. Обратитесь к администратору.
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                {/* Информационная карточка */}
                <Card sx={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 2
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <AssignmentIcon sx={{ color: '#D4AF37', fontSize: 30, mr: 2 }} />
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                                Информация
                            </Typography>
                        </Box>

                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1, textAlign: 'left' }}>
                            • Выполняйте свои обязанности согласно графику смен
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1, textAlign: 'left' }}>
                            • При возникновении тревог вы получите уведомление
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'left' }}>
                            • Для изменения данных обратитесь к администратору
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Нижняя навигация */}
            <GuardBottomNavigation
                currentPage="home"
                onNavigate={handleNavigate}
            />

            {/* Диалог тревоги */}
            <Dialog open={alarmDialog} onClose={() => setAlarmDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
                    🚨 Активация тревоги
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Вы собираетесь активировать тревогу для объекта: <strong>{assignedObject?.name}</strong>
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Описание тревоги (необязательно)"
                        value={alarmDescription}
                        onChange={(e) => setAlarmDescription(e.target.value)}
                        placeholder="Опишите причину тревоги..."
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAlarmDialog(false)}>
                        Отмена
                    </Button>
                    <Button
                        onClick={confirmAlarm}
                        variant="contained"
                        color="error"
                        sx={{ fontWeight: 700 }}
                    >
                        Активировать тревогу
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar для уведомлений */}
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

export default GuardPanel;
