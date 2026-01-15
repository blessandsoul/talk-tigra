#!/usr/bin/env node

/**
 * Wait for database to be ready before running migrations
 * This script polls the database connection until it's available
 */

import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const MAX_ATTEMPTS = 30; // 30 attempts
const RETRY_DELAY = 2000; // 2 seconds between attempts

async function waitForDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME,
  };

  console.log('Waiting for database to be ready...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const connection = await createConnection(dbConfig);
      await connection.ping();
      await connection.end();

      console.log('Database is ready!');
      console.log();
      process.exit(0);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        console.error('Database failed to become ready after maximum attempts');
        console.error(`   Error: ${error.message}`);
        console.error();
        console.error('Troubleshooting:');
        console.error('   1. Ensure Docker is running: docker ps');
        console.error('   2. Check if containers are healthy: docker-compose ps');
        console.error('   3. View MySQL logs: docker-compose logs mysql');
        console.error('   4. Restart containers: docker-compose restart');
        process.exit(1);
      }

      process.stdout.write(`   Attempt ${attempt}/${MAX_ATTEMPTS} - Database not ready yet, retrying in ${RETRY_DELAY / 1000}s...\r`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

waitForDatabase();
