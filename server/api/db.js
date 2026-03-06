// api/db.js
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

export async function connectDB() {
  if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
    console.log('♻️ Using cached MongoDB connection');
    return cachedClient;
  }

  try {
    console.log('🔌 Creating new MongoDB connection...');
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    console.log('🔌 Connecting to MongoDB...');
    await client.connect();

    console.log('🏓 Pinging MongoDB...');
    await client.db('admin').command({ ping: 1 });

    console.log('✅ Connected to MongoDB');
    console.log('📊 Database: shopbook');
    console.log('🌐 Connection successful and responsive');

    cachedClient = client;
    cachedDb = client.db('shopbook');

    return client;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
    throw error; // Don't exit, let the route handle it
  }
}

export async function getDatabase() {
  try {
    if (cachedDb) {
      console.log('♻️ Using cached database');
      return cachedDb;
    }

    console.log('🔌 Getting fresh database connection...');
    const client = await connectDB();
    cachedDb = client.db('shopbook');
    return cachedDb;
  } catch (error) {
    console.error('❌ Failed to get database:', error);
    throw error;
  }
}

export async function getCollection(collectionName) {
  try {
    console.log(`📚 Getting collection: ${collectionName}`);
    const db = await getDatabase();
    return db.collection(collectionName);
  } catch (error) {
    console.error(`❌ Failed to get collection ${collectionName}:`, error);
    throw error;
  }
}

export function isConnected() {
  const connected = cachedClient && cachedClient.topology && cachedClient.topology.isConnected();
  console.log('🔍 Connection check:', connected ? 'Connected' : 'Not connected');
  return connected;
}

/**
 * Generates a query object that filters by the current user.
 * Handles both string and ObjectId types for userId.
 * @param {Object} req - Express request object containing user from auth middleware
 * @param {Object} extraQuery - Additional query parameters
 * @returns {Object} Combined query object
 */
export function getUserQuery(req, extraQuery = {}) {
  const userId = req.user?.userId;
  const filter = { ...extraQuery };

  if (!userId) return filter;

  try {
    // Only try to create ObjectId if it's a valid hex string
    if (ObjectId.isValid(userId)) {
      const userObjectId = new ObjectId(userId);
      filter.userId = { $in: [userId, userObjectId] };
    } else {
      filter.userId = userId;
    }
  } catch (error) {
    console.error('⚠️ getUserQuery error:', error.message);
    filter.userId = userId;
  }

  return filter;
}