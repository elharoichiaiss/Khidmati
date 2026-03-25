import { useState, useCallback } from 'react';
import { toast } from './use-toast';

const VAPID_PUBLIC_KEY = 'BEzZnbKkh2rln_rr89JiNKhAoMQyROEskGpX5CGk62v6uFZKTBghSrrDJwzLP-2HBRdKj3Hhq5I9uINjRyApXVg';

export function usePush() {
    const [isSubscribing, setIsSubscribing] = useState(false);

    const subscribe = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast({
                title: "غير مدعوم",
                description: "متصفحك لا يدعم الإشعارات.",
                variant: "destructive"
            });
            return;
        }

        try {
            setIsSubscribing(true);

            const registration = await navigator.serviceWorker.ready;

            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }

            // Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Send to backend
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription),
            });

            if (!response.ok) {
                throw new Error('Failed to save subscription on server');
            }

            toast({
                title: "تم الاشتراك! 🎉",
                description: "ستصلك الإشعارات عند وجود رسائل جديدة.",
            });

        } catch (error: any) {
            console.error('Push subscription error:', error);
            toast({
                title: "خطأ في الاشتراك",
                description: error.message || "فشل تفعيل الإشعارات.",
                variant: "destructive"
            });
        } finally {
            setIsSubscribing(false);
        }
    }, []);

    return { subscribe, isSubscribing };
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
