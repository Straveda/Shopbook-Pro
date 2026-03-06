import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

async function debugData() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db();
        const customers = await db.collection('customers').find({}).toArray();
        console.log('Total Customers in DB:', customers.length);
        if (customers.length > 0) {
            console.log('Unique UserIDs in customers collection:', [...new Set(customers.map(c => String(c.userId)))]);
            console.log('Sample Customers:', customers.slice(0, 3).map(c => ({ name: c.name, userId: c.userId })));
        }
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
}

debugData();
