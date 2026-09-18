/**
 * Copies every collection from one MongoDB database to another.
 *
 *   node scripts/copyDatabase.js <source-uri> <target-uri> [--wipe]
 *
 * Written for the move from the workspace's Docker Mongo to Atlas. Re-seeding
 * the target would have produced the same catalogue, because the generators are
 * deterministic, but not the same database: anything done through the app since
 * the last seed only exists in the rows.
 *
 * Deliberately driver-level rather than through the models. Mongoose would
 * re-run `pre('save')` on the way in, which regenerates slugs and re-hashes
 * password hashes as though they were plaintext, and the point of a copy is
 * that the other side is identical.
 */
import { MongoClient } from 'mongodb';

const [source, target] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const wipe = process.argv.includes('--wipe');

if (!source || !target) {
  console.error('usage: node scripts/copyDatabase.js <source-uri> <target-uri> [--wipe]');
  process.exit(1);
}

const hide = (uri) => uri.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@');
const BATCH = 500;

const from = new MongoClient(source, { serverSelectionTimeoutMS: 20000 });
const to = new MongoClient(target, { serverSelectionTimeoutMS: 20000 });

try {
  await from.connect();
  await to.connect();
  const src = from.db();
  const dst = to.db();
  console.log(`  from ${hide(source)}  (${src.databaseName})`);
  console.log(`  to   ${hide(target)}  (${dst.databaseName})`);

  const collections = (await src.listCollections().toArray())
    .filter((c) => c.type !== 'view' && !c.name.startsWith('system.'));

  if (!collections.length) {
    console.error('  the source database is empty, nothing to copy');
    process.exit(1);
  }

  let total = 0;
  for (const { name } of collections) {
    const sourceCol = src.collection(name);
    const targetCol = dst.collection(name);

    const existing = await targetCol.estimatedDocumentCount();
    if (existing && !wipe) {
      console.error(`  ${name}: ${existing} documents already there. Re-run with --wipe to replace.`);
      process.exit(1);
    }
    if (existing) await targetCol.deleteMany({});

    // Batched rather than one insertMany: a seeded catalogue is small, but this
    // should not fall over the first time it is pointed at something that is not.
    let batch = [];
    let copied = 0;
    const cursor = sourceCol.find({});
    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= BATCH) {
        await targetCol.insertMany(batch, { ordered: false });
        copied += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await targetCol.insertMany(batch, { ordered: false });
      copied += batch.length;
    }

    /*
     * Indexes are not carried by the documents, and two of them are load
     * bearing: the 2dsphere on the listing's geo, without which a radius search
     * returns nothing, and the unique pair on an enquiry, without which the same
     * person can open a second thread about one property. The models recreate
     * them on boot, but only after something has asked for them, so copy them
     * now rather than discover it later.
     */
    const indexes = await sourceCol.indexes();
    for (const index of indexes) {
      if (index.name === '_id_') continue;
      const { key, name: indexName, v, ...options } = index;
      await targetCol.createIndex(key, { name: indexName, ...options }).catch((e) => {
        console.warn(`    index ${indexName}: ${e.message.slice(0, 80)}`);
      });
    }

    console.log(`  ${name.padEnd(16)} ${String(copied).padStart(5)} documents, ${indexes.length - 1} indexes`);
    total += copied;
  }

  console.log(`  ${total} documents copied across ${collections.length} collections`);
} finally {
  await from.close().catch(() => {});
  await to.close().catch(() => {});
}
