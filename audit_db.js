import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

async function debugData() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db();

        const collections = ['customers', 'inventory', 'sales', 'credits', 'ledger', 'users'];

        console.log('--- Database Audit ---');
        for (const collName of collections) {
            const coll = db.collection(collName);
            const sample = await coll.findOne({});
            const count = await coll.countDocuments({});

            console.log(`\nCollection: ${collName} (Total: ${count})`);
            if (sample) {
                if (collName === 'users') {
                    console.log(`Sample User ID: ${sample._id} (${typeof sample._id})`);
                } else {
                    console.log(`Sample userId field: ${sample.userId} (${typeof sample.userId})`);
                    if (sample.userId instanceof ObjectId) {
                        console.log('Result: userId is an ObjectId');
                    } else {
                        console.log('Result: userId is a String');
                    }
                }
            } else {
                console.log('Empty collection');
            }
        }
    } catch (error) {
        console.error('Error during audit:', error);
    } finally {
        await client.close();
    }
}

debugData();
