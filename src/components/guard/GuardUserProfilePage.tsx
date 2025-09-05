/**
 * @file: GuardUserProfilePage.tsx
 * @description: Страница профиля охранника с правильной навигацией
 * @dependencies: react, material-ui, Header, GuardProfile
 * @created: 2025-01-23
 */

import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import GuardProfile from './GuardProfile';
import GuardBottomNavigation from './GuardBottomNavigation';

const GuardUserProfilePage: React.FC = () => {
    const navigate = useNavigate();

    const handleNavigate = (page: string) => {
        if (page === 'home') {
            navigate('/guard');
        } else if (page === 'profile') {
            navigate('/guard/profile');
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title="Профиль охранника"
                hideCompanyName={true}
                hideTitle={true}
                hideUserName={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/guard/profile')}
                onLogoClick={() => navigate('/guard')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <GuardProfile />
            </Box>

            {/* Нижняя навигация */}
            <GuardBottomNavigation
                currentPage="profile"
                onNavigate={handleNavigate}
            />
        </Box>
    );
};

export default GuardUserProfilePage;
