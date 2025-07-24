import React, { useState, useEffect } from 'react';
import { requestNotificationPermission } from '../../services/notifications';

interface NotificationPermissionBannerProps {
    onPermissionGranted?: () => void;
}

const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({ onPermissionGranted }) => {
    const [showBanner, setShowBanner] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

    useEffect(() => {
        checkPermissionStatus();
    }, []);

    const checkPermissionStatus = () => {
        if ('Notification' in window) {
            const status = Notification.permission;
            setPermissionStatus(status);
            // Показываем баннер если разрешения нет (denied или default)
            setShowBanner(status !== 'granted');
        }
    };

    const handleRequestPermission = async () => {
        const result = await requestNotificationPermission();
        if (result.granted) {
            setShowBanner(false);
            setPermissionStatus('granted');
            onPermissionGranted?.();
        } else {
            // Показываем инструкцию по ручной разблокировке
            setShowBanner(true);
            console.log('Разрешения не получены:', result.reason);
        }
    };

    const handleManualUnblock = () => {
        const isDenied = permissionStatus === 'denied';
        const message = isDenied ? `
🔔 Разблокировка уведомлений:

1. Нажмите на значок 🔒 рядом с адресной строкой
2. Выберите "Разрешить" для уведомлений
3. Перезагрузите страницу

Или:
1. Откройте настройки браузера (Ctrl+Shift+Delete)
2. Найдите "Уведомления"
3. Разрешите для этого сайта
4. Перезагрузите страницу

Или:
1. Откройте Chrome Settings
2. Privacy and security → Site Settings → Notifications
3. Найдите этот сайт и разрешите уведомления
        ` : `
🔔 Разрешение уведомлений:

1. Нажмите кнопку "Разрешить" выше
2. Или нажмите на значок 🔒 рядом с адресной строкой
3. Выберите "Разрешить" для уведомлений
        `;

        alert(message);
    };

    if (!showBanner) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ff6b6b',
            color: 'white',
            padding: '12px 16px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
            <div style={{ flex: 1 }}>
                <strong>🔔 Разрешения на уведомления {permissionStatus === 'denied' ? 'заблокированы' : 'не предоставлены'}</strong>
                <br />
                {permissionStatus === 'denied'
                    ? 'Разблокируйте уведомления в настройках браузера для получения важных сообщений'
                    : 'Разрешите уведомления для получения важных сообщений'
                }
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                {permissionStatus !== 'denied' && (
                    <button
                        onClick={handleRequestPermission}
                        style={{
                            backgroundColor: 'white',
                            color: '#ff6b6b',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Разрешить
                    </button>
                )}
                <button
                    onClick={handleManualUnblock}
                    style={{
                        backgroundColor: 'transparent',
                        color: 'white',
                        border: '1px solid white',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    {permissionStatus === 'denied' ? 'Разблокировать' : 'Инструкция'}
                </button>
                <button
                    onClick={() => setShowBanner(false)}
                    style={{
                        backgroundColor: 'transparent',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

export default NotificationPermissionBanner; 