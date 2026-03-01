# JurisQuery - Minimal AWS Integration Guide

## 🎯 Strategy: Use ONLY AWS RDS PostgreSQL

**Goal**: Get 40x more database storage for free for 12 months with minimal changes

**What Changes:**
- ❌ Neon PostgreSQL (0.5 GB) 
- ✅ AWS RDS PostgreSQL (20 GB) - **Free for 12 months**

**What Stays the Same:**
- ✅ Cloudinary (file storage)
- ✅ Render (backend hosting)
- ✅ Vercel (frontend hosting)
- ✅ Clerk (authentication)
- ✅ Qdrant Cloud (vector database)
- ✅ Google Gemini (AI/LLM)

**Setup Time:** 30-40 minutes  
**Free Duration:** 12 months (covers your 11-month requirement!)  
**Storage Upgrade:** 0.5 GB → 20 GB (40x more!)  
**Migration at Month 11:** Move back to Neon (stay free forever)

---

## 📋 Complete Setup Guide (30 Minutes)

### Step 1: Create AWS Account (5 minutes)

- [ ] Go to https://aws.amazon.com
- [ ] Click "Create an AWS Account"
- [ ] Enter email address: `your-email@example.com`
- [ ] Account name: `JurisQuery`
- [ ] Verify email (check inbox for verification code)
- [ ] Create root password (save it securely!)
- [ ] Enter contact information
- [ ] Add payment method (credit/debit card)
  - ⚠️ **Note**: Won't be charged on free tier
  - You'll get email alerts if you approach any limits
- [ ] Verify phone number (SMS verification)
- [ ] Select support plan: **Basic Support - Free**
- [ ] Click "Complete sign up"
- [ ] Sign in to AWS Management Console

**Security Best Practice:**
- [ ] Enable MFA (Multi-Factor Authentication) on root account
  - Console → IAM → Dashboard → "Add MFA" on root account
  - Use Google Authenticator or similar app

---

### Step 2: Create RDS PostgreSQL Database (15 minutes)

**Navigate to RDS:**
- [ ] AWS Console → Search bar → Type "RDS"
- [ ] Click "RDS" (Relational Database Service)
- [ ] Region selector (top right): Choose **us-east-1** (N. Virginia) or closest to your users

**Create Database:**
- [ ] Click "Create database" (orange button)

**Configuration Settings:**

```yaml
# Database Creation Method
Choose a database creation method: Standard create

# Engine Options
Engine type: PostgreSQL
Edition: PostgreSQL
Engine version: PostgreSQL 16.1-R2 (or latest)

# Templates
Templates: ✅ Free tier  # IMPORTANT: This ensures free tier limits

# Settings
DB instance identifier: jurisquery-db
Master username: postgres
Credentials management: Self managed
Master password: YourSecurePassword123!  # Save this!
Confirm password: YourSecurePassword123!

# DB Instance Class
DB instance class: db.t3.micro  # Automatically selected with Free tier template
                                # 1 vCPU, 1 GB RAM

# Storage
Storage type: General Purpose SSD (gp2)
Allocated storage: 20 GB  # Maximum for free tier
Storage autoscaling: ❌ Disable  # Keep it at 20 GB to stay free

# Availability & Durability
Multi-AZ deployment: ❌ No  # Not available in free tier

# Connectivity
Compute resource: Don't connect to an EC2 compute resource
VPC: Default VPC
DB subnet group: default
Public access: ✅ Yes  # IMPORTANT: So you can connect from internet
VPC security group: Create new
  New VPC security group name: jurisquery-rds-sg
Availability Zone: No preference
Database port: 5432

# Database authentication
Database authentication options: Password authentication

# Monitoring
Enable Enhanced monitoring: ❌ No  # Not needed for free tier

# Additional configuration (expand this section)
Initial database name: jurisquery  # IMPORTANT: Creates database automatically
DB parameter group: default.postgres16
Option group: default:postgres-16
Backup retention period: 7 days  # Included in free tier
Start backup window: No preference
Encryption: ✅ Enable encryption  # Free, adds security
AWS KMS key: (default) aws/rds
Performance Insights: ❌ Disable  # Not needed
Deletion protection: ❌ Disable  # For easier deletion during testing
```

- [ ] Click "Create database" (bottom of page)
- [ ] Wait for creation (5-10 minutes)
  - Status will show: Creating → Backing up → Available

---

### Step 3: Configure Security Group (5 minutes)

**Why?** By default, RDS blocks all incoming connections. We need to allow access from:
1. Your local machine (for testing)
2. Your backend server (Render or wherever it's hosted)

**Open Security Group:**
- [ ] RDS → Databases → Click "jurisquery-db"
- [ ] Scroll to "Security" section
- [ ] Under "VPC security groups", click the security group link (e.g., `jurisquery-rds-sg`)
- [ ] Click "Edit inbound rules"

**Add Rules:**

```yaml
# Rule 1: Allow from your local IP (for testing)
- [ ] Click "Add rule"
    Type: PostgreSQL
    Protocol: TCP
    Port range: 5432
    Source: My IP  # Auto-detects your IP
    Description: My local machine

# Rule 2: Allow from anywhere (for production backend)
- [ ] Click "Add rule"
    Type: PostgreSQL
    Protocol: TCP
    Port range: 5432
    Source: Anywhere-IPv4 (0.0.0.0/0)
    Description: Backend server access

⚠️ Note: In production, restrict this to your backend server's IP
For Render: Get static IP or use 0.0.0.0/0 (less secure but works)
```

- [ ] Click "Save rules"

---

### Step 4: Get Connection Details (2 minutes)

**Get Endpoint:**
- [ ] RDS → Databases → Click "jurisquery-db"
- [ ] Under "Connectivity & security" tab
- [ ] Copy "Endpoint" (looks like: `jurisquery-db.abc123xyz.us-east-1.rds.amazonaws.com`)
- [ ] Copy "Port" (should be: `5432`)

**Create Connection String:**

```bash
# Format:
postgresql+asyncpg://USERNAME:PASSWORD@ENDPOINT:PORT/DATABASE?sslmode=require

# Your actual string (replace values):
postgresql+asyncpg://postgres:YourSecurePassword123!@jurisquery-db.abc123xyz.us-east-1.rds.amazonaws.com:5432/jurisquery?sslmode=require

# Example:
postgresql+asyncpg://postgres:MyPass123!@jurisquery-db.c9aGqx2m1k.us-east-1.rds.amazonaws.com:5432/jurisquery?sslmode=require
```

**Save this connection string!** You'll need it in the next step.

---

### Step 5: Update Backend Configuration (3 minutes)

**Update .env file:**

```bash
# Navigate to backend folder
cd d:\project\JurisQuery\backend

# Open .env file in editor
code .env

# Find the DATABASE_URL line and replace it:

# OLD (Neon):
# DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.us-east-2.aws.neon.tech/jurisquery?sslmode=require

# NEW (AWS RDS):
DATABASE_URL=postgresql+asyncpg://postgres:YourSecurePassword123!@jurisquery-db.abc123xyz.us-east-1.rds.amazonaws.com:5432/jurisquery?sslmode=require

# ⚠️ IMPORTANT: Use YOUR actual values:
# - postgres (your master username)
# - YourSecurePassword123! (your master password)
# - jurisquery-db.abc123xyz.us-east-1.rds.amazonaws.com (your endpoint)
# - jurisquery (your database name)
```

**Keep all other environment variables the same!**

---

### Step 6: Test Connection & Run Migrations (5 minutes)

**Test basic connection:**

```powershell
# From backend folder
cd d:\project\JurisQuery\backend

# Activate virtual environment
& .\.venv\Scripts\Activate.ps1

# Test connection with Python
python -c "import asyncpg; import asyncio; asyncio.run(asyncpg.connect('postgresql://postgres:YourPassword@your-endpoint:5432/jurisquery'))"

# If successful, no error will appear
# If it fails, check:
# - Security group rules (is port 5432 open?)
# - Password (special characters might need URL encoding)
# - Endpoint (copied correctly?)
```

**Run database migrations:**

```powershell
# Run Alembic migrations to create all tables
alembic upgrade head

# Expected output:
# INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
# INFO  [alembic.runtime.migration] Will assume transactional DDL.
# INFO  [alembic.runtime.migration] Running upgrade  -> xxxx, initial_schema
# INFO  [alembic.runtime.migration] Running upgrade xxxx -> yyyy, add_parent_child_chunking
# INFO  [alembic.runtime.migration] Running upgrade yyyy -> zzzz, add_ipc_sections
```

**Verify tables were created:**

```powershell
# Connect with psql (if installed) or use DBeaver/pgAdmin
psql "postgresql://postgres:YourPassword@your-endpoint:5432/jurisquery?sslmode=require"

# Or use Python:
python -c "
import asyncpg
import asyncio

async def check_tables():
    conn = await asyncpg.connect('postgresql://postgres:YourPassword@your-endpoint:5432/jurisquery')
    tables = await conn.fetch(\"SELECT tablename FROM pg_tables WHERE schemaname='public'\")
    print('Tables created:')
    for table in tables:
        print(f'  - {table[\"tablename\"]}')
    await conn.close()

asyncio.run(check_tables())
"

# Expected output:
# Tables created:
#   - alembic_version
#   - users
#   - documents
#   - document_chunks
#   - chat_sessions
#   - chat_messages
#   - ipc_sections
```

---

### Step 7: Test Backend Server (2 minutes)

**Start backend:**

```powershell
cd d:\project\JurisQuery\backend

# Start server
uv run uvicorn app.main:app --reload --port 8000

# Expected output:
# INFO:     Will watch for changes in these directories: ['D:\\project\\JurisQuery\\backend']
# INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
# INFO:     Started reloader process [xxxxx] using WatchFiles
# INFO:     Started server process [xxxxx]
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
```

**Test endpoints:**

```powershell
# In another terminal or browser:

# 1. Health check
curl http://localhost:8000/health

# Expected: {"status":"healthy"}

# 2. API docs
# Open browser: http://localhost:8000/docs
# Should see Swagger UI with all endpoints
```

**If backend starts successfully:** ✅ AWS RDS is working!

---

## ✅ Completion Checklist

### Verification Steps

- [ ] AWS RDS database status shows "Available"
- [ ] Security group allows port 5432 from your IP
- [ ] Connection string works (no connection errors)
- [ ] Alembic migrations ran successfully
- [ ] All database tables exist (users, documents, etc.)
- [ ] Backend server starts without errors
- [ ] Health endpoint returns {"status":"healthy"}
- [ ] API docs accessible at http://localhost:8000/docs

### Update Production (if deployed)

If you already have backend deployed on Render/Railway:

- [ ] Go to Render dashboard → Your service
- [ ] Environment → Edit environment variables
- [ ] Update `DATABASE_URL` with new AWS RDS connection string
- [ ] Save changes (will trigger automatic redeploy)
- [ ] Wait for deployment to complete
- [ ] Test production health endpoint

---

## 📊 What You Get

### Storage Comparison

| Metric | Neon (Old) | AWS RDS (New) | Improvement |
|--------|------------|---------------|-------------|
| **Storage** | 0.5 GB | 20 GB | **40x more** |
| **Documents** | ~5,000 | ~200,000 | **40x more** |
| **Performance** | Auto-suspend | Always on | **Faster** |
| **Backups** | 7 days | 7 days | Same |
| **Cost** | Free forever | Free 12 months | N/A |
| **Setup** | 5 minutes | 30 minutes | More complex |

### Free Tier Details

```yaml
What's Free (12 months):
  - 750 hours/month of db.t3.micro (enough for 24/7 operation)
  - 20 GB General Purpose SSD storage
  - 20 GB backup storage
  - All I/O operations
  - Data transfer within same region

What's NOT Included:
  - Cross-region data transfer (use same region as backend)
  - Multi-AZ deployment (not needed for small apps)
  - DB snapshots beyond 20 GB (within limit = free)
  - Reserved instances (not needed)

After 12 Months:
  - Cost: ~$15-20/month
  - Strategy: Migrate back to Neon in Month 11
```

---

## 🔄 Migration Plan (Month 11)

**When to migrate back?** Before Month 12 ends (11 months from now)

**How to migrate back to Neon:**

### Step 1: Create Neon Database (Week 1 of Month 11)

```bash
# 1. Sign up at https://neon.tech
# 2. Create project: JurisQuery
# 3. Get connection string
# 4. Save for next steps
```

### Step 2: Dump AWS RDS Data

```powershell
# Export data from AWS RDS
pg_dump "postgresql://postgres:password@aws-endpoint:5432/jurisquery" > jurisquery_backup_$(Get-Date -Format 'yyyy-MM-dd').sql

# Or use this format:
pg_dump -h jurisquery-db.abc123xyz.us-east-1.rds.amazonaws.com `
        -U postgres `
        -d jurisquery `
        -f jurisquery_backup.sql
```

### Step 3: Import to Neon

```powershell
# Import to Neon
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/jurisquery?sslmode=require" < jurisquery_backup.sql
```

### Step 4: Update Backend

```bash
# Update .env
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.us-east-2.aws.neon.tech/jurisquery?sslmode=require

# Test locally
uv run uvicorn app.main:app --reload

# Deploy to production (Render)
# Environment variables → Update DATABASE_URL → Save
```

### Step 5: Delete AWS RDS (Save costs)

```bash
# AWS Console → RDS → Databases
# Select "jurisquery-db"
# Actions → Delete
# ❌ Uncheck "Create final snapshot" (data already migrated)
# Type "delete me" to confirm
# Delete
```

**Result:** Back to free forever!

---

## 💰 Cost Tracking

### How to Monitor Free Tier Usage

**Set up billing alerts:**

```bash
# 1. AWS Console → Billing Dashboard
# 2. Billing preferences → Edit
# 3. ✅ Receive Free Tier Usage Alerts
# 4. Email: your-email@example.com
# 5. Save preferences

# 2. Create Budget
# AWS Console → AWS Budgets → Create budget
# Budget type: Zero spend budget
# Budget name: JurisQuery Free Tier
# Email recipients: your-email@example.com
# Create budget

# You'll get email if ANY charges occur
```

**Check usage monthly:**

```bash
# AWS Console → Billing Dashboard → Free Tier
# Look for:
# - RDS: xxx of 750 hours used
# - Storage: xx GB of 20 GB used
# - Backups: xx GB of 20 GB used

# All should be well within limits
```

---

## 🆘 Troubleshooting

### Connection Refused / Timeout

**Problem:** Can't connect to RDS database

**Solutions:**
1. Check security group rules (port 5432 open?)
2. Verify RDS is "Available" status (not "Backing up")
3. Check endpoint is correct (no typos)
4. Try from different network (firewall issue?)
5. Verify public accessibility is enabled

```powershell
# Test connection:
Test-NetConnection -ComputerName jurisquery-db.abc123xyz.us-east-1.rds.amazonaws.com -Port 5432

# Expected output:
# TcpTestSucceeded : True
```

---

### Password Authentication Failed

**Problem:** `FATAL: password authentication failed`

**Solutions:**
1. Password has special characters? URL-encode them:
   ```
   @ → %40
   ! → %21
   # → %23
   $ → %24
   % → %25
   ```
2. Try resetting master password (RDS → Modify → Master password)
3. Check username is "postgres" (or what you set)

---

### Backend Starts But Can't Query Database

**Problem:** Server starts but API calls fail with database errors

**Solutions:**
1. Run migrations: `alembic upgrade head`
2. Check tables exist (see Step 6)
3. Verify connection string in .env has `?sslmode=require`
4. Check RDS storage isn't full (should have ~20 GB available)

---

### Charged Money (Not Free?)

**Problem:** Got charged or seeing non-zero in billing

**Possible causes:**
1. Multiple RDS instances running? (Delete unused ones)
2. Storage > 20 GB? (Check actual usage)
3. Cross-region data transfer? (Use same region everywhere)
4. Snapshots > 20 GB? (Delete old snapshots)
5. Still in first 12 months? (Check account creation date)

**How to check:**
```bash
# AWS Console → Billing Dashboard → Bills
# Expand "RDS Service" → See detailed charges
```

---

## 📋 Quick Reference

### Connection String Template

```
postgresql+asyncpg://[USERNAME]:[PASSWORD]@[ENDPOINT]:[PORT]/[DATABASE]?sslmode=require
```

### Your Actual Values

```bash
# Fill this out after setup:
USERNAME: postgres
PASSWORD: _________________________
ENDPOINT: _________________________.us-east-1.rds.amazonaws.com
PORT: 5432
DATABASE: jurisquery

# Full connection string:
postgresql+asyncpg://postgres:___________@___________________.us-east-1.rds.amazonaws.com:5432/jurisquery?sslmode=require
```

### Important URLs

- AWS Console: https://console.aws.amazon.com
- RDS Dashboard: https://console.aws.amazon.com/rds
- Billing: https://console.aws.amazon.com/billing
- Free Tier Usage: https://console.aws.amazon.com/billing/home#/freetier

### Support

- AWS Free Tier FAQ: https://aws.amazon.com/free/free-tier-faqs/
- RDS Documentation: https://docs.aws.amazon.com/rds/
- RDS PostgreSQL Guide: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html

---

## 🎯 Summary

✅ **What You Did:**
- Created AWS account (free)
- Set up RDS PostgreSQL (20 GB, free for 12 months)
- Configured security to allow connections
- Migrated from Neon to AWS RDS
- Tested connection and ran migrations

✅ **What You Got:**
- 40x more database storage (0.5 GB → 20 GB)
- Better performance (no auto-suspend)
- Free for 12 months

✅ **What Stays Free:**
- Cloudinary (file storage)
- Render (backend hosting)
- Vercel (frontend)
- Clerk (auth)
- Qdrant (vector DB)
- Gemini (AI)

✅ **What to Do in Month 11:**
- Migrate database back to Neon
- Delete AWS RDS
- Stay free forever

**Total Setup Time:** 30-40 minutes  
**Monthly Cost Year 1:** $0  
**Monthly Cost Year 2+:** $0 (after migrating back to Neon)

---

## ✨ Next Steps

- [ ] Complete this setup (30 minutes)
- [ ] Set up billing alerts (5 minutes)
- [ ] Test uploading documents and querying
- [ ] Deploy updated backend to production
- [ ] Set calendar reminder for Month 11 migration
- [ ] Continue development with 40x more storage! 🚀

---

*Last Updated: March 1, 2026*
*Setup for: JurisQuery - Legal AI Assistant*
