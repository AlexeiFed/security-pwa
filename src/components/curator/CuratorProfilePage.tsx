/**
 * @file: CuratorProfilePage.tsx
 * @description: Страница профиля куратора с правильной навигацией
 * @dependencies: react, material-ui, Header, CuratorProfile
 * @created: 2025-07-20
 */

import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import CuratorProfile from './CuratorProfile';

const CuratorProfilePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header
                title="Профиль куратора"
                hideCompanyName={true}
                hideTitle={true}
                hideUserName={true}
                showProfileMenu={true}
                onProfileClick={() => navigate('/curator/profile')}
                onLogoClick={() => navigate('/curator')}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <CuratorProfile />
            </Box>
        </Box>
    );
};

export default CuratorProfilePage; 