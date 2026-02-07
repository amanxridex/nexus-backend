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
    
    // Process payment logic here
    
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