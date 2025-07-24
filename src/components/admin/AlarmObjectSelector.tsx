import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography,
    Box,
    Chip,
    TextField,
    InputAdornment
} from '@mui/material';
import { Search, LocationOn, Close } from '@mui/icons-material';
import { getObjects } from '../../services/objects';
import { SecurityObject } from '../../types';

interface AlarmObjectSelectorProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (objectId: string, objectName: string) => void;
}

export const AlarmObjectSelector: React.FC<AlarmObjectSelectorProps> = ({
    open,
    onClose,
    onConfirm
}) => {
    const [objects, setObjects] = useState<SecurityObject[]>([]);
    const [filteredObjects, setFilteredObjects] = useState<SecurityObject[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedObject, setSelectedObject] = useState<SecurityObject | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadObjects();
        }
    }, [open]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredObjects(objects);
        } else {
            const filtered = objects.filter(obj =>
                obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                obj.address.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredObjects(filtered);
        }
    }, [searchTerm, objects]);

    const loadObjects = async () => {
        setLoading(true);
        try {
            const objectsData = await getObjects();
            // Преобразуем ObjectData в SecurityObject
            const securityObjects: SecurityObject[] = objectsData.map(obj => ({
                id: obj.id,
                name: obj.name,
                address: obj.address,
                city: '',
                coordinates: {
                    lat: obj.position[0],
                    lng: obj.position[1]
                },
                type: 'office',
                securityLevel: 'medium',
                status: obj.status,
                description: obj.description
            }));
            setObjects(securityObjects);
            setFilteredObjects(securityObjects);
        } catch (error) {
            console.error('Ошибка загрузки объектов:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleObjectSelect = (object: SecurityObject) => {
        setSelectedObject(object);
    };

    const handleConfirm = () => {
        if (selectedObject) {
            onConfirm(selectedObject.id, selectedObject.name);
            onClose();
        }
    };

    const handleClose = () => {
        setSelectedObject(null);
        setSearchTerm('');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                style: {
                    borderRadius: 16,
                    maxHeight: '80vh'
                }
            }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" color="error">
                        🚨 Выберите объект тревоги
                    </Typography>
                    <IconButton onClick={handleClose} size="small">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box mb={2}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Поиск объектов..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {selectedObject && (
                    <Box mb={2} p={2} bgcolor="error.light" borderRadius={2}>
                        <Typography variant="subtitle1" color="error.contrastText">
                            Выбранный объект:
                        </Typography>
                        <Typography variant="h6" color="error.contrastText">
                            {selectedObject.name}
                        </Typography>
                        <Typography variant="body2" color="error.contrastText">
                            {selectedObject.address}
                        </Typography>
                    </Box>
                )}

                <List>
                    {filteredObjects.map((object) => (
                        <ListItem
                            key={object.id}
                            onClick={() => handleObjectSelect(object)}
                            sx={{
                                border: selectedObject?.id === object.id ? 2 : 1,
                                borderColor: selectedObject?.id === object.id ? 'error.main' : 'divider',
                                borderRadius: 1,
                                mb: 1,
                                cursor: 'pointer',
                                bgcolor: selectedObject?.id === object.id ? 'error.light' : 'transparent',
                                '&:hover': {
                                    bgcolor: 'error.light',
                                    '& .MuiListItemText-primary': {
                                        color: 'error.contrastText'
                                    }
                                }
                            }}
                        >
                            <ListItemText
                                primary={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {object.name}
                                        </Typography>
                                        <Chip
                                            label={object.type}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </Box>
                                }
                                secondary={
                                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                        <LocationOn fontSize="small" color="action" />
                                        <Typography variant="body2" color="text.secondary">
                                            {object.address}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </ListItem>
                    ))}
                </List>

                {filteredObjects.length === 0 && !loading && (
                    <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="text.secondary">
                            Объекты не найдены
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="inherit">
                    Отмена
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color="error"
                    disabled={!selectedObject}
                    sx={{ minWidth: 120 }}
                >
                    Отправить тревогу
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 