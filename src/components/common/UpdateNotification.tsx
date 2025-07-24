import React from 'react';
import './UpdateNotification.module.css';

interface UpdateNotificationProps {
    onUpdate: () => void;
    onDismiss: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate, onDismiss }) => {
    return (
        <div className="update-notification">
            <div className="update-content">
                <div className="update-icon">🔄</div>
                <div className="update-text">
                    <h3>Доступно обновление</h3>
                    <p>Новая версия приложения готова к установке</p>
                </div>
                <div className="update-actions">
                    <button className="update-btn" onClick={onUpdate}>
                        Обновить
                    </button>
                    <button className="dismiss-btn" onClick={onDismiss}>
                        Позже
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateNotification; 