import webpush from 'web-push';
import { storage } from './storage';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️  VAPID keys not configured. Push notifications will not work. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env');
}

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:support@khidmati.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

export async function sendPushToUser(userId: number, title: string, body: string, url: string = '/') {
    const subscriptions = await storage.getPushSubscriptionsForUser(userId);

    const notifications = subscriptions.map(async (sub) => {
        try {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            await webpush.sendNotification(
                pushConfig,
                JSON.stringify({
                    title,
                    body,
                    url
                })
            );
        } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`Push subscription expired for user ${userId}, deleting...`);
                await storage.deletePushSubscription(sub.id);
            } else {
                console.error(`Error sending push to user ${userId}:`, err);
            }
        }
    });

    await Promise.all(notifications);
}
