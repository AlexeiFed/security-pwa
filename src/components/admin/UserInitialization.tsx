/**
 * @file: UserInitialization.tsx
 * @description: Компонент для создания тестовых пользователей в Firebase
 * @dependencies: react, material-ui, initUsers
 * @created: 2025-06-27
 */

import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Paper
} from '@mui/material';
import { initializeTestUsers, checkUsersExist } from '../../utils/initUsers';
import { initAllData, initObjects, initTasks } from '../../utils/initFirebaseData';

const UserInitialization = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleInitializeUsers = async () => {
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            await initializeTestUsers();
            setMessage('Тестовые пользователи созданы успешно!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка создания пользователей');
        } finally {
            setLoading(false);
        }
    };

    const handleInitializeObjects = async () => {
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            await initObjects();
            setMessage('Тестовые объекты созданы успешно!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка создания объектов');
        } finally {
            setLoading(false);
        }
    };

    const handleInitializeTasks = async () => {
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            await initTasks();
            setMessage('Тестовые задания созданы успешно!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка создания заданий');
        } finally {
            setLoading(false);
        }
    };

    const handleInitializeAll = async () => {
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            await initAllData();
            setMessage('Все тестовые данные созданы успешно!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка создания данных');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckUsers = async () => {
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const exists = await checkUsersExist();
            if (exists) {
                setMessage('Пользователи уже существуют в системе');
            } else {
                setMessage('Пользователи не найдены. Нажмите "Создать пользователей"');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка проверки пользователей');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={3}>
            <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" component="h2" gutterBottom>
                    Инициализация пользователей
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Создайте тестовых пользователей для работы с системой
                </Typography>

                {message && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {message}
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box display="flex" gap={2} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        onClick={handleCheckUsers}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Проверить пользователей'}
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleInitializeUsers}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Создать пользователей'}
                    </Button>

                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleInitializeObjects}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Создать объекты'}
                    </Button>

                    <Button
                        variant="contained"
                        color="info"
                        onClick={handleInitializeTasks}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Создать задания'}
                    </Button>

                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleInitializeAll}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Создать все данные'}
                    </Button>
                </Box>

                <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                        Тестовые данные:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <Typography component="span" fontWeight="bold">Администратор:</Typography> admin@vityaz.com / admin123456
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <Typography component="span" fontWeight="bold">Инспектор Петров:</Typography> inspector@vityaz.com / inspector123456
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <Typography component="span" fontWeight="bold">Инспектор Сидоров:</Typography> sidorov@vityaz.com / sidorov123456
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <Typography component="span" fontWeight="bold">Инспектор Козлов:</Typography> kozlov@vityaz.com / kozlov123456
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <Typography component="span" fontWeight="bold">Инспектор Морозов:</Typography> morozov@vityaz.com / morozov123456
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default UserInitialization; 