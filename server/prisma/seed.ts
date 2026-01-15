/**
 * Database Seed Script
 * 
 * Seeds the database with initial data including admin user.
 * Admin credentials can be configured via environment variables.
 * 
 * Usage:
 *   npm run prisma:seed
 * 
 * Environment Variables:
 *   ADMIN_EMAIL - Admin email (default: admin@example.com)
 *   ADMIN_PASSWORD - Admin password (default: Admin123!)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger from '../src/libs/logger';

const prisma = new PrismaClient();

/**
 * Password hashing rounds (must match auth.service.ts)
 */
const BCRYPT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Seed admin user
 */
async function seedAdminUser() {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin123!';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (existingAdmin) {
        logger.info({ email: adminEmail }, 'Admin user already exists');
        return existingAdmin;
    }

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);

    const admin = await prisma.user.create({
        data: {
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN',
            emailVerified: true,
        },
    });

    logger.info({ id: admin.id, email: admin.email }, 'Admin user created');
    return admin;
}

/**
 * Seed regular user
 */
async function seedRegularUser() {
    const userEmail = 'user@example.com';
    const userPassword = 'User123!';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: userEmail },
    });

    if (existingUser) {
        logger.info({ email: userEmail }, 'Regular user already exists');
        return existingUser;
    }

    // Create regular user
    const hashedPassword = await hashPassword(userPassword);

    const user = await prisma.user.create({
        data: {
            email: userEmail,
            password: hashedPassword,
            role: 'USER',
            emailVerified: true,
        },
    });

    logger.info({ id: user.id, email: user.email }, 'Regular user created');
    return user;
}

/**
 * Main seed function
 */
async function main() {
    logger.info('Starting database seed...');

    // Seed admin user
    const admin = await seedAdminUser();

    // Seed regular user
    const user = await seedRegularUser();

    // Summary
    console.log('');
    console.log('Database seeded successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('LOGIN CREDENTIALS (Save these!)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('ADMIN:');
    console.log('  Email:    admin@example.com');
    console.log('  Password: Admin123!');
    console.log('  Role:     ADMIN');
    console.log('');
    console.log('USER:');
    console.log('  Email:    user@example.com');
    console.log('  Password: User123!');
    console.log('  Role:     USER');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    logger.info('Database seed completed');
}

main()
    .catch((e) => {
        logger.error(e, 'Seed failed');
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
