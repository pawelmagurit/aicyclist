import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Database } from './database';
import { authRoutes } from './routes/auth';
import { activitiesRoutes } from './routes/activities';
import { workoutsRoutes } from './routes/workouts';
import { plansRoutes } from './routes/plans';
import { mcpRoutes } from './routes/mcp';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize database
const db = new Database();

// Routes
app.use('/auth', authRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/mcp', mcpRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.MCP_SERVER_VERSION || '1.0.0'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Coach MCP Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 MCP endpoint: http://localhost:${PORT}/mcp`);
});

export default app;
