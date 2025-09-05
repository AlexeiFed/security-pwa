/**
 * @file: GuardManagement.tsx
 * @description: Компонент для управления охранниками администратором
 * @dependencies: react, material-ui, auth service
 * @created: 2025-01-23
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Chip,
    Alert,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    useTheme,
    useMediaQuery,
    Fab
} from '@mui/material';
import {
    Add as AddIcon,
    Person as PersonIcon,
    ContentCopy as ContentCopyIcon,
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
// Tooltip не используется после группировки, удаляем импорт
import { useNavigate } from 'react-router-dom';
import { Guard, CreateGuardForm, ObjectData, Curator } from '../../types';
import { authService, deleteGuard, updateGuardStatus, updateGuardCredentials } from '../../services/auth';
import { cacheManager } from '../../services/cache';
import { colors } from '../../utils/colors';
import AdminMobileHeader from '../common/AdminMobileHeader';

const GuardManagement = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [guards, setGuards] = useState<Guard[]>([]);
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [curators, setCurators] = useState<Curator[]>([]);
    const [objectFilter, setObjectFilter] = useState('');
    const [guardSearch, setGuardSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const [newGuard, setNewGuard] = useState<CreateGuardForm>({
        firstName: '',
        lastName: '',
        email: '@vityaz.com',
        phone: '',
        assignedObject: ''
    });

    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string }>({ email: '', password: '' });
    const [creating, setCreating] = useState(false);
    const [deletingGuard, setDeletingGuard] = useState<string | null>(null);

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusGuard, setStatusGuard] = useState<Guard | null>(null);
    const [newStatus, setNewStatus] = useState('working');
    const [newAssignedObject, setNewAssignedObject] = useState<string>('');
    const [navigatingToGuard, setNavigatingToGuard] = useState<string | null>(null);

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
        setNewGuard(prev => ({
            ...prev,
            lastName,
            email: transliteratedLastName ? `${transliteratedLastName}@vityaz.com` : '@vityaz.com'
        }));
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            console.log('🔄 Загрузка данных охранников и объектов с кэшированием...');

            const [guardsData, objectsData, curatorsData] = await Promise.all([
                cacheManager.getGuards(),
                cacheManager.getObjects(),
                cacheManager.getCurators()
            ]);

            setGuards(guardsData);
            setObjects(objectsData);
            setCurators(curatorsData);

            console.log('✅ Данные загружены из кэша:', {
                guards: guardsData.length,
                objects: objectsData.length,
                curators: curatorsData.length
            });
        } catch (err) {
            console.error('❌ Ошибка загрузки данных:', err);
            setError('Ошибка при загрузке данных');
            showSnackbar('Ошибка при загрузке данных', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddGuard = async () => {
        try {
            if (!newGuard.firstName || !newGuard.lastName || !newGuard.email) {
                showSnackbar('Заполните все обязательные поля', 'error');
                return;
            }
            setCreating(true);
            const password = generatePassword();
            const name = `${newGuard.firstName} ${newGuard.lastName}`;

            // Создаем пользователя в Firebase Auth без входа в систему
            const user = await authService.createUserWithoutLogin(newGuard.email, password, 'guard', name);

            // Сохраняем дополнительные данные охранника в Firestore
            if (user.uid) {
                await updateGuardCredentials(user.uid, newGuard.email, password);

                // Обновляем документ пользователя с дополнительными полями
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../../services/firebase');

                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    phone: newGuard.phone || '',
                    assignedObject: newGuard.assignedObject || ''
                });
            }

            setCreatedCredentials({ email: newGuard.email, password });
            setCredentialsDialogOpen(true);

            // Обновляем кэш и список охранников
            cacheManager.clearCache('guards');
            await loadData();

            setAddDialogOpen(false);
            setNewGuard({
                firstName: '',
                lastName: '',
                email: '@vityaz.com',
                phone: '',
                assignedObject: ''
            });
        } catch (err) {
            console.error('Ошибка создания охранника:', err);
            showSnackbar('Ошибка при создании охранника', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteGuard = async () => {
        if (!selectedGuard) return;

        try {
            setDeletingGuard(selectedGuard.uid);

            // Отправляем push-уведомление о принудительном выходе
            try {
                const { sendForceLogoutNotification } = await import('../../services/notifications');
                await sendForceLogoutNotification(selectedGuard.uid, 'Ваш аккаунт был удален администратором');
            } catch (notificationError) {
                console.warn('Не удалось отправить уведомление о выходе:', notificationError);
            }

            // Удаляем охранника
            await deleteGuard(selectedGuard.uid);

            // Принудительно очищаем кэш и перезагружаем список
            cacheManager.clearCache('guards');
            await loadData();
            setDeleteDialogOpen(false);
            setSelectedGuard(null);

            showSnackbar('Охранник удален', 'success');
        } catch (err) {
            console.error('Ошибка удаления охранника:', err);
            showSnackbar('Ошибка при удалении охранника', 'error');
        } finally {
            setDeletingGuard(null);
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

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar('Скопировано', 'success');
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

    const handleGuardClick = (guard: Guard) => {
        setNavigatingToGuard(guard.uid);
        // Небольшая задержка для показа индикатора загрузки
        setTimeout(() => {
            navigate(`/admin/guard/${guard.uid}`);
        }, 100);
    };

    const groupedByObject = useMemo(() => {
        const filter = objectFilter.trim().toLowerCase();
        const candidates = objects
            .filter(o =>
                !filter ||
                o.name.toLowerCase().includes(filter) ||
                o.address.toLowerCase().includes(filter)
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

        const result = candidates.map((obj) => {
            const guardsOfObject = guards
                .filter(g => g.assignedObject === obj.id)
                .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
            const curator = curators.find(c => (c.assignedObjects || []).includes(obj.id));
            return { object: obj, curator, guards: guardsOfObject };
        }).filter(group => group.guards.length > 0);

        // Добавим группу "Без объекта", если фильтр пустой
        if (!filter) {
            const unassigned = guards.filter(g => !g.assignedObject);
            if (unassigned.length > 0) {
                result.push({
                    object: { id: 'unassigned', name: 'Без объекта', address: '', description: '', position: [0, 0], status: 'inactive' },
                    curator: undefined,
                    guards: unassigned.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
                });
            }
        }

        return result;
    }, [objects, guards, curators, objectFilter]);

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
                        Загрузка охранников...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)' }}>
            {isMobile && <AdminMobileHeader title="Управление охранниками" />}
            <Box sx={{ p: 3, pt: { xs: 10, sm: 7 } }}>

                {/* Заголовок для десктопа с кнопкой назад */}
                {!isMobile && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                        <IconButton
                            onClick={() => navigate('/admin')}
                            sx={{
                                color: colors.secondary.main,
                                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                                '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.2)', transform: 'scale(1.08)' },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>
                            Управление охранниками
                        </Typography>
                    </Box>
                )}

                {/* Дополнительный заголовок для мобильной версии под шапкой */}
                {isMobile && (
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
                        Управление охранниками
                    </Typography>
                )}

                {!isMobile && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setAddDialogOpen(true)}
                            sx={{
                                backgroundColor: '#D4AF37',
                                '&:hover': { backgroundColor: '#B8941F' },
                                fontSize: '0.75rem',
                                py: 0.8
                            }}
                        >
                            Добавить охранника
                        </Button>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Поиск охранника */}
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" sx={{ color: colors.secondary.main, fontWeight: 600, mb: 1 }}>
                        Поиск охранника
                    </Typography>
                    <TextField
                        fullWidth
                        value={guardSearch}
                        onChange={(e) => setGuardSearch(e.target.value)}
                        placeholder="Имя или email охранника"
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { fontSize: isMobile ? '0.875rem' : '1rem' } }}
                    />
                </Paper>

                {/* Фильтр по объекту */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" sx={{ color: colors.secondary.main, fontWeight: 600, mb: 1 }}>
                        Фильтр по объекту
                    </Typography>
                    <TextField
                        fullWidth
                        value={objectFilter}
                        onChange={(e) => setObjectFilter(e.target.value)}
                        placeholder="Название или адрес объекта"
                        size="small"
                        sx={{
                            '& .MuiOutlinedInput-root': { fontSize: isMobile ? '0.875rem' : '1rem' }
                        }}
                    />
                </Paper>

                {/* Группы: объект → куратор → охранники */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {groupedByObject.map(({ object: obj, curator, guards: groupGuards }) => (
                        <Box key={obj.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, pb: 1 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, textAlign: 'left' }}>
                                    {obj.name}
                                </Typography>
                                {obj.address && (
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'left' }}>{obj.address}</Typography>
                                )}
                                <Typography variant="body2" sx={{ color: colors.secondary.main, fontWeight: 600, textAlign: 'left' }}>
                                    Куратор: {curator ? curator.name : 'не назначен'}
                                </Typography>
                            </Box>

                            <Box sx={{
                                display: 'grid',
                                gap: 1.5,
                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))'
                            }}>
                                {groupGuards
                                    .filter((g) =>
                                        !guardSearch.trim() ||
                                        g.name.toLowerCase().includes(guardSearch.toLowerCase()) ||
                                        (g.email || '').toLowerCase().includes(guardSearch.toLowerCase())
                                    )
                                    .map((guard) => (
                                        <Card
                                            key={guard.uid}
                                            sx={{
                                                cursor: 'pointer',
                                                background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                                                border: '2px solid #D4AF37',
                                                borderRadius: 2,
                                                boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    transform: 'translateY(-4px) scale(1.01)',
                                                    boxShadow: '0 16px 48px 0 rgba(212, 175, 55, 0.3)',
                                                    borderColor: '#E5C158'
                                                },
                                                p: 1.25
                                            }}
                                            onClick={() => handleGuardClick(guard)}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <PersonIcon sx={{ mr: 0.75, color: '#ffffff', fontSize: 18 }} />
                                                <Typography sx={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    {guard.name}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', mb: 0.5 }}>
                                                {guard.email}
                                            </Typography>
                                            {guard.phone && (
                                                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', mb: 0.5 }}>
                                                    {guard.phone}
                                                </Typography>
                                            )}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Chip
                                                    label={getStatusText(guard.status)}
                                                    color={getStatusColor(guard.status) as any}
                                                    size="small"
                                                    sx={{ '& .MuiChip-label': { color: '#ffffff', fontWeight: 600 } }}
                                                />
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStatusGuard(guard);
                                                            setNewStatus(guard.status);
                                                            setNewAssignedObject(guard.assignedObject || '');
                                                            setStatusDialogOpen(true);
                                                        }}
                                                        sx={{ color: '#2196F3', backgroundColor: 'rgba(33,150,243,0.12)' }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedGuard(guard);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        sx={{ color: '#F44336', backgroundColor: 'rgba(244,67,54,0.12)' }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        </Card>
                                    ))}
                            </Box>
                        </Box>
                    ))}
                </Box>

                {guards.length === 0 && (
                    <Card sx={{
                        background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)',
                        border: '2px solid #D4AF37',
                        borderRadius: 3
                    }}>
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                                Охранники не найдены
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ccc' }}>
                                Добавьте первого охранника для управления безопасностью
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

            {/* Диалог добавления охранника */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Добавить охранника</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Имя"
                        value={newGuard.firstName}
                        onChange={(e) => setNewGuard(prev => ({ ...prev, firstName: e.target.value }))}
                        margin="normal"
                        required
                        sx={textFieldStyles}
                    />
                    <TextField
                        fullWidth
                        label="Фамилия"
                        value={newGuard.lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        margin="normal"
                        required
                        sx={textFieldStyles}
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={newGuard.email}
                        onChange={(e) => setNewGuard(prev => ({ ...prev, email: e.target.value }))}
                        margin="normal"
                        required
                        sx={textFieldStyles}
                    />
                    <TextField
                        fullWidth
                        label="Телефон (необязательно)"
                        value={newGuard.phone}
                        onChange={(e) => setNewGuard(prev => ({ ...prev, phone: e.target.value }))}
                        margin="normal"
                        placeholder="+7 (XXX) XXX-XX-XX"
                        sx={textFieldStyles}
                    />
                    <FormControl fullWidth margin="normal" sx={textFieldStyles}>
                        <InputLabel id="assigned-object-label">Объект охраны</InputLabel>
                        <Select
                            labelId="assigned-object-label"
                            label="Объект охраны"
                            value={newGuard.assignedObject || ''}
                            onChange={(e) => setNewGuard(prev => ({ ...prev, assignedObject: e.target.value }))}
                        >
                            <MenuItem value="">
                                <em>Не назначен</em>
                            </MenuItem>
                            {objects.map((object) => (
                                <MenuItem key={object.id} value={object.id}>
                                    {object.name} - {object.address}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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
                        onClick={handleAddGuard}
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

            {/* Диалог удаления охранника */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Удалить охранника</DialogTitle>
                <DialogContent>
                    <Typography>
                        Вы уверены, что хотите удалить охранника "{selectedGuard?.name}"?
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
                        onClick={handleDeleteGuard}
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
                        Сохраните эти данные для передачи охраннику:
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
                                    sx: { background: 'transparent', fontFamily: 'monospace', p: 0.5, borderRadius: 1, height: 36 }
                                }}
                                variant="outlined"
                                fullWidth
                                sx={textFieldStyles}
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
                                    sx: { background: 'transparent', fontFamily: 'monospace', p: 0.5, borderRadius: 1, height: 36 }
                                }}
                                variant="outlined"
                                fullWidth
                                sx={textFieldStyles}
                            />
                            <IconButton onClick={() => copyToClipboard(createdCredentials.password)}>
                                <ContentCopyIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    {/* В мобильной версии показываем иконки, на десктопе — кнопки */}
                    {isMobile ? (
                        <>
                            <IconButton onClick={sendToWhatsApp} sx={{ color: '#25D366' }} aria-label="Отправить в WhatsApp">
                                <WhatsAppIcon />
                            </IconButton>
                            <IconButton onClick={sendToTelegram} sx={{ color: '#0088cc' }} aria-label="Отправить в Telegram">
                                <TelegramIcon />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <Button onClick={sendToWhatsApp} startIcon={<WhatsAppIcon />} sx={{ backgroundColor: '#25D366', color: 'white', '&:hover': { backgroundColor: '#128C7E' } }}>
                                Отправить в WhatsApp
                            </Button>
                            <Button onClick={sendToTelegram} startIcon={<TelegramIcon />} sx={{ backgroundColor: '#0088cc', color: 'white', '&:hover': { backgroundColor: '#006699' } }}>
                                Отправить в Telegram
                            </Button>
                        </>
                    )}
                    <Button onClick={() => setCredentialsDialogOpen(false)} variant="contained">
                        Закрыть
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог изменения статуса охранника */}
            <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
                <DialogTitle>Изменить данные охранника</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel id="guard-status-label">Статус</InputLabel>
                        <Select
                            labelId="guard-status-label"
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
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="guard-object-label">Объект охраны</InputLabel>
                        <Select
                            labelId="guard-object-label"
                            value={newAssignedObject}
                            label="Объект охраны"
                            onChange={(e) => setNewAssignedObject(e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Не назначен</em>
                            </MenuItem>
                            {objects.map((object) => (
                                <MenuItem key={object.id} value={object.id}>
                                    {object.name} — {object.address}
                                </MenuItem>
                            ))}
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
                            if (statusGuard) {
                                await updateGuardStatus(statusGuard.uid, newStatus as import('../../types').InspectorStatus);
                                // обновляем объект охраны
                                const { doc, updateDoc } = await import('firebase/firestore');
                                const { db } = await import('../../services/firebase');
                                const userRef = doc(db, 'users', statusGuard.uid);
                                await updateDoc(userRef, { assignedObject: newAssignedObject || '' });
                                cacheManager.clearCache('guards');
                                setStatusDialogOpen(false);
                                setStatusGuard(null);
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
                    <Typography>Создаются данные для охранника...</Typography>
                </DialogContent>
            </Dialog>

            {/* Диалог удаления (эффект загрузки) */}
            <Dialog open={!!deletingGuard} PaperProps={{ sx: { background: 'rgba(20,20,40,0.95)', boxShadow: 0 } }}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <CircularProgress color="primary" sx={{ mb: 2 }} />
                    <Typography sx={{ color: 'white' }}>Идет процесс удаления охранника...</Typography>
                </DialogContent>
            </Dialog>

            {/* Диалог загрузки при переходе к деталям охранника */}
            <Dialog open={!!navigatingToGuard} PaperProps={{ sx: { background: 'rgba(20,20,40,0.95)', boxShadow: 0 } }}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <CircularProgress color="primary" sx={{ mb: 2 }} />
                    <Typography sx={{ color: 'white' }}>Загрузка профиля охранника...</Typography>
                </DialogContent>
            </Dialog>

            {/* FAB кнопка для мобильной версии */}
            {isMobile && (
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => setAddDialogOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        backgroundColor: '#D4AF37',
                        '&:hover': {
                            backgroundColor: '#B8941F',
                            transform: 'scale(1.1)'
                        },
                        '&:active': {
                            transform: 'scale(0.95)'
                        },
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)',
                        zIndex: 1000
                    }}
                >
                    <AddIcon sx={{ color: '#fff' }} />
                </Fab>
            )}

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

export default GuardManagement;