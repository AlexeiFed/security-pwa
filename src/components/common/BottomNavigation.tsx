/**
 * @file: BottomNavigation.tsx
 * @description: Нижняя навигация для инспектора
 * @dependencies: react, material-ui
 * @created: 2025-07-20
 */

import React from 'react';
import {
    BottomNavigation,
    BottomNavigationAction,
    Paper,
    Box
} from '@mui/material';
import {
    Home as HomeIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon
} from '@mui/icons-material';

interface BottomNavigationProps {
    currentPage: 'home' | 'profile' | 'object';
    onNavigate: (page: string) => void;
    showObject?: boolean;
}

const InspectorBottomNavigation: React.FC<BottomNavigationProps> = ({ currentPage, onNavigate, showObject = false }) => {
    const [value, setValue] = React.useState(currentPage);

    const handleChange = (event: React.SyntheticEvent, newValue: 'home' | 'profile' | 'object') => {
        setValue(newValue);
        onNavigate(newValue);
    };

    return (
        <Paper
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: '#0A2463',
                borderTop: '2px solid #D4AF37'
            }}
            elevation={3}
        >
            <BottomNavigation
                value={value}
                onChange={handleChange}
                sx={{
                    backgroundColor: '#0A2463',
                    '& .MuiBottomNavigationAction-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&.Mui-selected': {
                            color: '#D4AF37',
                            backgroundColor: 'rgba(212, 175, 55, 0.1)',
                            borderRadius: 1,
                            '& .MuiBottomNavigationAction-label': {
                                fontWeight: 'bold'
                            }
                        },
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                }}
            >
                <BottomNavigationAction
                    label="Главная"
                    value="home"
                    icon={<HomeIcon />}
                />
                {(currentPage === 'object' || showObject) && (
                    <BottomNavigationAction
                        label="Объект"
                        value="object"
                        icon={<LocationIcon />}
                    />
                )}
                {currentPage === 'profile' && (
                    <BottomNavigationAction
                        label="Профиль"
                        value="profile"
                        icon={<PersonIcon />}
                    />
                )}
            </BottomNavigation>
        </Paper>
    );
};

export default InspectorBottomNavigation; 