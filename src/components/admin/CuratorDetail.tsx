/**
 * @file: CuratorDetail.tsx
 * @description: Компонент для отображения детальной страницы куратора с картой и списком объектов
 * @dependencies: react, material-ui, yandex maps, objects service
 * @created: 2025-06-27
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Alert,
    Snackbar,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    FormControlLabel,
    GlobalStyles,
    CircularProgress,
    TextField,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    LocationOn as LocationIcon,
    Security as SecurityIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    WhatsApp as WhatsAppIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    ContentCopy as ContentCopyIcon,
    Telegram as TelegramIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { Curator, ObjectData } from '../../types';
import { getCurators, getCuratorCredentials, updateCuratorCredentials } from '../../services/auth';
import { getObjects } from '../../services/objects';
import YandexMap from '../maps/YandexMap';
import AdminMobileHeader from '../common/AdminMobileHeader';
import { colors } from '../../utils/colors';

const CuratorDetail = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { curatorId } = useParams<{ curatorId: string }>();
    const [curator, setCurator] = useState<Curator | null>(null);
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [curatorObjects, setCuratorObjects] = useState<ObjectData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editAssignedObjects, setEditAssignedObjects] = useState<string[]>([]);
    const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [objectToDelete, setObjectToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Состояния для управления логином и паролем
    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
    const [isEditingCredentials, setIsEditingCredentials] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [curatorCredentials, setCuratorCredentials] = useState({
        email: '',
        password: '••••••••'
    });
    const [editedCredentials, setEditedCredentials] = useState({
        email: '',
        password: ''
    });
    const [loadingCredentials, setLoadingCredentials] = useState(false);
    const [allCurators, setAllCurators] = useState<Curator[]>([]);

    const khabarovskCenter: [number, number] = [48.4827, 135.0840];

    useEffect(() => {
        if (curatorId) {
            loadCuratorData();
        }
    }, [curatorId]);

    const loadCuratorData = async () => {
        try {
            setLoading(true);
            const [curatorsData, objectsData] = await Promise.all([
                getCurators(),
                getObjects()
            ]);

            const foundCurator = curatorsData.find(c => c.uid === curatorId);
            if (!foundCurator) {
                setError('Куратор не найден');
                return;
            }

            setCurator(foundCurator);
            setAllCurators(curatorsData);
            setObjects(objectsData);

            // Фильтруем объекты куратора
            const curatorObjectsData = objectsData.filter(obj =>
                foundCurator.assignedObjects.includes(obj.id)
            );
            setCuratorObjects(curatorObjectsData);

            // Загружаем учетные данные куратора
            await loadCuratorCredentials(foundCurator);
        } catch (err) {
            console.error('Ошибка загрузки данных куратора:', err);
            setError('Ошибка при загрузке данных');
            showSnackbar('Ошибка при загрузке данных', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadCuratorCredentials = async (curatorData: Curator) => {
        try {
            setLoadingCredentials(true);

            // Загружаем учетные данные из базы
            const credentials = await getCuratorCredentials(curatorData.uid);

            if (credentials) {
                setCuratorCredentials({
                    email: credentials.email,
                    password: credentials.password
                });

                setEditedCredentials({
                    email: credentials.email,
                    password: credentials.password
                });
            } else {
                // Fallback на данные куратора
                setCuratorCredentials({
                    email: curatorData.email || '',
                    password: '••••••••'
                });

                setEditedCredentials({
                    email: curatorData.email || '',
                    password: ''
                });
            }

        } catch (error) {
            console.error('Ошибка загрузки учетных данных:', error);
            showSnackbar('Ошибка при загрузке учетных данных', 'error');

            // Fallback на данные куратора при ошибке
            setCuratorCredentials({
                email: curatorData.email || '',
                password: '••••••••'
            });
        } finally {
            setLoadingCredentials(false);
        }
    };



    const handleObjectClick = (objectId: string) => {
        setSelectedObjectId(objectId);
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    // Функции для работы с учетными данными
    const generatePassword = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleEditCredentials = () => {
        setEditedCredentials({
            email: curatorCredentials.email,
            password: ''
        });
        setIsEditingCredentials(true);
    };

    const handleSaveCredentials = async () => {
        try {
            if (!editedCredentials.email || !editedCredentials.password) {
                showSnackbar('Заполните все поля', 'error');
                return;
            }

            if (!curator?.uid) {
                showSnackbar('Ошибка: куратор не найден', 'error');
                return;
            }

            // Обновляем учетные данные в базе
            await updateCuratorCredentials(
                curator.uid,
                editedCredentials.email,
                editedCredentials.password
            );

            // Обновляем локальное состояние
            setCuratorCredentials({
                email: editedCredentials.email,
                password: editedCredentials.password
            });

            setIsEditingCredentials(false);
            showSnackbar('Учетные данные обновлены в базе данных', 'success');
        } catch (error) {
            console.error('Ошибка обновления учетных данных:', error);
            showSnackbar('Ошибка при обновлении учетных данных в базе', 'error');
        }
    };

    const handleCancelEdit = () => {
        setIsEditingCredentials(false);
        setEditedCredentials({
            email: curatorCredentials.email,
            password: ''
        });
    };

    const handleGeneratePassword = () => {
        const newPassword = generatePassword();
        setEditedCredentials(prev => ({ ...prev, password: newPassword }));
    };

    const handleSendViaWhatsApp = () => {
        const message = `Добрый день! Ваши учетные данные для входа в систему:\n\nЛогин: ${curatorCredentials.email}\nПароль: ${curatorCredentials.password}\n\nС уважением, администрация ЧОО "ВИТЯЗЬ"`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSendViaTelegram = () => {
        const message = `🔐 Учетные данные для входа в систему:\n\n👤 Куратор: ${curator?.name}\n📧 Email: ${curatorCredentials.email}\n🔑 Пароль: ${curatorCredentials.password === '••••••••' ? 'Скрыт' : curatorCredentials.password}\n\n🌐 Ссылка для входа: ${window.location.origin}`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodedMessage}`, '_blank');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar('Скопировано в буфер обмена', 'success');
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

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Загрузка данных куратора...</Typography>
            </Box>
        );
    }

    if (error || !curator) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error || 'Куратор не найден'}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0A2463 0%, #000 100%)',
            pb: isMobile ? 8 : 3 // Отступ снизу для мобильных устройств
        }}>
            {/* Убираем встроенную шапку - она теперь в App.tsx */}
            <Box sx={{
                p: 3,
                pt: isMobile ? 8 : 16, // Отступ сверху для компенсации высоты шапки
                pb: isMobile ? 1 : 3
            }}>

                {/* Заголовок страницы */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 3 }}>
                    <IconButton
                        onClick={() => navigate('/admin/curators')}
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
                    <Typography
                        variant={isMobile ? "h5" : "h4"}
                        component="h1"
                        sx={{
                            color: colors.text.primary,
                            fontWeight: 600,
                            fontSize: isMobile ? '1.25rem' : undefined
                        }}
                    >
                        Профиль куратора
                    </Typography>
                </Box>

                {/* Информация о кураторе */}
                <Box sx={{ mb: 3, p: isMobile ? 2 : 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box>
                        <Typography
                            variant={isMobile ? "h6" : "h5"}
                            component="h2"
                            sx={{
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: isMobile ? '1.2rem' : undefined
                            }}
                        >
                            {curator.name}
                        </Typography>
                        {curator.phone && (
                            <Typography
                                variant="body1"
                                sx={{
                                    color: '#ccc',
                                    fontSize: isMobile ? '0.9rem' : 16
                                }}
                            >
                                {curator.phone}
                            </Typography>
                        )}
                        {curator.createdAt && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: isMobile ? '0.75rem' : 14,
                                    mt: 0.5
                                }}
                            >
                                Профиль создан: {curator.createdAt.toLocaleDateString('ru-RU')}
                            </Typography>
                        )}
                    </Box>
                    <Chip
                        label={getStatusText(curator.status)}
                        color={getStatusColor(curator.status) as any}
                        size={isMobile ? "small" : "medium"}
                        sx={{
                            ml: 'auto',
                            fontSize: isMobile ? '0.7rem' : undefined
                        }}
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
                                    sx={{
                                        backgroundColor: '#4caf50',
                                        '&:hover': { backgroundColor: '#45a049' }
                                    }}
                                >
                                    Сохранить
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<CancelIcon />}
                                    onClick={handleCancelEdit}
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
                                            {curatorCredentials.email || 'Не указан'}
                                        </Typography>
                                        {curatorCredentials.email && (
                                            <IconButton
                                                size="small"
                                                onClick={() => copyToClipboard(curatorCredentials.email)}
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
                                        <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500 }}>
                                            {curatorCredentials.password}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => copyToClipboard(curatorCredentials.password)}
                                            sx={{ color: '#D4AF37' }}
                                        >
                                            <ContentCopyIcon />
                                        </IconButton>
                                    </Box>
                                </>
                            )}
                            <Box sx={{ display: 'flex', gap: isMobile ? 1 : 2, mt: 1 }}>
                                {isMobile ? (
                                    <>
                                        <IconButton
                                            onClick={handleSendViaWhatsApp}
                                            disabled={!curatorCredentials.email || curatorCredentials.password === '••••••••'}
                                            sx={{
                                                backgroundColor: '#25D366',
                                                color: '#ffffff',
                                                '&:hover': { backgroundColor: '#128C7E' },
                                                '&:disabled': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'rgba(255, 255, 255, 0.3)'
                                                }
                                            }}
                                        >
                                            <WhatsAppIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={handleSendViaTelegram}
                                            disabled={!curatorCredentials.email || curatorCredentials.password === '••••••••'}
                                            sx={{
                                                backgroundColor: '#0088cc',
                                                color: '#ffffff',
                                                '&:hover': { backgroundColor: '#006699' },
                                                '&:disabled': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'rgba(255, 255, 255, 0.3)'
                                                }
                                            }}
                                        >
                                            <TelegramIcon />
                                        </IconButton>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="contained"
                                            startIcon={<WhatsAppIcon />}
                                            onClick={handleSendViaWhatsApp}
                                            disabled={!curatorCredentials.email || curatorCredentials.password === '••••••••'}
                                            sx={{
                                                backgroundColor: '#25D366',
                                                '&:hover': { backgroundColor: '#128C7E' },
                                                '&:disabled': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'rgba(255, 255, 255, 0.3)'
                                                }
                                            }}
                                        >
                                            Отправить в WhatsApp
                                        </Button>
                                        <Button
                                            variant="contained"
                                            startIcon={<TelegramIcon />}
                                            onClick={handleSendViaTelegram}
                                            disabled={!curatorCredentials.email || curatorCredentials.password === '••••••••'}
                                            sx={{
                                                backgroundColor: '#0088cc',
                                                '&:hover': { backgroundColor: '#006699' },
                                                '&:disabled': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'rgba(255, 255, 255, 0.3)'
                                                }
                                            }}
                                        >
                                            Отправить в Telegram
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
                <Box sx={{
                    mt: 4,
                    p: isMobile ? 2 : 3,
                    display: 'flex',
                    gap: isMobile ? 2 : 3,
                    height: isMobile ? 'auto' : 'calc(100vh - 120px)',
                    flexDirection: isMobile ? 'column' : 'row'
                }}>
                    {/* Левая панель - список объектов */}
                    <Box sx={{
                        width: isMobile ? '100%' : '40%',
                        minWidth: isMobile ? 'auto' : 300,
                        pr: isMobile ? 0 : 3,
                        display: 'flex',
                        flexDirection: 'column',
                        height: isMobile ? 'auto' : '100%'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography
                                variant={isMobile ? "body1" : "h6"}
                                component="h2"
                                sx={{
                                    fontSize: isMobile ? '1.1rem' : undefined,
                                    fontWeight: isMobile ? 600 : undefined
                                }}
                            >
                                Объекты куратора ({curatorObjects.length})
                            </Typography>
                            <Button
                                variant="outlined"
                                size="small"
                                sx={{ color: '#fff', borderColor: '#D4AF37', background: 'transparent', '&:hover': { background: 'transparent', borderColor: '#FFD700', color: '#fff' } }}
                                onClick={() => { setEditAssignedObjects(curator.assignedObjects); setEditDialogOpen(true); }}
                            >
                                Добавить объекты
                            </Button>
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {curatorObjects.length > 0 ? (
                                curatorObjects.map((obj) => (
                                    <Box
                                        key={obj.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            p: 1,
                                            borderBottom: '1px solid #D4AF37',
                                            background: hoveredObjectId === obj.id ? 'rgba(255, 215, 0, 0.12)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={() => setHoveredObjectId(obj.id)}
                                        onMouseLeave={() => setHoveredObjectId(null)}
                                    >
                                        <SecurityIcon color={hoveredObjectId === obj.id ? 'error' : 'primary'} sx={{ fontSize: hoveredObjectId === obj.id ? 28 : 24, transition: 'all 0.2s' }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    color: '#fff',
                                                    fontWeight: 500,
                                                    fontSize: isMobile ? '0.9rem' : undefined
                                                }}
                                            >
                                                {obj.name}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: '#ccc',
                                                    fontSize: isMobile ? '0.75rem' : undefined
                                                }}
                                            >
                                                {obj.address}
                                            </Typography>
                                        </Box>
                                        <DeleteIcon sx={{ color: '#ff4444', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setObjectToDelete(obj.id); setDeleteDialogOpen(true); }} />
                                    </Box>
                                ))
                            ) : (
                                <Typography sx={{ color: '#ccc', mt: 2 }}>Нет назначенных объектов</Typography>
                            )}
                        </Box>
                    </Box>
                    {/* Правая панель - карта (только для десктопа) */}
                    {!isMobile && (
                        <Box sx={{ flex: 1, minHeight: 400, height: '100%' }}>
                            <YandexMap
                                center={[48.4827, 135.0840]}
                                markers={curatorObjects.filter(obj => Array.isArray(obj.position) && obj.position.length === 2 && obj.position.every(n => typeof n === 'number')).map(obj => ({
                                    id: obj.id,
                                    title: obj.name,
                                    position: obj.position,
                                    status: 'checked',
                                    isSelected: false
                                }))}
                                hoveredObjectId={hoveredObjectId}
                                onMarkerClick={() => { }}
                                height="100%"
                            />
                        </Box>
                    )}
                </Box>
                {/* Диалог выбора объектов */}
                <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Добавить объекты куратору</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Выберите объекты для добавления куратору:
                        </Typography>
                        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {(() => {
                                // Собираем все назначенные объекты
                                const assignedObjectIds = new Set<string>();
                                allCurators.forEach((cur: Curator) => {
                                    if (cur.uid !== curator?.uid) { // Исключаем текущего куратора
                                        cur.assignedObjects.forEach(objectId => {
                                            assignedObjectIds.add(objectId);
                                        });
                                    }
                                });

                                // Фильтруем только свободные объекты
                                const availableObjects = objects.filter(obj =>
                                    !assignedObjectIds.has(obj.id) && obj.status === 'active'
                                );

                                if (availableObjects.length === 0) {
                                    return (
                                        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                                            Все объекты уже назначены другим кураторам
                                        </Typography>
                                    );
                                }

                                return (
                                    <List sx={{ width: '100%' }}>
                                        {availableObjects.map((obj) => (
                                            <ListItem key={obj.id} sx={{ px: 0 }}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={editAssignedObjects.includes(obj.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setEditAssignedObjects(prev => [...prev, obj.id]);
                                                                } else {
                                                                    setEditAssignedObjects(prev => prev.filter(id => id !== obj.id));
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
                        <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
                        <Button onClick={async () => {
                            // обновить объекты куратора через сервис
                            if (curator) {
                                await (await import('../../services/auth')).updateCuratorObjects(curator.uid, editAssignedObjects);

                                // Очищаем кэш кураторов для real-time обновления
                                const { cacheManager } = await import('../../services/cache');
                                cacheManager.clearCache('curators');

                                setEditDialogOpen(false);
                                loadCuratorData();
                            }
                        }} variant="contained">Сохранить</Button>
                    </DialogActions>
                </Dialog>
                {/* Диалог подтверждения удаления */}
                <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                    <DialogTitle>Удалить объект</DialogTitle>
                    <DialogContent>
                        {deleting ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                <CircularProgress size={24} color="error" />
                                <Typography>Объект удаляется...</Typography>
                            </Box>
                        ) : (
                            <Typography>Вы действительно хотите удалить объект из списка куратора?</Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Отмена</Button>
                        <Button color="error" variant="contained" disabled={deleting} onClick={async () => {
                            if (curator && objectToDelete) {
                                setDeleting(true);
                                const newAssigned = curator.assignedObjects.filter(id => id !== objectToDelete);
                                await (await import('../../services/auth')).updateCuratorObjects(curator.uid, newAssigned);

                                // Очищаем кэш кураторов для real-time обновления
                                const { cacheManager } = await import('../../services/cache');
                                cacheManager.clearCache('curators');

                                setDeleting(false);
                                setDeleteDialogOpen(false);
                                setObjectToDelete(null);
                                loadCuratorData();
                            }
                        }}>Удалить</Button>
                    </DialogActions>
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
        </Box>
    );
};

export default CuratorDetail; 