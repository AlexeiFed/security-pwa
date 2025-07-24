/**
 * @file: LoadingIndicator.tsx
 * @description: Компонент индикатора загрузки с анимацией
 * @dependencies: material-ui, colors
 * @created: 2025-07-20
 */

import React from 'react';
import { Box, Typography, CircularProgress, Fade } from '@mui/material';
import { colors } from '../../utils/colors';

interface LoadingIndicatorProps {
    message?: string;
    size?: number;
    showText?: boolean;
    fullScreen?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
    message = 'Загрузка...',
    size = 60,
    showText = true,
    fullScreen = false
}) => {
    const content = (
        <Box sx={{ textAlign: 'center' }}>
            <CircularProgress
                size={size}
                sx={{
                    color: colors.secondary.main,
                    mb: showText ? 2 : 0,
                    '& .MuiCircularProgress-circle': {
                        strokeWidth: 4
                    }
                }}
            />
            {showText && (
                <Fade in={true} timeout={500}>
                    <Typography
                        variant="h6"
                        sx={{
                            color: colors.text.primary,
                            fontWeight: 500
                        }}
                    >
                        {message}
                    </Typography>
                </Fade>
            )}
        </Box>
    );

    if (fullScreen) {
        return (
            <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(10, 36, 99, 0.9)',
                zIndex: 9999,
                backdropFilter: 'blur(4px)'
            }}>
                {content}
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            p: 3
        }}>
            {content}
        </Box>
    );
};

export default LoadingIndicator; 