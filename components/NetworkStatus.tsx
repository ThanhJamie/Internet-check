import React, { useState, useEffect } from 'react';

const NetworkStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const statusColor = isOnline ? 'bg-green-500' : 'bg-red-500';
    const statusText = isOnline ? 'Online' : 'Offline';

    return (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-light-bg p-2 rounded-full shadow-lg z-10">
            <span className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`}></span>
            <span className="text-sm font-medium text-text-light">{statusText}</span>
        </div>
    );
};

export default NetworkStatus;
