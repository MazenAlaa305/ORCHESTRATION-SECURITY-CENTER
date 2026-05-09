-- SME Production Database - Intentionally Vulnerable
-- Weak password: password123 (set via docker env)
-- No SSL enforcement
-- Sensitive data in plaintext

-- Enable remote connections (intentional misconfiguration)
ALTER SYSTEM SET listen_addresses = '*';
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';

-- Create application tables with sensitive data
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    ssn VARCHAR(11),              -- PII stored in plaintext (vulnerability)
    salary DECIMAL(10,2),         -- Financial data unencrypted
    department VARCHAR(100),
    hire_date DATE,
    password_hash VARCHAR(255)    -- Weak MD5 hashes
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    credit_card VARCHAR(19),      -- Card numbers in plaintext (PCI violation)
    address TEXT,
    phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100),
    api_key VARCHAR(255),         -- API keys stored unencrypted
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_name VARCHAR(100),
    action VARCHAR(255),
    ip_address VARCHAR(45),
    details TEXT
);

-- Insert realistic fake data
INSERT INTO employees (first_name, last_name, email, ssn, salary, department, hire_date, password_hash) VALUES
('Jane',   'Smith',    'jane.smith@sme-corp.com',    '123-45-6789', 85000.00, 'Human Resources', '2019-03-15', md5('password123')),
('Bob',    'Johnson',  'bob.johnson@sme-corp.com',   '234-56-7890', 72000.00, 'Engineering',     '2020-07-01', md5('bob2020')),
('Alice',  'Williams', 'alice.w@sme-corp.com',       '345-67-8901', 95000.00, 'Finance',         '2018-11-20', md5('alice!')),
('Carlos', 'Garcia',   'carlos.g@sme-corp.com',      '456-78-9012', 68000.00, 'IT Support',      '2021-01-10', md5('carlos1')),
('Sarah',  'Chen',     'sarah.chen@sme-corp.com',    '567-89-0123', 110000.00,'Engineering',     '2017-06-15', md5('s4r4h'));

INSERT INTO customers (name, email, credit_card, address, phone) VALUES
('Acme Corp',       'billing@acme.com',       '4111-1111-1111-1111', '123 Main St, Springfield', '555-0101'),
('Widget Inc',      'accounts@widget.co',     '5500-0000-0000-0004', '456 Oak Ave, Portland',    '555-0202'),
('TechStart LLC',   'finance@techstart.io',   '3400-0000-0000-009',  '789 Pine Rd, Austin',      '555-0303');

INSERT INTO api_keys (service_name, api_key, is_active) VALUES
('Stripe Payment Gateway',  'fake_payment_api_key_1234567890',  true),
('SendGrid Email',           'SG.xxxxxxxxxxxxxxxxxxxx',           true),
('AWS S3 Access',            'AKIAIOSFODNN7EXAMPLE',              true),
('Slack Webhook',            'xoxb-xxxxx-xxxxx-xxxxx',            false);

INSERT INTO audit_log (user_name, action, ip_address, details) VALUES
('admin',      'LOGIN_SUCCESS',    '10.10.20.40', 'Admin login from HR workstation'),
('admin',      'USER_CREATED',     '10.10.20.40', 'Created user carlos.g'),
('bob.johnson','LOGIN_FAILED',     '192.168.1.50','3 failed attempts'),
('system',     'BACKUP_COMPLETED', '10.10.30.30', 'Full database backup to /it_backups/');

-- Create a user with excessive privileges (vulnerability)
CREATE USER readonly_user WITH PASSWORD 'readonly';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO readonly_user;
