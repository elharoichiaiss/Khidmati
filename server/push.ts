import webpush from 'web-push';
import { storage } from './storage';

// VAPID keys should be in environment variables ideally
// Generated for initial setup as requested:
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEzZnbKkh2rln_rr89JiNKhAoMQyROEskGpX5CGk62v6uFZKTBghSrrDJwzLP-2HBRdKj3Hhq5I9uINjRyApXVg';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'JJGZ-5UdvSMgjBQL4qkOE3BFG91e7JZtmRuFhqlMa2s';

webpush.setVapidDetails(
    'mailto:support@khidmati.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

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

// Log keys on first import if not set in env (per user request)
if (!process.env.VAPID_PUBLIC_KEY) {
    console.log('--- VAPID KEYS GENERATED ---');
    console.log('PUBLIC_KEY:', VAPID_PUBLIC_KEY);
    console.log('PRIVATE_KEY:', VAPID_PRIVATE_KEY);
    console.log('----------------------------');
}
