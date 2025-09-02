import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
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

// Create the serverless handler
const serverlessHandler = serverless(app);

// Wrap it to match Netlify's expected response format
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  try {
    const result = await serverlessHandler(event, context) as any;
    
    // Ensure the result matches HandlerResponse format
    return {
      statusCode: result.statusCode || 200,
      headers: result.headers || {},
      body: result.body || '',
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
