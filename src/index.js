import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/db.js';
import authRouter from './routes/auth.js';
import bandsRouter from './routes/bands.js';
import songsRouter from './routes/songs.js';
import performancesRouter from './routes/performances.js';
import rehearsalsRouter from './routes/rehearsals.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors());
app.use(express.json());

// API Routes setup
app.use('/api/auth', authRouter);
app.use('/api/bands', bandsRouter);
app.use('/api/songs', songsRouter);
app.use('/api/performances', performancesRouter);
app.use('/api/rehearsals', rehearsalsRouter);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'BandFlow Server is running.' });
});

// Root API route
app.get('/', (req, res) => {
  res.send('Welcome to the BandFlow Backend API.');
});

// Global central error handler middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Startup sequence: Connect to database first, then start listening
async function startServer() {
  try {
    // Initialize MySQL Database (connect, check schema, run DDL if needed)
    await initDatabase();
    
    // Bind server to port
    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`  BandFlow Backend Server is live!      `);
      console.log(`  Listening at http://localhost:${PORT} `);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error('CRITICAL: Server failed to start:', error);
    process.exit(1);
  }
}

startServer();
