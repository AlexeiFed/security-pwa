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
    CircularProgress
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
import Header from '../common/Header';
import { cacheManager } from '../../services/cache';
import { colors } from '../../utils/colors';

const CuratorManagement = () => {
    const navigate = useNavigate();
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
        email: '',
        assignedObjects: []
    });

    const [editCurator, setEditCurator] = useState<CreateCuratorForm>({
        firstName: '',
        lastName: '',
        email: '',
        assignedObjects: []
    });

    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string }>({ email: '', password: '' });
    const [creating, setCreating] = useState(false);
    const [deletingCurator, setDeletingCurator] = useState<string | null>(null);

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusCurator, setStatusCurator] = useState<Curator | null>(null);
    const [newStatus, setNewStatus] = useState('working');

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
            if (!newCurator.firstName || !newCurator.lastName || !newCurator.email) {
                showSnackbar('Заполните все обязательные поля', 'error');
                return;
            }
            setCreating(true);
            const password = generatePassword();
            const name = `${newCurator.firstName} ${newCurator.lastName}`;

            // Создаем пользователя в Firebase Auth без входа в систему
            const user = await authService.createUserWithoutLogin(newCurator.email, password, 'curator', name);

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
                email: '',
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

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar('Скопировано', 'success');
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
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)' }}>
            <Box sx={{ p: 3 }}>
                {/* Заголовок страницы */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton
                        onClick={() => navigate('/')}
                        sx={{
                            mr: 2,
                            color: '#D4AF37',
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
                    <Typography variant="h4" component="h1" sx={{ color: '#fff', fontWeight: 600 }}>
                        Управление кураторами
                    </Typography>
                </Box>

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

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                    {curators.map((curator) => (
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
                                    transform: 'translateY(-8px) scale(1.02)',
                                    boxShadow: '0 16px 48px 0 rgba(212, 175, 55, 0.3)',
                                    borderColor: '#E5C158',
                                    '& .card-icon': {
                                        transform: 'scale(1.1)',
                                    }
                                }
                            }}
                            onClick={() => handleCuratorClick(curator)}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <PersonIcon sx={{
                                        mr: 1,
                                        color: '#ffffff',
                                        transition: 'transform 0.3s ease',
                                        className: 'card-icon'
                                    }} />
                                    <Typography variant="h6" component="div" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                        {curator.name}
                                    </Typography>
                                </Box>
                                <Typography sx={{ mb: 1, textAlign: 'left', color: 'rgba(255, 255, 255, 0.8)' }}>
                                    {curator.email}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#ffffff', mb: 2, textAlign: 'left', fontWeight: 500 }}>
                                    Объектов — {(curator.assignedObjects && curator.assignedObjects.length) || 0}
                                </Typography>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Chip
                                        label={getStatusText(curator.status)}
                                        color={getStatusColor(curator.status) as any}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            '& .MuiChip-label': {
                                                color: '#ffffff'
                                            }
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Добавить объект" arrow>
                                            <IconButton
                                                size="small"
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
                                                size="small"
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
                                                size="small"
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

                {curators.length === 0 && (
                    <Card sx={{
                        background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)',
                        border: '2px solid #D4AF37',
                        borderRadius: 3
                    }}>
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                                Кураторы не найдены
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ccc' }}>
                                Добавьте первого куратора для управления объектами
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

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
                    />
                    <TextField
                        fullWidth
                        label="Фамилия"
                        value={newCurator.lastName}
                        onChange={(e) => setNewCurator(prev => ({ ...prev, lastName: e.target.value }))}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={newCurator.email}
                        onChange={(e) => setNewCurator(prev => ({ ...prev, email: e.target.value }))}
                        margin="normal"
                        required
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
                        onClick={async () => {
                            if (statusCurator) {
                                await updateCuratorStatus(statusCurator.uid, newStatus as import('../../types').InspectorStatus);
                                setStatusDialogOpen(false);
                                setStatusCurator(null);
                                await loadData();
                            }
                        }}
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