/**
 * @file: LoginForm.tsx
 * @description: Компонент формы входа в систему
 * @dependencies: react, material-ui, auth context
 * @created: 2025-06-27
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Alert,
    CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const { login, loading, user } = useAuth();

    // Перенаправление если пользователь уже авторизован
    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await login(email, password);
            // Перенаправление произойдет автоматически через useEffect
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка входа');
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: colors.background.secondary
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    padding: 4,
                    width: '100%',
                    maxWidth: 400
                }}
            >
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Вход в систему
                </Typography>

                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                    Система управления заданиями ЧОО "ВИТЯЗЬ"
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        margin="normal"
                        required
                        autoComplete="email"
                        disabled={loading}
                    />

                    <TextField
                        fullWidth
                        label="Пароль"
                        type="password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        margin="normal"
                        required
                        autoComplete="current-password"
                        disabled={loading}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={!email || !password || loading}
                        sx={{ mt: 3, mb: 2 }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Войти'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default LoginForm; 