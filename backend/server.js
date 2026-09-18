import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION, shutting down');
  console.error(err.name, err.message);
  process.exit(1);
});

const PORT = process.env.PORT || 5008;

/*
 * Checked here rather than left to the driver.
 *
 * A connection string that is set but malformed gets you `MongoParseError:
 * Invalid scheme` and nothing else: not which variable, not what it contained,
 * and on a hosting dashboard that is a long way from the paste that caused it.
 * The usual culprits are pasting the whole `KEY=value` line into the value box,
 * wrapping it in quotes, or a trailing newline.
 */
const raw = process.env.DATABASE_URL || process.env.MONGO_URI;
const DB = raw?.trim();

if (!DB) {
  console.error(
    'No database connection string set. Set DATABASE_URL to your MongoDB URI ' +
      '(the Atlas one looks like mongodb+srv://user:password@cluster/dbname).'
  );
  process.exit(1);
}

if (!/^mongodb(\+srv)?:\/\//.test(DB)) {
  // Enough of it to recognise, never enough to leak the password.
  const glimpse = DB.length > 24 ? `${DB.slice(0, 24)}...` : DB;
  console.error(
    'DATABASE_URL must start with mongodb:// or mongodb+srv://, but it starts ' +
      `with: ${glimpse}\n` +
      'Check the value is the URI on its own: no "DATABASE_URL=" prefix, no ' +
      'surrounding quotes, and no line break.'
  );
  process.exit(1);
}

await mongoose.connect(DB);
console.log(`MongoDB connected: ${mongoose.connection.name}`);

const { default: app } = await import('./app.js');

const server = app.listen(PORT, () =>
  console.log(`TafutaKeja API listening on http://localhost:${PORT}`)
);

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION, shutting down');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  server.close(() => console.log('Process terminated'));
});
