import knex from 'knex';
import config from '../config';
import knexConfig from '../../knexfile';

// Determine which configuration to use based on the environment
const environment = config.nodeEnv || 'development';
const connectionConfig = knexConfig[environment];

// Create the database connection
const db = knex(connectionConfig);

export default db;
