const { admin } = require('../config/firebase');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Send a notification
 * Expected Body: { firebase_uid: string, title: string, body: string, type: string }
 */
exports.sendNotification = async (req, res, next) => {
    try {
        const { firebase_uid, title, body, type = 'system' } = req.body;

        if (!firebase_uid || !title || !body) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: firebase_uid, title, or body'
            });
        }

        // 1. Log the notification to the user's database inbox
        const { data: insertData, error: insertError } = await supabase
            .from('notifications')
            .insert([{
                firebase_uid,
                title,
                body,
                type
            }])
            .select();

        if (insertError) {
            console.error('Error saving notification to DB:', insertError);
            return res.status(500).json({ success: false, message: 'Failed to save notification to database' });
        }

        // 2. Look up the device token
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('fcm_token')
            .eq('firebase_uid', firebase_uid)
            .single();

        if (userError || !user) {
            // Notification saved, but user not found for push
            return res.status(200).json({
                success: true,
                message: 'Notification saved, but user not found for push alert.'
            });
        }

        // 3. Send physical push via Firebase Admin
        if (user.fcm_token) {
            const message = {
                notification: {
                    title,
                    body
                },
                token: user.fcm_token,
                data: { type } // Optional payload data for the frontend
            };

            try {
                const response = await admin.messaging().send(message);
                console.log('Successfully sent push notification:', response);
                
                return res.status(200).json({
                    success: true,
                    message: 'Notification saved and push sent successfully!',
                    messageId: response
                });
            } catch (fcmError) {
                console.error('FCM Push Error:', fcmError);
                return res.status(200).json({
                    success: true,
                    message: 'Notification saved, but push ping failed due to invalid token or Firebase error.',
                    error: fcmError.message
                });
            }
        }

        // Saved but no token
        return res.status(200).json({
            success: true,
            message: 'Notification saved. User does not have an active FCM token.'
        });

    } catch (error) {
        console.error('Error in sendNotification:', error);
        next(error);
    }
};
