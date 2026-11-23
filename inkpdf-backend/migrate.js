import pool from './db.js';

export async function runMigrations() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        plan_type VARCHAR(50) DEFAULT 'free',
        status VARCHAR(50) DEFAULT 'inactive',
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        quantity INT DEFAULT 1,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(queryText);
    console.log('Database tables migrated successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}