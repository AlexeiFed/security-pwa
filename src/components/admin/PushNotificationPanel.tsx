/**
 * @file: PushNotificationPanel.tsx
 * @description: Панель управления push-уведомлениями для администратора
 * @dependencies: react, material-ui, pushNotifications service
 * @created: 2025-07-12
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Alert,
    CircularProgress,
    Divider,
    OutlinedInput,
    Checkbox,
    ListItemText,
    IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

import {
    sendAlarmPushToAll,
    sendPushByRole,
    checkPushServerStatus,
    getPushSubscriptionsStats,
    PushNotificationResult
} from '../../services/pushNotifications';
import { createAlert } from '../../services/alerts';
import { useAuth } from '../../context/AuthContext';
import { AlarmObjectSelector } from './AlarmObjectSelector';
import { colors } from '../../utils/colors';

interface PushStats {
    total: number;
    valid: number;
    invalid: number;
}

const PushNotificationPanel: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [serverStatus, setServerStatus] = useState<boolean | null>(null);
    const [stats, setStats] = useState<PushStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PushNotificationResult | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['inspector']);
    const [customTitle, setCustomTitle] = useState('');
    const [customBody, setCustomBody] = useState('');
    const [showObjectSelector, setShowObjectSelector] = useState(false);
    const [selectedObject, setSelectedObject] = useState<{ id: string; name: string } | null>(null);

    // Загрузка статуса и статистики
    useEffect(() => {
        loadStatusAndStats();
    }, []);

    const loadStatusAndStats = async () => {
        setLoading(true);
        try {
            const [status, statsData] = await Promise.all([
                checkPushServerStatus(),
                getPushSubscriptionsStats()
            ]);
            setServerStatus(status);
            setStats(statsData);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        } finally {
            setLoading(false);
        }
    };



    const handleSendByRoles = async () => {
        if (selectedRoles.length === 0) {
            setResult({
                success: false,
                message: 'Выберите хотя бы одну роль',
                errors: ['Не выбрана ни одна роль для отправки уведомления']
            });
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            console.log('🚨 Активация тревожного сигнала выбранным ролям...');

            // Создаем тревогу в системе
            const alertData = {
                type: 'admin' as const,
                userId: user?.uid || 'system',
                userName: user?.name || 'Администратор',
                objectName: selectedObject?.name || 'Система',
                objectId: selectedObject?.id,
                description: customBody || 'Тревога от администратора',
                timestamp: new Date().toISOString(),
                forRoles: selectedRoles // Добавляем фильтрацию по ролям
            };

            await createAlert(alertData);
            console.log('✅ Тревога создана в системе');

            // Отправляем уведомления для каждой выбранной роли
            const results = await Promise.all(
                selectedRoles.map(role =>
                    sendPushByRole(role as 'curator' | 'inspector', {
                        title: customTitle || undefined,
                        body: customBody || undefined,
                        type: 'alarm',
                        objectId: selectedObject?.id,
                        objectName: selectedObject?.name
                    })
                )
            );

            // Объединяем результаты
            const totalSent = results.reduce((sum, r) => sum + (r.sentCount || 0), 0);
            const totalErrors = results.reduce((sum, r) => sum + (r.errorCount || 0), 0);
            const allErrors = results.flatMap(r => r.errors || []);

            setResult({
                success: totalErrors === 0,
                message: `✅ Тревога активирована! Отправлено уведомлений: ${totalSent}, Ошибок: ${totalErrors}`,
                sentCount: totalSent,
                errorCount: totalErrors,
                errors: allErrors.length > 0 ? allErrors : undefined
            });
        } catch (error) {
            console.error('❌ Ошибка активации тревоги:', error);
            setResult({
                success: false,
                message: '❌ Ошибка активации тревоги',
                errors: [error instanceof Error ? error.message : 'Неизвестная ошибка']
            });
        } finally {
            setLoading(false);
        }
    };

    const handleObjectSelect = (objectId: string, objectName: string) => {
        setSelectedObject({ id: objectId, name: objectName });
        setCustomTitle(customTitle || objectName);
        setCustomBody(customBody || `Тревога на объекте: ${objectName}`);
    };

    const handleRoleChange = (event: any) => {
        const value = event.target.value;
        setSelectedRoles(typeof value === 'string' ? value.split(',') : value);
    };

    return (
        <Box sx={{ p: 2 }}>
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
                    Push-уведомления
                </Typography>
            </Box>

            <Typography variant="h5" sx={{ mb: 3, color: colors.text.primary }}>
                📡 Управление Push-уведомлениями
            </Typography>

            {/* Статус сервера и статистика */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <Card sx={{
                        background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                        '&:hover': {
                            transform: 'none',
                            boxShadow: 'none'
                        }
                    }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ color: colors.text.primary, mb: 2 }}>
                                Статус Push-сервера
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {serverStatus === null ? (
                                    <CircularProgress size={20} />
                                ) : serverStatus ? (
                                    <Chip label="✅ Активен" color="success" />
                                ) : (
                                    <Chip label="❌ Недоступен" color="error" />
                                )}
                                <Button
                                    size="small"
                                    onClick={loadStatusAndStats}
                                    disabled={loading}
                                    sx={{
                                        color: 'white',
                                        borderColor: 'white',
                                        '&:hover': {
                                            borderColor: 'white',
                                            backgroundColor: 'rgba(255,255,255,0.1)'
                                        }
                                    }}
                                    variant="outlined"
                                >
                                    Обновить
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <Card sx={{
                        background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                        '&:hover': {
                            transform: 'none',
                            boxShadow: 'none'
                        }
                    }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ color: colors.text.primary, mb: 2 }}>
                                Статистика подписок
                            </Typography>
                            {stats ? (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip label={`Всего: ${stats.total}`} variant="outlined" />
                                    <Chip label={`Валидных: ${stats.valid}`} color="success" />
                                    <Chip label={`Невалидных: ${stats.invalid}`} color="warning" />
                                </Box>
                            ) : (
                                <CircularProgress size={20} />
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </Box>



            {/* Отправка по ролям */}
            <Card sx={{
                background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                '&:hover': {
                    transform: 'none',
                    boxShadow: 'none'
                }
            }}>
                <CardContent>
                    <Typography variant="h6" sx={{ color: colors.text.primary, mb: 2 }}>
                        🚨 Тревожное уведомление выбранным ролям
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.text.secondary, mb: 2 }}>
                        Создаст тревогу в системе и отправит push-уведомление только выбранным ролям. Воспроизведет звук тревоги и покажет красный экран.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <FormControl fullWidth>
                                <InputLabel>Роли</InputLabel>
                                <Select
                                    multiple
                                    value={selectedRoles}
                                    onChange={handleRoleChange}
                                    input={<OutlinedInput label="Роли" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => (
                                                <Chip
                                                    key={value}
                                                    label={value === 'curator' ? 'Кураторы' : 'Инспекторы'}
                                                    size="small"
                                                />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    <MenuItem value="curator">
                                        <Checkbox checked={selectedRoles.indexOf('curator') > -1} />
                                        <ListItemText primary="Кураторы" />
                                    </MenuItem>
                                    <MenuItem value="inspector">
                                        <Checkbox checked={selectedRoles.indexOf('inspector') > -1} />
                                        <ListItemText primary="Инспекторы" />
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    {/* Выбор объекта */}
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => setShowObjectSelector(true)}
                            sx={{
                                mb: 1,
                                color: 'white',
                                borderColor: 'white',
                                '&:hover': {
                                    borderColor: 'white',
                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                }
                            }}
                        >
                            {selectedObject ? `Выбран объект: ${selectedObject.name}` : 'Выбрать объект тревоги'}
                        </Button>
                        {selectedObject && (
                            <Chip
                                label={`Объект: ${selectedObject.name}`}
                                color="primary"
                                onDelete={() => setSelectedObject(null)}
                                sx={{ ml: 1 }}
                            />
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <TextField
                                fullWidth
                                label="Заголовок (необязательно)"
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                                placeholder="🚨 ТРЕВОГА!"
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <TextField
                                fullWidth
                                label="Сообщение (необязательно)"
                                value={customBody}
                                onChange={(e) => setCustomBody(e.target.value)}
                                placeholder="Обнаружена угроза безопасности!"
                            />
                        </Box>
                    </Box>

                    <Button
                        variant="contained"
                        onClick={handleSendByRoles}
                        disabled={loading || !serverStatus || selectedRoles.length === 0}
                        startIcon={loading ? <CircularProgress size={16} /> : null}
                        sx={{
                            backgroundColor: '#F44336',
                            '&:hover': {
                                backgroundColor: '#D32F2F'
                            },
                            '&:disabled': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.3)'
                            }
                        }}
                    >
                        Активировать тревогу для ролей ({selectedRoles.length})
                    </Button>
                </CardContent>
            </Card>

            {/* Результат отправки */}
            {result && (
                <Box sx={{ mt: 3 }}>
                    <Alert
                        severity={result.success ? 'success' : 'error'}
                        sx={{ mb: 2 }}
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => setResult(null)}
                                sx={{ color: 'white' }}
                            >
                                Скрыть
                            </Button>
                        }
                    >
                        <Typography sx={{ color: 'white' }}>
                            {result.message}
                        </Typography>
                    </Alert>

                    {result.errors && result.errors.length > 0 && (
                        <Alert
                            severity="warning"
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => setResult(null)}
                                    sx={{ color: 'white' }}
                                >
                                    Скрыть
                                </Button>
                            }
                        >
                            <Typography variant="body2">
                                Детали ошибок:
                            </Typography>
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                {result.errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                </Box>
            )}

            {/* Диалог выбора объекта */}
            <AlarmObjectSelector
                open={showObjectSelector}
                onClose={() => setShowObjectSelector(false)}
                onConfirm={handleObjectSelect}
            />
        </Box>
    );
};

export default PushNotificationPanel; 