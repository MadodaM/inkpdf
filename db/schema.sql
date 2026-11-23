-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subscriptions Table (Stripe integration & ZAR billing)
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan_type VARCHAR(50) DEFAULT 'free', -- 'free', 'day_pass', 'pro', 'team'
    status VARCHAR(50) DEFAULT 'inactive', -- 'active', 'canceled', 'past_due'
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Metered Usage Table (For Itemized Billing & Ad Limits)
CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'ocr_page', 'conversion', 'ad_unlock'
    quantity INT DEFAULT 1,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);