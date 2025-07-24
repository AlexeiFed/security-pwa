/**
 * @file: MapPage.tsx
 * @description: Страница с чистой Яндекс.Картой для теста
 * @dependencies: YandexMap
 * @created: 2025-06-29
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import YandexMap from '../maps/YandexMap';
import { colors } from '../../utils/colors';

const MapPage: React.FC = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 2, color: colors.text.primary }}>
                Тестовая карта Яндекс
            </Typography>
            <Box sx={{
                width: '100%',
                height: 500,
                boxShadow: '0 8px 32px 0 rgba(10,36,99,0.37)',
                borderRadius: 6,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
                border: '2px solid #D4AF37'
            }}>
                <YandexMap center={[48.4827, 135.0840]} zoom={12} markers={[]} />
            </Box>
        </Box>
    );
};

export default MapPage; 