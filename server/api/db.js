// api/db.js
import { MongoClient } from 'mongodb';
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