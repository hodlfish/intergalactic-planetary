import { Notification, useGlobalState } from "hooks/useGlobalState";
import { useCallback, useEffect, useState } from "react";

function Notifications() {
    const [notifications, setNotifications] = useGlobalState('notifications');
    const [displayNotifications, setDisplayNotifications] = useState<Notification[]>([]);
    const [expirationDate, setExpirationDate] = useState<number>(0);

    const removeNotification = useCallback((notification: Notification) => {
        setDisplayNotifications([...displayNotifications].filter(n => n !== notification));
    }, [displayNotifications]);

    useEffect(() => {
        const unexpiredNotifications = displayNotifications.filter(notification => notification.expiration > Date.now());
        if (unexpiredNotifications.length < displayNotifications.length) {
            setDisplayNotifications([...unexpiredNotifications]);
        }
        else if (notifications.length > 0) {
            notifications.forEach(notification => {
                unexpiredNotifications.push(notification);
                setTimeout(() => setExpirationDate(notification.expiration), notification.expiration - Date.now());
            });
            setNotifications([]);
            setDisplayNotifications([...unexpiredNotifications]);
        }
    }, [notifications, setNotifications, removeNotification, displayNotifications, expirationDate])

    const getIcon = (level: number) => {
        switch(level){
            case 0:
                return '#ico';
            case 1:
                return '#question-mark';
            default:
                return '#gear';
        }
    }

    return (
        <div id="popup-component" className={(displayNotifications.length === 0 ? 'hidden' : '')}>
            {displayNotifications.map((notification, index) => 
                <div key={index} className="notification" onClick={() => removeNotification(notification)}>
                    <svg className="icon">
                        <use href={getIcon(notification.level)}/>
                    </svg>
                    <div className="message">{notification.message}</div>
                </div>
            )}
        </div>
    );
}

export default Notifications;
