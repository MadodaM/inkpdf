import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch'; // Ensure node-fetch is installed or use global fetch (Node 18+)
import pool from './db.js';
import { sendPaymentReceiptEmail, sendPopiaErasureCertificate } from './emailService.js'; // <-- 1. IMPORT EMAIL HELPERS

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Walletdoc Configuration
const WALLETDOC_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.walletdoc.com/v1/payments' 
  : 'https://sandbox.walletdoc.com/v1/payments';

// Middleware Setup
app.use(cors());
app.use(express.json());

/**
 * JWT Authentication Middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

/**
 * Express Middleware: Enforces 24-hour daily operation limits for Free-tier users.
 * Allows Pro subscribers unlimited operations.
 */
async function checkUsageLimit(req, res, next) {
  try {
    const userId = req.user.userId;

    // 1. Check user's current subscription status
    const subResult = await pool.query(
      "SELECT plan_type, status FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    const subscription = subResult.rows[0];
    const isPro = subscription && subscription.status === 'active' && subscription.plan_type.toLowerCase().includes('pro');

    // Pro subscribers bypass usage limits
    if (isPro) {
      req.isPro = true;
      return next();
    }

    // 2. Count operations logged in the past 24 hours for Free users
    const usageResult = await pool.query(
      `SELECT COUNT(*) FROM usage_logs 
       WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    const dailyUsageCount = parseInt(usageResult.rows[0].count, 10);
    const DAILY_LIMIT = 3; // Maximum allowed free daily operations

    if (dailyUsageCount >= DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Daily free-tier limit reached (3 operations per 24 hours). Upgrade to InkPDF Pro for unlimited access.',
        dailyUsageCount,
        dailyLimit: DAILY_LIMIT,
        isQuotaExceeded: true
      });
    }

    req.isPro = false;
    req.remainingQuota = DAILY_LIMIT - dailyUsageCount;
    next();
  } catch (err) {
    console.error('Usage Limit Check Error:', err);
    res.status(500).json({ error: 'Failed to verify usage quota.' });
  }
}

/**
 * Database Migrations
 */
async function runMigrations() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        walletdoc_customer_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        walletdoc_transaction_id VARCHAR(255) UNIQUE,
        plan_type VARCHAR(50) DEFAULT 'InkPDF Free Plan',
        status VARCHAR(50) DEFAULT 'active',
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
    console.log('Database tables migrated successfully (Walletdoc + Quota mode).');
  } catch (err) {
    console.error('Database migration failed:', err);
  }
}

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({
      status: 'success',
      message: 'InkPDF API is running with Walletdoc ZAR gateway and Quota Tracking',
      timestamp: dbResult.rows[0].now,
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
      [email, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'User registered successfully', user, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- USAGE TRACKING & QUOTA ROUTES ---

/**
 * POST /api/usage/log
 * Checks daily limit and records a successful WASM action.
 */
app.post('/api/usage/log', authenticateToken, checkUsageLimit, async (req, res) => {
  const { actionType } = req.body; // 'edit', 'merge', 'sign', 'split', 'compress'
  const userId = req.user.userId;

  if (!actionType) {
    return res.status(400).json({ error: 'Action type is required.' });
  }

  try {
    await pool.query(
      `INSERT INTO usage_logs (user_id, action_type, quantity) VALUES ($1, $2, 1)`,
      [userId, actionType]
    );

    res.json({
      success: true,
      message: 'Usage action logged successfully.',
      isPro: req.isPro,
      remainingQuota: req.isPro ? 'Unlimited' : req.remainingQuota - 1
    });
  } catch (err) {
    console.error('Usage Log Error:', err);
    res.status(500).json({ error: 'Failed to log usage action.' });
  }
});

/**
 * GET /api/usage/status
 * Fetches current 24-hour quota status for UI rendering.
 */
app.get('/api/usage/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const subResult = await pool.query(
      "SELECT plan_type, status FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    const isPro = subResult.rows[0]?.status === 'active' && subResult.rows[0]?.plan_type.toLowerCase().includes('pro');

    const usageResult = await pool.query(
      `SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    const count = parseInt(usageResult.rows[0].count, 10);
    const DAILY_LIMIT = 3;

    res.json({
      isPro: !!isPro,
      usedToday: count,
      dailyLimit: DAILY_LIMIT,
      remaining: isPro ? 'Unlimited' : Math.max(0, DAILY_LIMIT - count)
    });
  } catch (err) {
    console.error('Fetch Usage Status Error:', err);
    res.status(500).json({ error: 'Failed to fetch usage status.' });
  }
});

// --- SUBSCRIPTION & WALLETDOC BILLING ROUTES ---

app.get('/api/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const subResult = await pool.query(
      'SELECT plan_type AS plan_name, status, current_period_end FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (subResult.rows.length === 0) {
      return res.json({ plan_name: 'InkPDF Free Plan', status: 'active', current_period_end: null });
    }

    res.json(subResult.rows[0]);
  } catch (err) {
    console.error('Fetch Subscription Error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription details.' });
  }
});

app.post('/api/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const email = userRes.rows[0]?.email;

    const payload = {
      merchantId: process.env.WALLETDOC_MERCHANT_ID,
      amount: 15000, // R150.00 expressed in cents
      currency: 'ZAR',
      reference: `INKPDF-PRO-${userId}-${Date.now()}`,
      description: 'InkPDF Pro Monthly Subscription',
      successUrl: `${req.headers.origin || 'http://localhost:5173'}/?payment=success`,
      cancelUrl: `${req.headers.origin || 'http://localhost:5173'}/?payment=cancelled`,
      customer: { email }
    };

    const response = await fetch(WALLETDOC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WALLETDOC_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to initialize Walletdoc payment');
    }

    res.json({ url: data.paymentUrl || data.url });
  } catch (err) {
    console.error('Walletdoc Checkout Error:', err);
    res.status(500).json({ error: 'Failed to create payment session.' });
  }
});

app.post('/api/webhook', async (req, res) => {
  const event = req.body;
  const client = await pool.connect();

  try {
    if (event.status === 'successful' || event.type === 'payment.successful') {
      const { reference, id: transactionId, customer } = event;
      
      const parts = reference ? reference.split('-') : [];
      const userId = parts[2];

      if (userId) {
        await client.query('BEGIN');
        
        await client.query(
          `INSERT INTO subscriptions (user_id, walletdoc_transaction_id, plan_type, status, current_period_end)
           VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
           ON CONFLICT (walletdoc_transaction_id) DO UPDATE 
           SET status = EXCLUDED.status, current_period_end = NOW() + INTERVAL '30 days'`,
          [userId, transactionId || reference, 'InkPDF Pro (ZAR)', 'active']
        );

        await client.query('COMMIT');

        // <-- 2. SEND ZAR PAYMENT RECEIPT AFTER COMMIT
        const userRow = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        const customerEmail = userRow.rows[0]?.email || customer?.email;
        if (customerEmail) {
          try {
            await sendPaymentReceiptEmail({
              toEmail: customerEmail,
              transactionId: transactionId || reference,
              reference,
            });
          } catch (emailErr) {
            console.error('Payment receipt email error:', emailErr);
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Walletdoc Webhook Processing Error:', err);
    res.status(500).json({ error: 'Webhook handling failed.' });
  } finally {
    client.release();
  }
});

// POPIA Account Deletion Endpoint
app.delete('/api/account', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.userId;

    await client.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [userId]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User account not found.' });
    }

    await client.query('COMMIT');

    // <-- 3. SEND POPIA ERASURE CERTIFICATE AFTER COMMIT
    const deletedUser = result.rows[0];
    try {
      await sendPopiaErasureCertificate({
        toEmail: deletedUser.email,
        userId: deletedUser.id,
      });
    } catch (emailErr) {
      console.error('POPIA certificate email error:', emailErr);
    }

    res.json({ message: 'Account and associated personal data permanently deleted in compliance with POPIA.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POPIA Account Deletion Error:', err);
    res.status(500).json({ error: 'Server error while deleting account data.' });
  } finally {
    client.release();
  }
});

async function startServer() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`InkPDF backend server running on http://localhost:${PORT} with Walletdoc and Quota Enforcement`);
  });
}

startServer();