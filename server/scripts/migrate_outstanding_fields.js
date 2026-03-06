/**
 * MIGRATION SCRIPT: Unify Outstanding Fields
 * This script ensures all customers have both 'outstanding' and 'outstandingAmount' 
 * synced to the same value to prevent UI inconsistencies.
 */
import { getDatabase } from '../api/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    try {
        const db = await getDatabase();
        const customersCollection = db.collection('customers');

        console.log('🔍 Fetching all customers...');
        const customers = await customersCollection.find({}).toArray();
        console.log(`📊 Found ${customers.length} customers.`);

        let updateCount = 0;
        for (const customer of customers) {
            const outstanding = customer.outstanding || 0;
            const outstandingAmount = customer.outstandingAmount || 0;

            // If they are different or one is missing, sync them
            if (outstanding !== outstandingAmount || customer.outstanding === undefined || customer.outstandingAmount === undefined) {
                const unified = Math.max(outstanding, outstandingAmount);

                await customersCollection.updateOne(
                    { _id: customer._id },
                    {
                        $set: {
                            outstanding: unified,
                            outstandingAmount: unified,
                            updatedAt: new Date()
                        }
                    }
                );
                updateCount++;
            }
        }

        console.log(`✅ Migration complete. Updated ${updateCount} customers.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
