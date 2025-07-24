/**
 * @file: App.tsx
 * @description: Главный компонент приложения Security PWA
 * @dependencies: react, react-router-dom, material-ui, auth context
 * @created: 2025-06-27
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box, Typography, Button, Card, Snackbar, IconButton } from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import UserInitialization from './components/admin/UserInitialization';
import Header from './components/common/Header';
import ObjectManagement from './components/admin/ObjectManagement';
import UpdateNotification from './components/common/UpdateNotification';
import NotificationPermissionBanner from './components/common/NotificationPermissionBanner';

import InspectorList from './components/admin/InspectorList';
import AdminInspectorProfile from './components/admin/InspectorProfile';
import TaskManagement from './components/admin/TaskManagement';
import MapPage from './components/admin/MapPage';

import InspectorTasks from './components/inspector/InspectorTasks';
import InspectorTaskDetail from './components/inspector/InspectorTaskDetail';
import InspectorProfile from './components/inspector/InspectorProfile';
import InspectorProfilePage from './components/inspector/InspectorProfilePage';
import InspectorBottomNavigation from './components/common/BottomNavigation';
import CuratorPanel from './components/curator/CuratorPanel';
import CuratorObjectDetail from './components/curator/CuratorObjectDetail';
import CuratorProfilePage from './components/curator/CuratorProfilePage';
import CuratorManagement from './components/admin/CuratorManagement';
import CuratorDetail from './components/admin/CuratorDetail';
import PushNotificationPanel from './components/admin/PushNotificationPanel';
import AdminProfile from './components/admin/AdminProfile';
import { AlarmScreen } from './components/inspector/AlarmScreen';
import ObjectDetailScreen from './components/admin/ObjectDetailScreen';
import GroupsIcon from '@mui/icons-material/Groups';
import ShieldIcon from '@mui/icons-material/Shield';
import ReportIcon from '@mui/icons-material/Report';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { colors, hexToRgba } from './utils/colors';
import { fonts } from './utils/fonts';
import { createAlert, subscribeActiveAlert, resetAlert } from './services/alerts';
import { stopAlarm } from './services/alarmSound';
import { Alert as AlertType } from './types';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
// OneSignal отключен, используется Web Push API
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import { sendAlarmPushToAll } from './services/pushNotifications';
import { authService } from './services/auth';

// Создание темы Material-UI на основе colors.ts (фиксированная светлая тема)
const theme = createTheme({
    palette: {
        mode: 'light', // Явно указываем светлую тему
        primary: {
            main: colors.primary.main,
            light: colors.primary.light,
            dark: colors.primary.dark,
            contrastText: colors.primary.contrast,
        },
        secondary: {
            main: colors.secondary.main,
            light: colors.secondary.light,
            dark: colors.secondary.dark,
            contrastText: colors.secondary.contrast,
        },
        error: {
            main: colors.status.error,
        },
        success: {
            main: colors.status.success,
        },
        warning: {
            main: colors.status.warning,
        },
        info: {
            main: colors.status.info,
        },
        background: {
            default: colors.background.primary,
            paper: colors.background.paper,
        },
        text: {
            primary: colors.text.primary,
            secondary: colors.text.secondary,
            disabled: colors.text.disabled,
        },
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                    border: `2px solid ${colors.secondary.main}`,
                    borderRadius: 24,
                    boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                    transition: 'none',
                    cursor: 'pointer',
                    '&:hover': {
                        transform: 'none',
                        boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                        borderColor: colors.secondary.main,
                        background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                    },
                    '&:active': {
                        transform: 'none',
                        boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                        borderColor: colors.secondary.main,
                        background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                    },
                    '&.noHover:hover': {
                        transform: 'none',
                        boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                        background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                        borderColor: colors.secondary.main,
                    },
                    '&.inspectorCard': {
                        transform: 'none',
                        boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                        background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                        borderColor: colors.secondary.main,
                        '&:hover': {
                            transform: 'none',
                            boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                            background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                            borderColor: colors.secondary.main,
                        },
                        '&:active': {
                            transform: 'none',
                            boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                            background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                            borderColor: colors.secondary.main,
                        },
                    },
                    '&.objectsCard': {
                        background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%) !important',
                        border: '1px solid rgba(255, 255, 255, 0.1) !important',
                        borderRadius: '24px !important',
                        boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37) !important',
                        transition: 'none !important',
                        cursor: 'default !important',
                        '&:hover': {
                            transform: 'none !important',
                            boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37) !important',
                            background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%) !important',
                            border: '1px solid rgba(255, 255, 255, 0.1) !important',
                        },
                        '&:active': {
                            transform: 'none !important',
                        },
                    },
                },
            },
        },
        MuiListItem: {
            styleOverrides: {
                root: {
                    '&.objectItem': {
                        cursor: 'pointer !important',
                        background: 'rgba(255, 255, 255, 0.05) !important',
                        fontSize: 'inherit !important',
                        flexDirection: 'column !important',
                        alignItems: 'flex-start !important',
                        padding: '12px 16px !important',
                        marginBottom: '8px !important',
                        borderRadius: '16px !important',
                        border: '1px solid rgba(255, 255, 255, 0.1) !important',
                        transition: 'none !important',
                        '&:hover': {
                            background: 'rgba(255, 255, 255, 0.08) !important',
                            transform: 'none !important',
                            border: '1px solid rgba(255, 255, 255, 0.15) !important'
                        },
                        '&:active': {
                            background: 'rgba(255, 255, 255, 0.08) !important',
                            transform: 'none !important',
                            border: '1px solid rgba(255, 255, 255, 0.15) !important'
                        },
                        '&:focus': {
                            background: 'rgba(255, 255, 255, 0.08) !important',
                            transform: 'none !important',
                            border: '1px solid rgba(255, 255, 255, 0.15) !important',
                            outline: 'none !important'
                        },
                        '&.selected': {
                            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(59, 130, 246, 0.9) 100%) !important',
                            border: '2px solid rgba(212, 175, 55, 0.8) !important',
                            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4) !important',
                            transform: 'scale(1.02) !important',
                            '&:hover': {
                                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(59, 130, 246, 0.9) 100%) !important',
                                border: '2px solid rgba(212, 175, 55, 1) !important',
                                boxShadow: '0 6px 25px rgba(212, 175, 55, 0.5) !important',
                                transform: 'scale(1.02) !important'
                            },
                            '&:active': {
                                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(59, 130, 246, 0.9) 100%) !important',
                                border: '2px solid rgba(212, 175, 55, 1) !important',
                                boxShadow: '0 6px 25px rgba(212, 175, 55, 0.5) !important',
                                transform: 'scale(1.02) !important'
                            },
                            '&:focus': {
                                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(59, 130, 246, 0.9) 100%) !important',
                                border: '2px solid rgba(212, 175, 55, 1) !important',
                                boxShadow: '0 6px 25px rgba(212, 175, 55, 0.5) !important',
                                transform: 'scale(1.02) !important'
                            }
                        }
                    }
                }
            }
        },
        MuiCardContent: {
            styleOverrides: {
                root: {
                    textAlign: 'center',
                    padding: '2px',
                },
            },
        },
        MuiSvgIcon: {
            styleOverrides: {
                root: {
                    color: colors.secondary.main,
                    transition: 'none',
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    backgroundColor: 'transparent',
                },
                indicator: {
                    backgroundColor: colors.secondary.main,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    color: colors.text.secondary,
                    fontWeight: 600,
                    fontSize: '1rem',
                    transition: 'none !important',
                    boxShadow: 'none !important',
                    transform: 'none !important',
                    '&:hover': {
                        backgroundColor: 'inherit !important',
                        boxShadow: 'none !important',
                        transform: 'none !important',
                    },
                    '&.Mui-selected': {
                        color: colors.secondary.main,
                        backgroundColor: hexToRgba(colors.secondary.main, 0.08),
                        borderRadius: 8,
                        boxShadow: 'none !important',
                        transform: 'none !important',
                    },
                    '&:active': {
                        boxShadow: 'none !important',
                        transform: 'none !important',
                    },
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#ff0000',
                    color: colors.text.primary,
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                select: {
                    backgroundColor: hexToRgba(colors.primary.main, 0.10),
                    color: colors.text.primary,
                },
                icon: {
                    color: colors.secondary.main,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    background: `linear-gradient(135deg, ${hexToRgba(colors.primary.main, 0.92)} 0%, #23243a 100%)`,
                    color: colors.text.primary,
                },
            },
        },
    },
});

// Компонент для защищенных маршрутов
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    console.log('ProtectedRoute:', { user, loading });

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        console.log('Пользователь не авторизован, перенаправление на /login');
        return <Navigate to="/login" replace />;
    }

    console.log('Пользователь авторизован, отображение защищенного контента');
    return <>{children}</>;
};

// Компонент для маршрутов только для администраторов
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

// Временный компонент для главной страницы
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Dashboard = () => {
    const { user, logout } = useAuth();

    return (
        <Box p={3}>
            <Typography variant="h4" component="h1">Добро пожаловать, {user?.email}!</Typography>
            <Typography variant="body1">Роль: {user?.role}</Typography>
            <Button variant="contained" onClick={logout}>Выйти</Button>
        </Box>
    );
};

// Временный компонент для админ панели
const AdminPanel = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeAlert, setActiveAlert] = React.useState<AlertType | null>(null);
    const [showAlarm, setShowAlarm] = React.useState(false);
    const [notificationStatus, setNotificationStatus] = React.useState<string>('Проверка...');

    // Обработчики навигации с useCallback для стабильности
    const handleNavigate = React.useCallback((path: string, title: string) => {
        console.log('🔄 Переход на:', path, title);
        try {
            navigate(path);
            console.log('✅ Переход выполнен');
        } catch (error) {
            console.error('❌ Ошибка перехода:', error);
        }
    }, [navigate]);

    const handleAlarm = async () => {
        try {
            console.log('🚨 Активация тревожного сигнала...');
            setShowAlarm(true);

            // Создаем тревогу в системе
            const alertData = {
                type: 'admin' as const,
                userId: user?.uid || 'system',
                userName: user?.name || 'Администратор',
                objectName: 'Система',
                description: 'Тревога от администратора',
                timestamp: new Date().toISOString()
            };

            await createAlert(alertData);
            console.log('✅ Тревога создана в системе');

            // Отправляем push-уведомления всем пользователям
            console.log('📡 Отправка push-уведомлений...');
            const pushResult = await sendAlarmPushToAll();

            if (pushResult.success) {
                setNotificationStatus(`✅ Тревога активирована! Push-уведомления отправлены ${pushResult.sentCount} пользователям`);
                console.log('✅ Push-уведомления отправлены:', pushResult);
            } else {
                setNotificationStatus(`⚠️ Тревога активирована, но ошибка отправки push: ${pushResult.message}`);
                console.error('❌ Ошибка отправки push-уведомлений:', pushResult);
            }

            setTimeout(() => setNotificationStatus('Готово'), 5000);

        } catch (error) {
            console.error('❌ Ошибка активации тревоги:', error);
            setNotificationStatus('❌ Ошибка активации тревоги');
            setTimeout(() => setNotificationStatus('Готово'), 3000);
        }
    };

    const handleReset = async () => {
        if (activeAlert?.id) await resetAlert();
    };

    React.useEffect(() => {
        if (user) {
            const unsub = subscribeActiveAlert((alert) => {
                setActiveAlert(alert);
                setShowAlarm(!!alert);
            }, user);
            return () => unsub();
        }
    }, [user]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
            {showAlarm && (
                <Box sx={{
                    position: 'fixed',
                    zIndex: 2000,
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    bgcolor: 'rgba(255,0,0,0.8)',
                    animation: 'alarm-blink 1s steps(2, start) infinite',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Typography variant="h3" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
                        ТРЕВОГА!
                    </Typography>
                    <Typography variant="h5" sx={{ color: '#fff', mb: 2, textAlign: 'center' }}>
                        {activeAlert?.type === 'admin' ? 'Тревога от администратора' : activeAlert?.objectName ? `Тревога с объекта: ${activeAlert.objectName}` : 'Тревога от инспектора'}
                    </Typography>
                    {activeAlert?.objectName && (
                        <Typography variant="h6" sx={{ color: '#fff', mb: 1, textAlign: 'center' }}>
                            Объект: {activeAlert.objectName}
                        </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {activeAlert?.objectId && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    stopAlarm();
                                    navigate(`/object/${activeAlert.objectId}`);
                                }}
                                sx={{ fontWeight: 700 }}
                            >
                                Перейти к объекту
                            </Button>
                        )}
                        <Button variant="contained" color="inherit" onClick={handleReset} sx={{ fontWeight: 700 }}>
                            Сбросить тревогу (админ)
                        </Button>
                    </Box>
                </Box>
            )}
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />

            <Box sx={{ display: 'flex', gap: 4, p: 3, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                {[{
                    icon: <GroupsIcon sx={{ fontSize: 32, color: colors.primary.main, mb: 1 }} />, title: 'Управление инспекторами', desc: 'Добавление, редактирование и удаление инспекторов', onClick: () => handleNavigate('/admin/inspectors', 'Управление инспекторами')
                }, {
                    icon: <SupervisorAccountIcon sx={{ fontSize: 32, color: '#1976d2', mb: 1 }} />, title: 'Управление кураторами', desc: 'Добавление, редактирование и удаление кураторов', onClick: () => handleNavigate('/admin/curators', 'Управление кураторами')
                }, {
                    icon: <ShieldIcon sx={{ fontSize: 32, color: colors.status.success, mb: 1 }} />, title: 'Управление объектами', desc: 'Добавление и редактирование объектов безопасности', onClick: () => handleNavigate('/admin/objects', 'Управление объектами')
                }, {
                    icon: <ReportIcon sx={{ fontSize: 32, color: colors.status.error, mb: 1 }} />, title: 'Журнал тревог', desc: 'Просмотр всех тревожных событий', onClick: () => handleNavigate('/admin/alerts', 'Журнал тревог')
                }, {
                    icon: <Box sx={{ fontSize: 32, color: colors.secondary.main, mb: 1 }}>📡</Box>, title: 'Push-уведомления', desc: 'Управление push-уведомлениями и отправка тревожных сигналов', onClick: () => handleNavigate('/admin/push-notifications', 'Push-уведомления')
                }].map((card, idx) => (
                    <Card
                        key={card.title}
                        sx={{
                            minWidth: { xs: 200, sm: 220, md: 240 },
                            maxWidth: { xs: 200, sm: 220, md: 240 },
                            minHeight: { xs: 140, sm: 160, md: 180 },
                            maxHeight: { xs: 140, sm: 160, md: 180 },
                            flex: '1 1 200px',
                            cursor: 'pointer',
                            boxShadow: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            py: 3,
                            px: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 8,
                                background: `linear-gradient(135deg, ${colors.primary.main} 0%, #000 100%)`,
                            },
                            '&:active': {
                                transform: 'translateY(-2px)',
                                boxShadow: 6,
                            },
                        }}
                        onClick={(e) => {
                            console.log('🖱️ Клик по карточке:', card.title);
                            e.preventDefault();
                            e.stopPropagation();
                            card.onClick();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                console.log('⌨️ Нажатие клавиши по карточке:', card.title);
                                card.onClick();
                            }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Перейти к ${card.title}`}
                    >
                        {card.icon}
                        <Typography
                            variant="h6"
                            sx={{
                                fontFamily: fonts.family,
                                fontWeight: fonts.weight.medium,
                                textAlign: 'center',
                                mb: 1,
                                fontSize: '0.9rem',
                            }}
                        >
                            {card.title}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                fontFamily: fonts.family,
                                fontSize: '0.75rem',
                                textAlign: 'center',
                                mb: 2,
                            }}
                        >
                            {card.desc}
                        </Typography>
                    </Card>
                ))}
            </Box>
            <Box sx={{ flex: 1 }}>
                <TaskManagement />
            </Box>
        </Box>
    );
};

// Временный компонент для панели инспектора
const InspectorPanel = () => {
    console.log('Загружена панель инспектора');
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeAlert, setActiveAlert] = React.useState<AlertType | null>(null);
    const [showAlarm, setShowAlarm] = React.useState(false);
    const [alarmDismissed, setAlarmDismissed] = React.useState(false);

    // Загружаем состояние alarmDismissed из localStorage при инициализации
    React.useEffect(() => {
        const savedDismissed = localStorage.getItem('alarmDismissed');
        console.log('🔍 Загружено из localStorage:', savedDismissed);
        if (savedDismissed === 'true') {
            setAlarmDismissed(true);
            console.log('✅ Состояние alarmDismissed установлено в true');
        }
    }, []);

    React.useEffect(() => {
        if (user) {
            const unsub = subscribeActiveAlert((alert) => {
                console.log('🚨 Получена тревога:', alert);
                setActiveAlert(alert);
                setShowAlarm(!!alert);
                // Если тревога сброшена администратором, скрываем все элементы
                if (!alert) {
                    console.log('🔄 Тревога сброшена, очищаем состояние');
                    setAlarmDismissed(false);
                    localStorage.removeItem('alarmDismissed');
                }
            }, user);
            return () => unsub();
        }
    }, [user]);

    const handleDismissAlarm = () => {
        console.log('🔙 Скрытие тревожного экрана (тревога не сбрасывается)');
        setAlarmDismissed(true);
        localStorage.setItem('alarmDismissed', 'true');
        stopAlarm(); // Останавливаем звук тревоги
        console.log('💾 Состояние сохранено в localStorage');
        console.log('🔇 Звук тревоги остановлен');
    };

    const handleNavigate = (page: string) => {
        if (page === 'home') {
            navigate('/');
        } else if (page === 'object' && activeAlert?.objectId) {
            navigate(`/object/${activeAlert.objectId}`);
        }
    };

    console.log('🔍 Состояние компонента:', { activeAlert: !!activeAlert, alarmDismissed, showAlarm });

    // Если тревога сброшена администратором, не показываем ничего
    if (!activeAlert) {
        console.log('📱 Показываем обычный интерфейс (нет активной тревоги)');
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <Header
                    title="Панель инспектора"
                    hideCompanyName={true}
                    hideTitle={true}
                    hideUserName={true}
                    showProfileMenu={true}
                    onProfileClick={() => navigate('/inspector/profile')}
                    onLogoClick={() => navigate('/')}
                />
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <InspectorTasks />
                </Box>
            </Box>
        );
    }

    // Если тревожный экран скрыт, показываем обычный интерфейс с информацией о тревоге
    if (alarmDismissed && activeAlert) {
        console.log('📱 Показываем скрытый интерфейс с красной надписью');
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                {/* Красная надпись с информацией о тревоге */}
                <Box
                    sx={{
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                        p: 2,
                        textAlign: 'center',
                        borderBottom: '2px solid #fff'
                    }}
                >
                    <Typography variant="h6" fontWeight="bold">
                        🚨 АКТИВНАЯ ТРЕВОГА
                    </Typography>
                    <Typography variant="body2">
                        {activeAlert.type === 'admin' ? 'Тревога от администратора' :
                            activeAlert.objectName ? `Тревога с объекта: ${activeAlert.objectName}` :
                                'Тревога от инспектора'}
                    </Typography>
                    {activeAlert.objectName && (
                        <Typography variant="body2">
                            Объект: {activeAlert.objectName}
                        </Typography>
                    )}
                </Box>

                {/* Основной контент */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <InspectorTasks />
                </Box>

                {/* Нижняя навигация */}
                <InspectorBottomNavigation
                    currentPage="home"
                    onNavigate={handleNavigate}
                    showObject={true}
                />
            </Box>
        );
    }

    console.log('📱 Показываем тревожный экран с мерцанием');
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
            {showAlarm && !alarmDismissed && (
                <Box sx={{
                    position: 'fixed',
                    zIndex: 2000,
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    bgcolor: 'rgba(255,0,0,0.8)',
                    animation: 'alarm-blink 1s steps(2, start) infinite',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Typography variant="h3" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
                        ТРЕВОГА!
                    </Typography>
                    <Typography variant="h5" sx={{ color: '#fff', mb: 2, textAlign: 'center' }}>
                        {activeAlert?.type === 'admin' ? 'Тревога от администратора' : activeAlert?.objectName ? `Тревога с объекта: ${activeAlert.objectName}` : 'Тревога от инспектора'}
                    </Typography>
                    {activeAlert?.objectName && (
                        <Typography variant="h6" sx={{ color: '#fff', mb: 1, textAlign: 'center' }}>
                            Объект: {activeAlert.objectName}
                        </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {activeAlert?.objectId && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    stopAlarm();
                                    navigate(`/object/${activeAlert.objectId}`);
                                }}
                                sx={{ fontWeight: 700 }}
                            >
                                Перейти к объекту
                            </Button>
                        )}
                        <Button variant="contained" color="inherit" onClick={handleDismissAlarm} sx={{ fontWeight: 700 }}>
                            Сбросить тревогу
                        </Button>
                    </Box>
                </Box>
            )}
            <Header
                title="Панель инспектора"
                hideCompanyName={true}
                hideTitle={true}
                hideUserName={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/inspector/profile')}
                onLogoClick={() => navigate('/')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <InspectorTasks />
            </Box>
        </Box>
    );
};

const AlertJournalPage = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = React.useState<AlertType[]>([]);

    React.useEffect(() => {
        const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            setAlerts(snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date()
                } as AlertType;
            }));
        });
        return () => unsub();
    }, []);

    const handleResetAlert = async (alertId: string) => {
        try {
            const alertRef = doc(db, 'alerts', alertId);
            await updateDoc(alertRef, { status: 'reset' });
            console.log('Тревога сброшена:', alertId);
        } catch (error) {
            console.error('Ошибка сброса тревоги:', error);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
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
                        Журнал тревог
                    </Typography>
                </Box>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Дата/время</TableCell>
                                <TableCell>Инициатор</TableCell>
                                <TableCell>Тип</TableCell>
                                <TableCell>Объект</TableCell>
                                <TableCell>Статус</TableCell>
                                <TableCell>Действия</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {alerts.map(alert => (
                                <TableRow key={alert.id}>
                                    <TableCell>{alert.createdAt ? new Date(alert.createdAt).toLocaleString('ru-RU') : ''}</TableCell>
                                    <TableCell>{alert.userName}</TableCell>
                                    <TableCell>{alert.type === 'admin' ? 'Администратор' : 'Инспектор'}</TableCell>
                                    <TableCell>{alert.objectName || '-'}</TableCell>
                                    <TableCell>{alert.status === 'active' ? 'Активна' : 'Сброшена'}</TableCell>
                                    <TableCell>
                                        {alert.status === 'active' && (
                                            <IconButton
                                                onClick={() => handleResetAlert(alert.id!)}
                                                color="error"
                                                size="small"
                                                title="Сбросить тревогу"
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

// Компонент для обработки навигации от service worker
const NavigationHandler = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                // Обработка навигации к тревожному экрану
                if (event.data && event.data.type === 'NAVIGATE_TO_ALARM') {
                    const { url, data } = event.data;
                    console.log('🔄 Навигация к тревожному экрану:', url, data);
                    console.log('📍 Текущий URL:', window.location.pathname);

                    // Проверяем, не находимся ли уже на тревожном экране
                    if (window.location.pathname !== url) {
                        console.log('🚀 Выполняем навигацию к:', url);

                        // Используем React Router для навигации
                        try {
                            navigate(url);
                        } catch (error) {
                            console.error('❌ Ошибка навигации через React Router:', error);
                            // Fallback - используем window.location
                            window.location.href = url;
                        }
                    } else {
                        console.log('📍 Уже находимся на тревожном экране');
                    }
                }
            });
        }
    }, [navigate]);

    return null;
};

// Компоненты страниц администратора с единой шапкой
const ObjectsPage = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <ObjectManagement />
            </Box>
        </Box>
    );
};

const CuratorsPage = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <CuratorManagement />
            </Box>
        </Box>
    );
};

const InspectorsPage = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <InspectorList />
            </Box>
        </Box>
    );
};

const AdminInspectorProfilePage = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <AdminInspectorProfile />
            </Box>
        </Box>
    );
};

const TasksPage = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <TaskManagement />
            </Box>
        </Box>
    );
};

const MapPageComponent = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <MapPage />
            </Box>
        </Box>
    );
};

const PushNotificationsPage = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <PushNotificationPanel />
            </Box>
        </Box>
    );
};

const CuratorDetailPage = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title=""
                hideTitle={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/admin/profile')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <CuratorDetail />
            </Box>
        </Box>
    );
};

const AppContent = () => {
    const { user } = useAuth();

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NavigationHandler />
            <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="/init-users" element={<UserInitialization />} />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            {user?.role === 'admin' ? <AdminPanel /> :
                                user?.role === 'curator' ? <CuratorPanel /> :
                                    <InspectorPanel />}
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/inspector/profile"
                    element={
                        <ProtectedRoute>
                            {user?.role === 'inspector' ? <InspectorProfilePage /> : <Navigate to="/" replace />}
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <AdminPanel />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/profile"
                    element={
                        <AdminRoute>
                            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                                <Box sx={{ flex: 1, overflow: 'auto' }}>
                                    <AdminProfile />
                                </Box>
                            </Box>
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/objects"
                    element={
                        <AdminRoute>
                            <ObjectsPage />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/curators"
                    element={
                        <AdminRoute>
                            <CuratorsPage />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/inspectors"
                    element={
                        <AdminRoute>
                            <InspectorsPage />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/inspector/:uid"
                    element={
                        <AdminRoute>
                            <AdminInspectorProfilePage />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/tasks"
                    element={
                        <AdminRoute>
                            <TasksPage />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/map"
                    element={
                        <AdminRoute>
                            <MapPageComponent />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/alerts"
                    element={
                        <AdminRoute>
                            <AlertJournalPage />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/push-notifications"
                    element={
                        <AdminRoute>
                            <PushNotificationsPage />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/curator"
                    element={
                        <ProtectedRoute>
                            {user?.role === 'curator' ? <CuratorPanel /> : <Navigate to="/" replace />}
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/curator/object/:objectId"
                    element={
                        <ProtectedRoute>
                            {user?.role === 'curator' ? <CuratorObjectDetail /> : <Navigate to="/" replace />}
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/curator/profile"
                    element={
                        <ProtectedRoute>
                            {user?.role === 'curator' ? <CuratorProfilePage /> : <Navigate to="/" replace />}
                        </ProtectedRoute>
                    }
                />



                <Route
                    path="/admin/curator/:curatorId"
                    element={
                        <AdminRoute>
                            <CuratorDetailPage />
                        </AdminRoute>
                    }
                />

                {/* Тревожный экран для инспекторов */}
                <Route
                    path="/alarm/:objectId"
                    element={
                        <ProtectedRoute>
                            <AlarmScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/alarm"
                    element={
                        <ProtectedRoute>
                            <AlarmScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/object/:objectId"
                    element={
                        <ProtectedRoute>
                            <ObjectDetailScreen />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
};

// Компонент для инициализации уведомлений (используется внутри AuthProvider)
const NotificationInitializer = () => {
    const { user } = useAuth();

    useEffect(() => {
        // Отключаем OneSignal, так как используем Web Push API
        console.log('🚀 Web Push API используется для push-уведомлений');

        // Проверяем поддержку Service Worker
        if (!('serviceWorker' in navigator)) {
            console.error('❌ Service Worker не поддерживается в этом браузере');
            return;
        }

        // Проверяем поддержку Push API
        if (!('PushManager' in window)) {
            console.error('❌ Push API не поддерживается в этом браузере');
            return;
        }

        // Регистрируем Service Worker для Web Push API
        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('✅ Service Worker зарегистрирован для Web Push API:', registration);
            } catch (error) {
                console.error('❌ Ошибка регистрации Service Worker:', error);
            }
        };

        registerServiceWorker();
    }, []);

    return null;
};

const App = () => {
    const [updateAvailable, setUpdateAvailable] = React.useState(false);

    React.useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
                    setUpdateAvailable(true);
                } else if (event.data && event.data.type === 'FORCE_LOGOUT') {
                    console.log('🚪 Получено сообщение о принудительном выходе:', event.data);

                    // Принудительно выходим из системы
                    const performForceLogout = async () => {
                        try {
                            console.log('🔄 Выполняем принудительный выход...');

                            // Очищаем все данные из localStorage и sessionStorage
                            localStorage.clear();
                            sessionStorage.clear();

                            // Выходим из Firebase Auth
                            await authService.logout();

                            console.log('✅ Принудительный выход выполнен, перенаправляем на /login');

                            // Перенаправляем на страницу входа
                            window.location.href = '/login';
                        } catch (error) {
                            console.error('❌ Ошибка при принудительном выходе:', error);
                            // Fallback - очищаем данные и перезагружаем страницу
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.reload();
                        }
                    };

                    // Выполняем выход немедленно
                    performForceLogout();
                }
            });
        }
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
                <AppContent />
                <NotificationInitializer />
                <NotificationPermissionBanner />

                {/* Баннер о новой версии */}
                <Snackbar
                    open={updateAvailable}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <MuiAlert
                        severity="info"
                        sx={{ width: '100%' }}
                        action={
                            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                                Обновить
                            </Button>
                        }
                    >
                        Доступна новая версия приложения. Обновить?
                    </MuiAlert>
                </Snackbar>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App; 