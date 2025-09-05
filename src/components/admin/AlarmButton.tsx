/**
 * @file: AlarmButton.tsx
 * @description: Компонент тревожной кнопки для администратора
 * @dependencies: react, material-ui, callDogService, phoneService
 * @created: 2025-08-13
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Phone as PhoneIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { sendAlarmCall, sendTestCall, checkCallDogStatus } from '../../services/callDogService';
import { getAlarmPhoneNumbers } from '../../services/phoneService';
import { ObjectData } from '../../types';

interface AlarmButtonProps {
  objects: ObjectData[];
  onAlarmSent?: (success: boolean, message: string) => void;
}

interface AlarmDialogData {
  objectId: string;
  message: string;
  testMode: boolean;
}

const AlarmButton: React.FC<AlarmButtonProps> = ({ objects, onAlarmSent }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [alarmData, setAlarmData] = useState<AlarmDialogData>({
    objectId: '',
    message: '',
    testMode: false
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneCount, setPhoneCount] = useState<number>(0);

  // Стили для темной темы
  const textFieldStyles = {
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' },
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#ff4444' }
    }
  };

  const handleOpenDialog = async () => {
    setError(null);
    setSuccess(null);
    
    // Получаем количество номеров для обзвона
    try {
      const phones = await getAlarmPhoneNumbers();
      setPhoneCount(phones.length);
    } catch (err) {
      console.error('Ошибка получения номеров телефонов:', err);
      setPhoneCount(0);
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setAlarmData({
      objectId: '',
      message: '',
      testMode: false
    });
    setError(null);
    setSuccess(null);
  };

  const handleSendAlarm = async () => {
    if (!alarmData.objectId) {
      setError('Выберите объект');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedObject = objects.find(obj => obj.id === alarmData.objectId);
      if (!selectedObject) {
        throw new Error('Объект не найден');
      }

      const result = await sendAlarmCall({
        objectName: selectedObject.name,
        objectAddress: selectedObject.address,
        message: alarmData.message || undefined
      });

      if (result.success) {
        setSuccess(`Тревожный вызов отправлен! ID: ${result.callId}`);
        onAlarmSent?.(true, result.message || 'Тревожный вызов отправлен');
        setTimeout(() => {
          handleCloseDialog();
        }, 3000);
      } else {
        setError(result.error || 'Ошибка отправки вызова');
        onAlarmSent?.(false, result.error || 'Ошибка отправки вызова');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка';
      setError(errorMessage);
      onAlarmSent?.(false, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCall = async () => {
    setTestLoading(true);
    setError(null);

    try {
      const result = await sendTestCall('+79242074048', 'Тестовый вызов от системы безопасности');
      
      if (result.success) {
        setSuccess(`Тестовый вызов отправлен! ID: ${result.callId}`);
      } else {
        setError(result.error || 'Ошибка отправки тестового вызова');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки тестового вызова');
    } finally {
      setTestLoading(false);
    }
  };

  const selectedObject = objects.find(obj => obj.id === alarmData.objectId);

  return (
    <>
      {/* Тревожная кнопка */}
      <Tooltip title="Тревожная кнопка - отправить вызов всем пользователям">
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<WarningIcon />}
          onClick={handleOpenDialog}
          sx={{
            backgroundColor: '#d32f2f',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(211, 47, 47, 0.3)',
            '&:hover': {
              backgroundColor: '#b71c1c',
              boxShadow: '0 6px 12px rgba(211, 47, 47, 0.4)',
            }
          }}
        >
          ТРЕВОГА
        </Button>
      </Tooltip>

      {/* Диалог тревоги */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            color: '#fff',
            border: '1px solid #ff4444'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#d32f2f', 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <WarningIcon />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Тревожный вызов
          </Typography>
          <IconButton
            onClick={handleCloseDialog}
            sx={{ color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ padding: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Информация о количестве номеров */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Будет произведен обзвон <strong>{phoneCount}</strong> пользователей
            </Typography>
          </Alert>

          {/* Выбор объекта */}
          <FormControl fullWidth sx={{ mb: 3, ...textFieldStyles }}>
            <InputLabel>Объект *</InputLabel>
            <Select
              value={alarmData.objectId}
              onChange={(e) => setAlarmData(prev => ({ ...prev, objectId: e.target.value }))}
              label="Объект *"
            >
              {objects.map((object) => (
                <MenuItem key={object.id} value={object.id}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {object.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {object.address}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Информация о выбранном объекте */}
          {selectedObject && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Объект:</strong> {selectedObject.name}<br />
                <strong>Адрес:</strong> {selectedObject.address}
              </Typography>
            </Alert>
          )}

          {/* Дополнительное сообщение */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Дополнительное сообщение"
            value={alarmData.message}
            onChange={(e) => setAlarmData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Опишите что произошло (необязательно)"
            sx={textFieldStyles}
          />

          {/* Кнопка тестового вызова */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<PhoneIcon />}
              onClick={handleTestCall}
              disabled={testLoading}
              sx={{
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': {
                  borderColor: '#f57c00',
                  backgroundColor: 'rgba(255, 152, 0, 0.1)'
                }
              }}
            >
              {testLoading ? <CircularProgress size={20} /> : 'Тестовый вызов'}
            </Button>
            <Typography variant="body2" color="text.secondary">
              Отправить тестовый вызов на +79242074048
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ padding: 3, gap: 2 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={loading}
            sx={{ color: '#fff' }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSendAlarm}
            disabled={loading || !alarmData.objectId}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <WarningIcon />}
            sx={{
              backgroundColor: '#d32f2f',
              '&:hover': {
                backgroundColor: '#b71c1c',
              },
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Отправка...' : 'АКТИВИРОВАТЬ ТРЕВОГУ'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AlarmButton;
