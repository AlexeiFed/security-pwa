import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    IconButton,
    Container,
    CircularProgress,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    People as PeopleIcon,
    SupervisorAccount as SupervisorAccountIcon,
    Security as SecurityIcon,
    Assignment as AssignmentIcon,
    Map as MapIcon,
    ArrowBack as ArrowBackIcon,
    Shield as ShieldIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { colors, hexToRgba } from '../../utils/colors';
import styles from './InspectorManagement.module.css';
import { cacheManager } from '../../services/cache';
import { useAuth } from '../../context/AuthContext';
import AdminMobileHeader from '../common/AdminMobileHeader';


const InspectorManagement = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [loading, setLoading] = useState(true);
    const [inspectorsCount, setInspectorsCount] = useState(0);
    const [curatorsCount, setCuratorsCount] = useState(0);
    const [guardsCount, setGuardsCount] = useState(0);
    const [objectsCount, setObjectsCount] = useState(0);
    const [tasksCount, setTasksCount] = useState(0);

    // Инициализация кэша данных при загрузке компонента
    useEffect(() => {
        const initializeCache = async () => {
            try {
                setLoading(true);
                console.log('🔄 Инициализация кэша данных для панели администратора...');

                // Загружаем все данные параллельно
                const [inspectors, curators, guards, objects] = await Promise.all([
                    cacheManager.getInspectors(),
                    cacheManager.getCurators(),
                    cacheManager.getGuards(),
                    cacheManager.getObjects()
                ]);

                setInspectorsCount(inspectors.length);
                setCuratorsCount(curators.length);
                setGuardsCount(guards.length);
                setObjectsCount(objects.length);

                console.log('✅ Кэш данных инициализирован:', {
                    inspectors: inspectors.length,
                    curators: curators.length,
                    guards: guards.length,
                    objects: objects.length
                });
            } catch (error) {
                console.error('❌ Ошибка инициализации кэша:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.role === 'admin') {
            initializeCache();
        } else {
            setLoading(false);
        }
    }, [user]);

    const menuItems = [
        {
            title: 'Управление инспекторами',
            description: `Добавление, редактирование и удаление инспекторов (${inspectorsCount})`,
            icon: <PeopleIcon sx={{ fontSize: 48, color: '#ffffff' }} />,
            path: '/admin/inspectors',
        },
        {
            title: 'Управление кураторами',
            description: `Добавление, редактирование и удаление кураторов (${curatorsCount})`,
            icon: <SupervisorAccountIcon sx={{ fontSize: 48, color: '#ffffff' }} />,
            path: '/admin/curators',
        },
        {
            title: 'Управление охранниками',
            description: `Добавление, редактирование и удаление охранников (${guardsCount})`,
            icon: <ShieldIcon sx={{ fontSize: 48, color: '#ffffff' }} />,
            path: '/admin/guards',
        },
        {
            title: 'Управление объектами',
            description: `Добавление и редактирование объектов безопасности (${objectsCount})`,
            icon: <SecurityIcon sx={{ fontSize: 48, color: '#ffffff' }} />,
            path: '/admin/objects',
        },
        {
            title: 'Задания',
            description: 'Создание и управление заданиями для инспекторов',
            icon: <AssignmentIcon sx={{ fontSize: 48, color: '#ffffff' }} />,
            path: '/admin/tasks',
        },
        {
            title: 'Карта',
            description: 'Просмотр объектов и инспекторов на карте',
            icon: <MapIcon sx={{ fontSize: 48, color: '#ffffff' }} />,
            path: '/admin/map',
        }
    ];

    // CSS-переменные для цветов
    const cardVars = {
        '--card-bg': hexToRgba(colors.primary.main, 0.65),
        '--card-bg-hover': hexToRgba(colors.primary.main, 0.85),
        '--accent': colors.secondary.main,
        '--icon-bg': hexToRgba(colors.secondary.main, 0.18),
        '--text-primary': colors.text.primary
    } as React.CSSProperties;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'none',
                position: 'relative',
            }}
        >
            {/* Мобильная шапка */}
            {isMobile && <AdminMobileHeader title="Управление инспекторами" />}

            <Box sx={{ mt: isMobile ? 0 : 8 }}>
                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ p: 3 }}>
                        {/* Сетка меню */}
                        {loading ? (
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minHeight: '400px'
                            }}>
                                <CircularProgress
                                    size={60}
                                    sx={{
                                        color: colors.secondary.main,
                                        '& .MuiCircularProgress-circle': {
                                            strokeWidth: 4
                                        }
                                    }}
                                />
                            </Box>
                        ) : (
                            <Box sx={{
                                display: 'grid',
                                gap: 3,
                                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
                            }}>
                                {menuItems.map((item, index) => (
                                    <div
                                        key={index}
                                        className={styles.card}
                                        style={cardVars}
                                        onClick={() => navigate(item.path)}
                                        tabIndex={0}
                                        role="button"
                                    >
                                        <CardContent sx={{ textAlign: 'center', p: 4, position: 'relative', zIndex: 1 }}>
                                            <Box className={styles.cardIcon}>
                                                {React.cloneElement(item.icon, { sx: { fontSize: 48, color: '#ffffff' } })}
                                            </Box>
                                            <Typography variant="h5" component="h2" className={styles.cardTitle}>
                                                {item.title}
                                            </Typography>
                                            <Typography variant="body1" className={styles.cardDesc}>
                                                {item.description}
                                            </Typography>
                                        </CardContent>
                                    </div>
                                ))}
                            </Box>
                        )}
                    </Box>
                </Container>
            </Box>
        </Box>
    );
};

export default InspectorManagement; 