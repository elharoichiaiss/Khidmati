self.addEventListener('push', function (event) {
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        console.error('Push data not JSON:', e);
        data = { title: 'New Message', body: event.data.text() };
    }

    const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png', // Assuming icon can be used as badge if badge.png missing
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(data.title || 'Notification', options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
