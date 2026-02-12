const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Generate unique IDs
const generateBookingId = () => 'NEX' + Date.now().toString(36).toUpperCase();
const generateTicketId = () => 'TKT' + Math.random().toString(36).substr(2, 9).toUpperCase();

// Create Razorpay order
exports.createOrder = async (req, res) => {
    try {
        const { festId, eventName, ticketQty, ticketPrice, attendee } = req.body;
        const userId = req.user.uid; // From Firebase auth middleware

        // Validate max tickets
        if (ticketQty > 2) {
            return res.status(400).json({ error: 'Maximum 2 tickets allowed per user' });
        }

        // Check if user already has tickets for this fest
        const { data: existingBookings, error: checkError } = await supabase
            .from('bookings')
            .select('ticket_quantity')
            .eq('user_id', userId)
            .eq('fest_id', festId)
            .eq('payment_status', 'completed');

        if (checkError) throw checkError;

        const existingQty = existingBookings?.reduce((sum, b) => sum + b.ticket_quantity, 0) || 0;
        if (existingQty + ticketQty > 2) {
            return res.status(400).json({ 
                error: `You already have ${existingQty} ticket(s). Max 2 allowed.` 
            });
        }

        const platformFee = 1;
        const totalAmount = (ticketQty * ticketPrice) + platformFee;

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: totalAmount * 100, // Razorpay expects paise
            currency: 'INR',
            receipt: `booking_${Date.now()}`,
            notes: {
                userId,
                festId,
                eventName
            }
        });

        // Create pending booking
        const bookingId = generateBookingId();
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                booking_id: bookingId,
                user_id: userId,
                fest_id: festId,
                event_name: eventName,
                attendee_name: attendee.name,
                attendee_email: attendee.email,
                attendee_phone: attendee.phone,
                attendee_college: attendee.college || null,
                ticket_quantity: ticketQty,
                ticket_price: ticketPrice,
                platform_fee: platformFee,
                total_amount: totalAmount,
                razorpay_order_id: order.id,
                payment_status: 'pending'
            })
            .select()
            .single();

        if (bookingError) throw bookingError;

        res.json({
            success: true,
            orderId: order.id,
            amount: totalAmount * 100,
            currency: 'INR',
            bookingId: bookingId,
            keyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

// Verify payment and create tickets
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user.uid;

        // Verify signature
        const crypto = require('crypto');
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Get booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('user_id', userId)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Update booking as completed
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                razorpay_payment_id: razorpay_payment_id,
                payment_status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', booking.id);

        if (updateError) throw updateError;

        // Generate tickets with QR codes
        const tickets = [];
        for (let i = 0; i < booking.ticket_quantity; i++) {
            const ticketId = generateTicketId();
            const qrData = JSON.stringify({
                ticketId: ticketId,
                bookingId: booking.booking_id,
                festId: booking.fest_id,
                userId: userId
            });
            
            // Simple base64 QR (you can use a QR library later)
            const qrCode = Buffer.from(qrData).toString('base64');

            const { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .insert({
                    ticket_id: ticketId,
                    booking_id: booking.id,
                    fest_id: booking.fest_id,
                    user_id: userId,
                    attendee_name: booking.attendee_name,
                    qr_code: qrCode
                })
                .select()
                .single();

            if (ticketError) throw ticketError;
            tickets.push(ticket);
        }

        res.json({
            success: true,
            message: 'Payment verified and tickets created',
            bookingId: booking.booking_id,
            tickets: tickets.map(t => ({
                ticketId: t.ticket_id,
                qrCode: t.qr_code
            }))
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

// Get user's tickets
exports.getMyTickets = async (req, res) => {
    try {
        const userId = req.user.uid;

        const { data: tickets, error } = await supabase
            .from('tickets')
            .select(`
                *,
                bookings (
                    event_name,
                    college_name,
                    ticket_price,
                    total_amount,
                    created_at
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            tickets: tickets
        });

    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};