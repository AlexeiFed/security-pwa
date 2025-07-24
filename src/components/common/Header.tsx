/**
 * @file: Header.tsx
 * @description: Компонент заголовка с навигацией и выходом из аккаунта
 * @dependencies: react, material-ui, auth context
 * @created: 2025-06-27
 */

import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    useMediaQuery
} from '@mui/material';
import {
    Logout as LogoutIcon,
    AccountCircle as AccountIcon,
    Person as PersonIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';

interface HeaderProps {
    title: string;
    action?: React.ReactNode;
    hideCompanyName?: boolean;
    hideTitle?: boolean;
    hideUserName?: boolean;
    showProfileMenu?: boolean;
    onProfileClick?: () => void;
    onLogoClick?: () => void;
}

const Header = ({
    title,
    action,
    hideCompanyName = false,
    hideTitle = false,
    hideUserName = false,
    showProfileMenu = false,
    onProfileClick,
    onLogoClick
}: HeaderProps) => {
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const isMobile = useMediaQuery('(max-width:600px)');

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        handleClose();
        try {
            await logout();
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    };

    const handleProfileClick = () => {
        handleClose();
        if (onProfileClick) {
            onProfileClick();
        }
    };

    const getRoleDisplayName = (role: string) => {
        switch (role) {
            case 'admin':
                return 'Администратор';
            case 'inspector':
                return 'Инспектор';
            case 'curator':
                return 'Куратор';
            default:
                return role;
        }
    };

    return (
        <AppBar
            position="static"
            sx={{
                backgroundColor: colors.primary.main,
                boxShadow: 2
            }}
        >
            <Toolbar sx={{ minHeight: { xs: '70px !important', sm: '100px !important' }, px: { xs: 1, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, sm: 3 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 0.5, sm: 0 } }}>
                    <Box
                        component="img"
                        src="/icons/logo-vityaz.png"
                        alt="Логотип Витязь"
                        onClick={onLogoClick}
                        sx={{
                            height: { xs: 50, sm: 80 },
                            width: { xs: 50, sm: 80 },
                            mr: { xs: 0, sm: 1 },
                            borderRadius: 2,
                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.12)',
                            cursor: onLogoClick ? 'pointer' : 'default',
                            transition: 'none',
                            '&:hover': onLogoClick ? {
                                transform: 'scale(1.05)'
                            } : {}
                        }}
                    />
                    {!hideCompanyName && (
                        <Typography
                            variant={isMobile ? 'body1' : 'h6'}
                            component="div"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: 1,
                                color: colors.secondary.main,
                                textShadow: '0 2px 8px rgba(212,175,55,0.18)',
                                mr: { xs: 0, sm: 3 },
                                fontSize: { xs: 14, sm: 20 },
                                textAlign: { xs: 'center', sm: 'left' }
                            }}
                        >
                            ЧОО "ВИТЯЗЬ"
                        </Typography>
                    )}
                </Box>
                {!hideTitle && (
                    <Typography variant={isMobile ? 'body1' : 'h6'} component="div" sx={{ flexGrow: 1, fontSize: { xs: 16, sm: 20 }, textAlign: { xs: 'center', sm: 'left' } }}>
                        {title}
                    </Typography>
                )}
                <Box sx={{ flexGrow: 1 }} />
                {action && <Box sx={{ ml: { xs: 1, sm: 4 } }}>{action}</Box>}
                <Box display="flex" alignItems="center" gap={1} flexDirection={isMobile ? 'column' : 'row'}>
                    {!hideUserName && (
                        <Typography variant="body2" sx={{ color: 'white', fontSize: { xs: 12, sm: 14 } }}>
                            {user?.name}
                        </Typography>
                    )}

                    <IconButton
                        size={isMobile ? 'small' : 'large'}
                        aria-label="аккаунт пользователя"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        onClick={handleMenu}
                        sx={{ color: 'white' }}
                    >
                        {showProfileMenu ? (
                            <SettingsIcon sx={{ width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }} />
                        ) : (
                            <Avatar sx={{ width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, bgcolor: colors.secondary.main }}>
                                {user?.name?.charAt(0) || 'U'}
                            </Avatar>
                        )}
                    </IconButton>

                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                    >
                        <MenuItem disabled>
                            <AccountIcon sx={{ mr: 1 }} />
                            {user?.email}
                        </MenuItem>
                        <MenuItem disabled>
                            <Typography variant="body2" color="text.secondary">
                                {getRoleDisplayName(user?.role || '')}
                            </Typography>
                        </MenuItem>
                        <Divider />
                        {showProfileMenu && (
                            <MenuItem onClick={handleProfileClick}>
                                <AccountIcon sx={{ mr: 1 }} />
                                Профиль
                            </MenuItem>
                        )}
                        <MenuItem onClick={handleLogout}>
                            <LogoutIcon sx={{ mr: 1 }} />
                            Выйти
                        </MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header; 