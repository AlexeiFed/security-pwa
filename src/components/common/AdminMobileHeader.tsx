/**
 * @file: AdminMobileHeader.tsx
 * @description: Универсальная шапка для админ страниц с гамбургер-меню
 * @dependencies: react, material-ui, auth context
 * @created: 2025-01-23
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import {
    Menu as MenuIcon,
    People as PeopleIcon,
    SupervisorAccount as SupervisorAccountIcon,
    Shield as ShieldIcon,
    Business as BusinessIcon,
    Warning as WarningIcon,
    Notifications as NotificationsIcon,
    AccountCircle as AccountCircleIcon,
    ExitToApp as ExitToAppIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getObjects } from '../../services/objects';
import { ObjectData } from '../../types';
import AlarmButton from '../admin/AlarmButton';

interface AdminMobileHeaderProps {
    title?: string;
}

const AdminMobileHeader: React.FC<AdminMobileHeaderProps> = ({ title = 'Админ панель' }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const navigate = useNavigate();
    const { logout } = useAuth();
    // Responsive настройки не требуются в зафиксированной шапке

    // Загружаем объекты для тревожной кнопки
    useEffect(() => {
        const loadObjects = async () => {
            try {
                const objectsData = await getObjects();
                setObjects(objectsData);
            } catch (error) {
                console.error('Ошибка загрузки объектов:', error);
            }
        };
        loadObjects();
    }, []);

    const menuItems = [
        {
            text: 'Управление заданиями',
            icon: <AssignmentIcon />,
            path: '/admin',
            emoji: '📋'
        },
        {
            text: 'Управление инспекторами',
            icon: <PeopleIcon />,
            path: '/admin/inspectors',
            emoji: '👥'
        },
        {
            text: 'Управление кураторами',
            icon: <SupervisorAccountIcon />,
            path: '/admin/curators',
            emoji: '👨‍💼'
        },
        {
            text: 'Управление охранниками',
            icon: <ShieldIcon />,
            path: '/admin/guards',
            emoji: '🛡️'
        },
        {
            text: 'Управление объектами',
            icon: <BusinessIcon />,
            path: '/admin/objects',
            emoji: '🏢'
        },
        {
            text: 'Журнал тревог',
            icon: <WarningIcon />,
            path: '/admin/alerts',
            emoji: '🚨'
        },
        {
            text: 'Push-уведомления',
            icon: <NotificationsIcon />,
            path: '/admin/push-notifications',
            emoji: '📡'
        }
    ];

    const handleMenuItemClick = (path: string) => {
        navigate(path);
        setDrawerOpen(false);
    };

    const handleLogout = () => {
        logout();
        setDrawerOpen(false);
    };

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    return (
        <>
            <AppBar
                position="fixed"
                sx={{
                    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    zIndex: 9998 // Устанавливаем высокий z-index для AppBar
                }}
            >
                <Toolbar>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <img
                            src="/icons/logo-vityaz-72.png"
                            alt="Логотип Витязь"
                            style={{ height: 32, marginRight: 12 }}
                        />
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            ЧОО "ВИТЯЗЬ"
                        </Typography>
                    </Box>

                    {/* Тревожная кнопка */}
                    <Box sx={{ mr: 2 }}>
                        <AlarmButton 
                            objects={objects}
                            onAlarmSent={(success, message) => {
                                console.log('Тревожный вызов:', success ? 'Успешно' : 'Ошибка', message);
                            }}
                        />
                    </Box>

                    <IconButton
                        edge="end"
                        color="inherit"
                        aria-label="menu"
                        onClick={toggleDrawer}
                        sx={{ ml: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 280,
                        background: 'linear-gradient(180deg, #1e3c72 0%, #2a5298 100%)',
                        color: '#fff',
                        zIndex: 9999, // Устанавливаем очень высокий z-index чтобы drawer был поверх всего
                        top: '64px', // Добавляем отступ сверху чтобы drawer не заезжал под шапку
                        height: 'calc(100vh - 64px)' // Уменьшаем высоту drawer
                    }
                }}
            >
                <Box sx={{ p: 2, textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <img
                        src="/icons/logo-vityaz-72.png"
                        alt="Логотип Витязь"
                        style={{ height: 48, marginBottom: 8 }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                        ЧОО "ВИТЯЗЬ"
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Админ панель
                    </Typography>
                </Box>

                <List sx={{ pt: 1 }}>
                    {menuItems.map((item) => (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                onClick={() => handleMenuItemClick(item.path)}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ color: '#fff', minWidth: 40 }}>
                                    <Typography sx={{ fontSize: '1.2rem' }}>
                                        {item.emoji}
                                    </Typography>
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    sx={{
                                        '& .MuiListItemText-primary': {
                                            color: '#fff',
                                            fontSize: '0.9rem'
                                        }
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}

                    <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => handleMenuItemClick('/admin/profile')}
                            sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: '#fff', minWidth: 40 }}>
                                <AccountCircleIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Профиль"
                                sx={{
                                    '& .MuiListItemText-primary': {
                                        color: '#fff',
                                        fontSize: '0.9rem'
                                    }
                                }}
                            />
                        </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={handleLogout}
                            sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 100, 100, 0.2)'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: '#ff6b6b', minWidth: 40 }}>
                                <ExitToAppIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Выйти"
                                sx={{
                                    '& .MuiListItemText-primary': {
                                        color: '#ff6b6b',
                                        fontSize: '0.9rem'
                                    }
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Drawer>
        </>
    );
};

export default AdminMobileHeader;