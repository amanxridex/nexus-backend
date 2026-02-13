const { createClient } = require('@supabase/supabase-js');

// ✅ ADD: Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mock database - replace with real DB
let tickets = [];

// Get all tickets
exports.getTickets = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create ticket (protected route)
exports.createTicket = async (req, res) => {
  try {
    const { event, price, date } = req.body;
    const sellerId = req.user.uid;
    
    const newTicket = {
      id: Date.now().toString(),
      event,
      price,
      date,
      sellerId,
      status: 'available',
      createdAt: new Date()
    };
    
    tickets.push(newTicket);
    
    res.status(201).json({
      success: true,
      ticket: newTicket
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Buy ticket (protected)
exports.buyTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const buyerId = req.user.uid;
    
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    if (ticket.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Ticket not available' });
    }
    
    ticket.status = 'sold';
    ticket.buyerId = buyerId;
    ticket.soldAt = new Date();
    
    res.status(200).json({
      success: true,
      message: 'Ticket purchased successfully',
      ticket
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ FIXED: Get ticket by ticket ID (for QR scanner)
exports.getTicketById = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        console.log('🔍 Fetching ticket:', ticketId);

        const { data: ticket, error } = await supabase
            .from('tickets')
            .select(`
                *,
                bookings:booking_id (
                    attendee_name,
                    attendee_email,
                    attendee_phone
                )
            `)
            .eq('ticket_id', ticketId)
            .single();

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        console.log('✅ Ticket found:', ticket);

        // ✅ Get attendee name from tickets table or bookings
        const attendeeName = ticket.attendee_name 
            || ticket.bookings?.attendee_name 
            || 'Guest';

        res.json({
            ticket_id: ticket.ticket_id,
            attendee_name: attendeeName,
            fest_id: ticket.fest_id,
            status: ticket.status,
            used_at: ticket.used_at,
            booking_id: ticket.booking_id
        });

    } catch (error) {
        console.error('💥 Server error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ✅ FIXED: Mark ticket as used
exports.markTicketUsed = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { used_at, scanned_by } = req.body;
        
        console.log('📝 Marking ticket used:', ticketId, 'by:', scanned_by);
        
        const { data, error } = await supabase
            .from('tickets')
            .update({ 
                used_at: used_at || new Date().toISOString(),
                status: 'used'  // ✅ Change status to used
            })
            .eq('ticket_id', ticketId)
            .select()
            .single();

        if (error) {
            console.error('❌ Update error:', error);
            throw error;
        }

        console.log('✅ Ticket updated:', data);
        res.json({ success: true, ticket: data });

    } catch (error) {
        console.error('💥 Mark used error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ✅ FIXED: Verify ticket
exports.verifyTicket = async (req, res) => {
    try {
        const { ticketId, festId } = req.body;
        
        console.log('🔍 Verifying ticket:', { ticketId, festId });
        
        const { data: ticket, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('ticket_id', ticketId)
            .eq('fest_id', festId)
            .single();

        if (error || !ticket) {
            return res.json({ valid: false, error: 'Ticket not found' });
        }

        if (ticket.used_at) {
            return res.json({ 
                valid: false, 
                error: 'Already used',
                used_at: ticket.used_at 
            });
        }

        res.json({ 
            valid: true, 
            ticket_id: ticket.ticket_id,
            attendee_name: ticket.attendee_name,
            fest_id: ticket.fest_id
        });

    } catch (error) {
        console.error('💥 Verify error:', error);
        res.status(500).json({ error: error.message });
    }
};