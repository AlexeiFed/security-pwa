/**
 * @file: PerformanceStats.tsx
 * @description: Компонент для отображения статистики производительности
 * @dependencies: material-ui, cache
 * @created: 2025-07-20
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    Typography,
    Chip,
    IconButton,
    Collapse,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Storage as StorageIcon,
    Speed as SpeedIcon,
    Memory as MemoryIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon
} from '@mui/icons-material';
import { cacheManager } from '../../services/cache';
import { colors } from '../../utils/colors';

interface CacheStats {
    objects: {
        count: number;
        age: number;
        isValid: boolean;
    };
    tasks: {
        count: number;
        age: number;
        isValid: boolean;
    };
    curators: {
        count: number;
        age: number;
        isValid: boolean;
    };
    inspectors: {
        count: number;
        age: number;
        isValid: boolean;
    };
}

const PerformanceStats: React.FC = () => {
    const [expanded, setExpanded] = useState(false);
    const [stats, setStats] = useState<CacheStats | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        const updateStats = () => {
            const cacheStats = cacheManager.getCacheStats();
            setStats(cacheStats);
            setLastUpdate(new Date());
        };

        // Обновляем статистику сразу
        updateStats();

        // Обновляем каждые 5 секунд
        const interval = setInterval(updateStats, 5000);

        return () => clearInterval(interval);
    }, []);

    const formatAge = (age: number): string => {
        if (age < 1000) return `${age}мс`;
        if (age < 60000) return `${Math.round(age / 1000)}с`;
        return `${Math.round(age / 60000)}м`;
    };

    const getStatusIcon = (isValid: boolean) => {
        return isValid ? (
            <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
        ) : (
            <WarningIcon sx={{ color: '#FF9800', fontSize: 20 }} />
        );
    };

    const getStatusColor = (isValid: boolean) => {
        return isValid ? '#4CAF50' : '#FF9800';
    };

    if (!stats) {
        return null;
    }

    const totalItems = stats.objects.count + stats.tasks.count + stats.curators.count + stats.inspectors.count;
    const validItems = [
        stats.objects.isValid,
        stats.tasks.isValid,
        stats.curators.isValid,
        stats.inspectors.isValid
    ].filter(Boolean).length;

    return (
        <Card sx={{
            background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
            border: '2px solid #D4AF37',
            borderRadius: 2,
            mb: 2
        }}>
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SpeedIcon sx={{ color: colors.secondary.main }} />
                        <Typography variant="h6" sx={{ color: colors.text.primary }}>
                            Производительность
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            label={`${totalItems} записей`}
                            size="small"
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: colors.text.primary,
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                        />
                        <Chip
                            label={`${validItems}/4 кэшей`}
                            size="small"
                            sx={{
                                backgroundColor: validItems === 4 ? '#4CAF50' : '#FF9800',
                                color: '#ffffff'
                            }}
                        />
                        <IconButton
                            onClick={() => setExpanded(!expanded)}
                            sx={{ color: colors.text.primary }}
                        >
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Box>
                </Box>

                <Collapse in={expanded}>
                    <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

                    <List dense>
                        <ListItem>
                            <ListItemIcon>
                                <StorageIcon sx={{ color: colors.secondary.main }} />
                            </ListItemIcon>
                            <ListItemText
                                primary="Объекты"
                                secondary={`${stats.objects.count} записей, возраст: ${formatAge(stats.objects.age)}`}
                                sx={{
                                    '& .MuiListItemText-primary': { color: colors.text.primary },
                                    '& .MuiListItemText-secondary': { color: 'rgba(255, 255, 255, 0.7)' }
                                }}
                            />
                            {getStatusIcon(stats.objects.isValid)}
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                <MemoryIcon sx={{ color: colors.secondary.main }} />
                            </ListItemIcon>
                            <ListItemText
                                primary="Задания"
                                secondary={`${stats.tasks.count} записей, возраст: ${formatAge(stats.tasks.age)}`}
                                sx={{
                                    '& .MuiListItemText-primary': { color: colors.text.primary },
                                    '& .MuiListItemText-secondary': { color: 'rgba(255, 255, 255, 0.7)' }
                                }}
                            />
                            {getStatusIcon(stats.tasks.isValid)}
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                <StorageIcon sx={{ color: colors.secondary.main }} />
                            </ListItemIcon>
                            <ListItemText
                                primary="Кураторы"
                                secondary={`${stats.curators.count} записей, возраст: ${formatAge(stats.curators.age)}`}
                                sx={{
                                    '& .MuiListItemText-primary': { color: colors.text.primary },
                                    '& .MuiListItemText-secondary': { color: 'rgba(255, 255, 255, 0.7)' }
                                }}
                            />
                            {getStatusIcon(stats.curators.isValid)}
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                <StorageIcon sx={{ color: colors.secondary.main }} />
                            </ListItemIcon>
                            <ListItemText
                                primary="Инспекторы"
                                secondary={`${stats.inspectors.count} записей, возраст: ${formatAge(stats.inspectors.age)}`}
                                sx={{
                                    '& .MuiListItemText-primary': { color: colors.text.primary },
                                    '& .MuiListItemText-secondary': { color: 'rgba(255, 255, 255, 0.7)' }
                                }}
                            />
                            {getStatusIcon(stats.inspectors.isValid)}
                        </ListItem>
                    </List>

                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Обновлено: {lastUpdate.toLocaleTimeString()}
                        </Typography>
                    </Box>
                </Collapse>
            </Box>
        </Card>
    );
};

export default PerformanceStats; 