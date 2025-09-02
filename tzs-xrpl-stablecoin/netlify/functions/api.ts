import { Handler } from '@netlify/functions';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import serverless from 'serverless-http';

// Import your existing API routes
import api from '../../backend/src/api';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API routes
app.use('/.netlify/functions/api', api);

// Export the serverless handler
export const handler: Handler = serverless(app);
