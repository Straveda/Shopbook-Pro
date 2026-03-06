// server/scripts/create-user.js
import bcrypt from 'bcryptjs';
import { getCollection, connectDB } from '../api/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function createTestUser(name, email, password) {
    try {
        console.log('🔌 Connecting to database...');
        await connectDB();

        const usersCollection = await getCollection('users');

        // Check if user exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            console.error(`❌ Error: User with email ${email} already exists.`);
            process.exit(1);
        }

        // Hash password
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = {
            name,
            email,
            password: hashedPassword,
            createdAt: new Date(),
        };

        console.log('📝 Inserting user into database...');
        const result = await usersCollection.insertOne(newUser);

        console.log('✅ Success! User created with ID:', result.insertedId);
        console.log('-----------------------------------');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('-----------------------------------');
        console.log('You can now login with these credentials.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating user:', error);
        process.exit(1);
    }
}

// Get arguments from command line
const email = process.argv[2];
const password = process.argv[3] || 'test1234';
const name = process.argv[4] || 'Test User';

if (!email) {
    console.log('Usage: node scripts/create-user.js <email> [password] [name]');
    console.log('Example: node scripts/create-user.js test@example.com password123 "New User"');
    process.exit(1);
}

createTestUser(name, email, password);
