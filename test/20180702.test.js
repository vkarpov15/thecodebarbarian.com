const { MongoClient } = require('mongodb');
const assert = require('assert');

describe('Transactions', function() {
  it('mongodb driver', async function() {
    // Boilerplate: connect to DB
    const { MongoClient } = require('mongodb');
    const uri = 'mongodb://localhost:27017,localhost:27018,localhost:27019/txn';
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, replicaSet: 'rs' });

    const db = client.db();
    await db.dropDatabase();

    // Insert accounts and transfer some money
    await db.collection('Account').insertMany([
      { name: 'A', balance: 5 },
      { name: 'B', balance: 10 }
    ]);

    await transfer('A', 'B', 4); // Success
    try {
      // Fails because then A would have a negative balance
      await transfer('A', 'B', 2);
    } catch (error) {
      error.message; // "Insufficient funds: 1"
      // acquit:ignore:start
      assert.equal(error.message, 'Insufficient funds: 1');
      // acquit:ignore:end
    }
    // acquit:ignore:start
    const accounts = await db.collection('Account').
      find().
      sort({ name: 1 }).
      toArray();
    assert.deepEqual(accounts.map(a => a.balance), [1, 14]);
    client.close();
    // acquit:ignore:end

    // The actual transfer logic
    async function transfer(from, to, amount) {
      const session = client.startSession();
      session.startTransaction();
      try {
        const opts = { session, returnOriginal: false };
        const A = await db.collection('Account').
          findOneAndUpdate({ name: from }, { $inc: { balance: -amount } }, opts).
          then(res => res.value);
        if (A.balance < 0) {
          // If A would have negative balance, fail and abort the transaction
          // `session.abortTransaction()` will undo the above `findOneAndUpdate()`
          throw new Error('Insufficient funds: ' + (A.balance + amount));
        }

        const B = await db.collection('Account').
          findOneAndUpdate({ name: to }, { $inc: { balance: amount } }, opts).
          then(res => res.value);

        await session.commitTransaction();
        session.endSession();
        return { from: A, to: B };
      } catch (error) {
        // If an error occurred, abort the whole transaction and
        // undo any changes that might have happened
        await session.abortTransaction();
        session.endSession();
        throw error; // Rethrow so calling function sees error
      }
    }
  });

  it('mongoose', async function() {
    // Boilerplate: connect to DB
    const mongoose = require('mongoose');
    const uri = 'mongodb://localhost:27017,localhost:27018,localhost:27019/txn';
    await mongoose.connect(uri, { replicaSet: 'rs' });

    await mongoose.connection.dropDatabase();
    const Account = mongoose.model('Account', new mongoose.Schema({
      name: String, balance: Number
    }));

    // Insert accounts and transfer some money
    await Account.create([{ name: 'A', balance: 5 }, { name: 'B', balance: 10 }]);

    await transfer('A', 'B', 4); // Success
    try {
      // Fails because then A would have a negative balance
      await transfer('A', 'B', 2);
    } catch (error) {
      error.message; // "Insufficient funds: 1"
      // acquit:ignore:start
      assert.equal(error.message, 'Insufficient funds: 1');
      // acquit:ignore:end
    }
    // acquit:ignore:start
    const accounts = await Account.find().sort({ name: 1 });
    assert.deepEqual(accounts.map(a => a.balance), [1, 14]);
    await mongoose.disconnect();
    // acquit:ignore:end

    // The actual transfer logic
    async function transfer(from, to, amount) {
      const session = await Account.startSession();
      session.startTransaction();
      try {
        const opts = { session, new: true };
        const A = await Account.
          findOneAndUpdate({ name: from }, { $inc: { balance: -amount } }, opts);
        if (A.balance < 0) {
          // If A would have negative balance, fail and abort the transaction
          // `session.abortTransaction()` will undo the above `findOneAndUpdate()`
          throw new Error('Insufficient funds: ' + (A.balance + amount));
        }

        const B = await Account.
          findOneAndUpdate({ name: to }, { $inc: { balance: amount } }, opts);

        await session.commitTransaction();
        session.endSession();
        return { from: A, to: B };
      } catch (error) {
        // If an error occurred, abort the whole transaction and
        // undo any changes that might have happened
        await session.abortTransaction();
        session.endSession();
        throw error; // Rethrow so calling function sees error
      }
    }
  });

  it('concurrent', async function() {
    const mongoose = require('mongoose');
    // acquit:ignore:start
    const uri = 'mongodb://localhost:27017,localhost:27018,localhost:27019/txn';
    await mongoose.connect(uri, { replicaSet: 'rs' });

    await mongoose.connection.dropDatabase();
    const Account = mongoose.model('Account', new mongoose.Schema({
      name: String, balance: Number
    }));

    // Insert accounts and transfer some money
    await Account.create([{ name: 'A', balance: 5 }, { name: 'B', balance: 10 }]);
    // acquit:ignore:end
    try {
      await Promise.all([
        transfer('A', 'B', 4),
        transfer('A', 'B', 2)
      ]);
    } catch (error) {
      error.message; // "MongoError: WriteConflict"
      // acquit:ignore:start
      assert.equal(error.message, 'WriteConflict');
      // acquit:ignore:end
    }
    // acquit:ignore:start
    await new Promise(resolve => setTimeout(resolve, 50));
    await mongoose.disconnect();
    // The actual transfer logic
    async function transfer(from, to, amount) {
      const session = await Account.startSession();
      session.startTransaction();
      try {
        const opts = { session, new: true };
        const A = await Account.
          findOneAndUpdate({ name: from }, { $inc: { balance: -amount } }, opts);
        if (A.balance < 0) {
          // If A would have negative balance, fail and abort the transaction
          // `session.abortTransaction()` will undo the above `findOneAndUpdate()`
          throw new Error('Insufficient funds: ' + (A.balance + amount));
        }
        const B = await Account.
          findOneAndUpdate({ name: to }, { $inc: { balance: amount } }, opts);

        await session.commitTransaction();
        session.endSession();
        return { from: A, to: B };
      } catch (error) {
        // If an error occurred, abort the whole transaction and
        // undo any changes that might have happened
        await session.abortTransaction();
        session.endSession();
        throw error; // Rethrow so calling function sees error
      }
    }
    // acquit:ignore:end
  });
});
