require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser'); // ✅ ADDED

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const errorHandler = require('./middleware/errorHandler');
const bookingRoutes = require('./routes/bookingRoutes');
const walletRoutes = require('./routes/walletRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const homeRoutes = require('./routes/homeRoutes');
const gymRoutes = require('./routes/gymRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes'); // ✅ ADDED

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// Chaos Engine V2: Physical Load Shedding & Priority Routing
const { loadShedder } = require('./middleware/loadShedder');
app.use(loadShedder);

// Security middleware
app.use(helmet());
const { globalLimiter } = require('./middleware/rateLimiter');
app.use(globalLimiter);

// CORS - Allow your frontend domain
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:5500',
    'https://reseat.vercel.app',
    'https://your-frontend.vercel.app',
    'https://nexus-app.vercel.app',
    'https://nexus-host-backend.onrender.com'
  ],
  credentials: true, // ✅ IMPORTANT: Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ ADDED: Cookie parser
app.use(cookieParser());

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Nexus Backend'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/homes', homeRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/restaurants', restaurantRoutes);

console.log('✅ Routes loaded: /api/auth, /api/users, /api/tickets, /api/booking, /api/wallet, /api/notifications, /api/homes, /api/gyms, /api/restaurants');

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Global error handler
app.use(errorHandler);

// Global Auto-Cache Refresher Daemon (4 minute interval loops)
const { startContinuousWarmup } = require('./utils/cacheRefresher');

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Nexus Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Begin continuous refresh sequence preventing cache cold drops globally
  if (process.env.NODE_ENV !== 'test') {
      startContinuousWarmup();
  }
});

module.exports = app;