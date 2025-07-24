/**
 * @file: theme.ts
 * @description: Тема Material-UI для проекта Security PWA
 * @dependencies: @mui/material, colors
 * @created: 2025-06-27
 */

import { createTheme } from '@mui/material/styles';
import { colors } from './colors';

export const theme = createTheme({
    palette: {
        primary: {
            main: colors.primary.main,
            light: colors.primary.light,
            dark: colors.primary.dark,
            contrastText: colors.primary.contrast,
        },
        secondary: {
            main: colors.secondary.main,
            light: colors.secondary.light,
            dark: colors.secondary.dark,
            contrastText: colors.secondary.contrast,
        },
        error: {
            main: colors.status.error,
        },
        warning: {
            main: colors.status.warning,
        },
        info: {
            main: colors.status.info,
        },
        success: {
            main: colors.status.success,
        },
        grey: colors.grey,
        text: {
            primary: colors.text.primary,
            secondary: colors.text.secondary,
            disabled: colors.text.disabled,
        },
        background: {
            default: colors.background.primary,
            paper: colors.background.paper,
        },
        divider: colors.border.light,
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
            color: colors.text.primary,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 500,
            color: colors.text.primary,
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 500,
            color: colors.text.primary,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 500,
            color: colors.text.primary,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 500,
            color: colors.text.primary,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 500,
            color: colors.text.primary,
        },
        body1: {
            fontSize: '1rem',
            color: colors.text.primary,
        },
        body2: {
            fontSize: '0.875rem',
            color: colors.text.secondary,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 500,
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: colors.primary.main,
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                },
            },
        },
    },
}); 