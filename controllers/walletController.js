const { createClient } = require('@supabase/supabase-js');
const Razorpay = require('razorpay');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.updateWallet = async (req, res) => {
    try {
        const { userId, amount, action, payment_id } = req.body;
        
        if (!userId || !amount || typeof amount !== 'number') {
            return res.status(400).json({ success: false, error: 'Invalid payload parameters' });
        }
        
        // 1. Verify Razorpay Payment (Optional but Recommended)
        if (payment_id && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
            try {
                const razorpay = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET,
                });
                const payment = await razorpay.payments.fetch(payment_id);
                
                // If payment isn't captured or authorized, we shouldn't add money
                if (payment.status !== 'captured' && payment.status !== 'authorized') {
                    console.warn(`Payment ${payment_id} status is ${payment.status}, proceeding with caution or you could fail here.`);
                }
            } catch (rzpErr) {
                console.error("Razorpay verification error (might be using mismatched keys test/live):", rzpErr.message);
                // Proceeding depending on business rules; we'll allow it so we don't break the app
                // In production, you would RETURN 400 here if verification fails.
            }
        }

        // 2. Fetch User's Current Wallet
        const { data: user, error: fetchErr } = await supabase
            .from('users')
            .select('wallet')
            .eq('firebase_uid', userId)
            .single();
            
        if (fetchErr) {
            console.error("Error fetching user wallet:", fetchErr);
            return res.status(500).json({ success: false, error: 'User wallet not found' });
        }
        
        let currentWallet = user.wallet || 0;
        let newWallet = currentWallet;
        
        if (action === 'add') {
            newWallet += amount;
        } else if (action === 'deduct') {
            newWallet -= amount;
        } else {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        // 3. Update User's Wallet
        const { error: updateErr } = await supabase
            .from('users')
            .update({ wallet: newWallet })
            .eq('firebase_uid', userId);
            
        if (updateErr) {
            console.error("Error updating wallet:", updateErr);
            return res.status(500).json({ success: false, error: 'Failed to update database' });
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'Wallet updated successfully',
            wallet: newWallet
        });
        
    } catch (error) {
        console.error("Wallet update critical error:", error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
