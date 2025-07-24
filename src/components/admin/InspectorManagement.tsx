import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    IconButton,
    Container,
    CircularProgress
} from '@mui/material';
import {
    People as PeopleIcon,
    SupervisorAccount as SupervisorAccountIcon,
    Security as SecurityIcon,
    Assignment as AssignmentIcon,
    Map as MapIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { colors, hexToRgba } from '../../utils/colors';
import styles from './InspectorManagement.module.css';
import { cacheManager } from '../../services/cache';
import { useAuth } from '../../context/AuthContext';

const InspectorManagement = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [inspectorsCount, setInspectorsCount] = useState(0);
    const [curatorsCount, setCuratorsCount] = useState(0);
    const [objectsCount, setObjectsCount] = useState(0);
    const [tasksCount, setTasksCount] = useState(0);

    // Инициализация кэша данных при загрузке компонента
    useEffect(() => {
        const initializeCache = async () => {
            try {
                setLoading(true);
                console.log('🔄 Инициализация кэша данных для панели администратора...');

                // Загружаем все данные параллельно
                const [inspectors, curators, objects] = await Promise.all([
                    cacheManager.getInspectors(),
                    cacheManager.getCurators(),
                    cacheManager.getObjects()
                ]);

                setInspectorsCount(inspectors.length);
                setCuratorsCount(curators.length);
                setObjectsCount(objects.length);

                console.log('✅ Кэш данных инициализирован:', {
                    inspectors: inspectors.length,
                    curators: curators.length,
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
            <Box sx={{ mt: 8 }}>
                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ p: 3 }}>
                        {/* Заголовок */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 4,
                            background: hexToRgba(colors.background.primary, 0.05),
                            borderRadius: 2,
                            p: 2,
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${colors.border.accent}`
                        }}>
                            <IconButton
                                onClick={() => navigate('/')}
                                sx={{
                                    mr: 2,
                                    color: colors.secondary.main,
                                    backgroundColor: hexToRgba(colors.secondary.main, 0.1),
                                    '&:hover': {
                                        backgroundColor: hexToRgba(colors.secondary.main, 0.2),
                                        transform: 'scale(1.1)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography
                                variant="h3"
                                component="h1"
                                sx={{
                                    color: colors.text.primary,
                                    fontWeight: 700,
                                    textShadow: `0 2px 4px ${hexToRgba(colors.primary.dark, 0.3)}`,
                                    background: `linear-gradient(45deg, ${colors.text.primary}, ${colors.secondary.main})`,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                Панель администратора
                            </Typography>
                        </Box>

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