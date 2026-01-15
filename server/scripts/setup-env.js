#!/usr/bin/env node

/**
 * Setup environment file
 * Copies .env.example to .env if .env doesn't exist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const EXAMPLE_ENV_FILE = path.join(ROOT_DIR, '.env.example');

function setupEnv() {
  // Check if .env already exists
  if (fs.existsSync(ENV_FILE)) {
    console.log('✓ .env file already exists');
    return;
  }

  // Check if .env.example exists
  if (!fs.existsSync(EXAMPLE_ENV_FILE)) {
    console.error('✗ .env.example file not found!');
    console.error('  Please create a .env.example file first');
    process.exit(1);
  }

  // Copy .env.example to .env
  try {
    fs.copyFileSync(EXAMPLE_ENV_FILE, ENV_FILE);
    console.log('✓ Created .env file from .env.example');
    console.log('');
    console.log('⚠ IMPORTANT: Please update the following values in .env:');
    console.log('  - DATABASE_URL (replace {{DATABASE_PASSWORD}} and {{DATABASE_NAME}})');
    console.log('  - JWT_SECRET (use a strong secret in production)');
    console.log('  - ADMIN_EMAIL and ADMIN_PASSWORD');
    console.log('');
  } catch (error) {
    console.error('✗ Failed to create .env file:', error.message);
    process.exit(1);
  }
}

setupEnv();
