/**
 * @file: InspectorProfilePage.tsx
 * @description: Страница профиля инспектора с правильной навигацией
 * @dependencies: react, material-ui, Header, InspectorProfile
 * @created: 2025-07-20
 */

import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import InspectorProfile from './InspectorProfile';
import InspectorBottomNavigation from '../common/BottomNavigation';

const InspectorProfilePage: React.FC = () => {
    const navigate = useNavigate();

    const handleNavigate = (page: string) => {
        if (page === 'home') {
            navigate('/');
        } else if (page === 'profile') {
            navigate('/inspector/profile');
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title="Профиль инспектора"
                hideCompanyName={true}
                hideTitle={true}
                hideUserName={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/inspector/profile')}
                onLogoClick={() => navigate('/')}
            />
            <Box sx={{ flex: 1, overflow: 'auto', pb: 7 }}>
                <InspectorProfile />
            </Box>
            <InspectorBottomNavigation
                currentPage="profile"
                onNavigate={handleNavigate}
            />
        </Box>
    );
};

export default InspectorProfilePage; 