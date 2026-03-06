import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const uri = process.env.MONGODB_URI;

async function auditData() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('shopbook');

        // Find the user with the given email to get their ID
        const user = await db.collection('users').findOne({ email: 'himanshu.londhe2018@gmail.com' });
        if (!user) {
            console.error('User not found');
            return;
        }
        const userIdStr = user._id.toString();
        const userIdObj = user._id;

        console.log(`Audit for User: ${user.email} (${userIdStr})`);

        const query = { userId: { $in: [userIdStr, userIdObj] } };

        const customers = await db.collection('customers').find(query).toArray();
        const ledger = await db.collection('ledger').find(query).toArray();
        const sales = await db.collection('sales').find(query).toArray();

        console.log('\n--- CUSTOMERS ---');
        customers.forEach(c => console.log(`${c.name}: Outstanding=${c.outstanding}, CreditLimit=${c.creditLimit}`));

        console.log('\n--- SALES ---');
        console.log(`Total Sales Docs: ${sales.length}`);
        sales.forEach(s => console.log(`${s.saleNumber}: Total=${s.totalAmount}, Paid=${s.paidAmount}, Status=${s.status}`));

        console.log('\n--- LEDGER ---');
        ledger.forEach(l => console.log(`[${l.type}] ${l.description}: Debit=${l.debit}, Credit=${l.credit}, Date=${l.date}`));

        const totalBilled = ledger.filter(l => l.type === 'Credit' || l.type === 'Debit').reduce((sum, l) => sum + (l.debit || l.credit || 0), 0);
        const totalCollected = ledger.filter(l => l.type === 'Payment').reduce((sum, l) => sum + (l.credit || 0), 0);
        console.log(`\nAggregated from Ledger: Billed=${totalBilled}, Collected=${totalCollected}`);

    } finally {
        await client.close();
    }
}

auditData();
