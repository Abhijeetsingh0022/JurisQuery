# JurisQuery - Free Cloud Services Plan

## Overview
This document outlines how to use **100% free cloud services** for JurisQuery, maximizing free tiers to run the platform without monthly costs during development and early production stages.

---

## 🎯 Current Cloud Services Stack

| Service | Purpose | Free Tier Limit | Current Status |
|---------|---------|----------------|----------------|
| **Neon** | PostgreSQL Database | 0.5 GB storage, 10 GB/month bandwidth | ✅ In Use |
| **Qdrant Cloud** | Vector Database | 1 GB cluster, 1M vectors | ✅ In Use |
| **Cloudinary** | File Storage (PDF/DOCX) | 25 GB storage, 25 GB/month bandwidth | ✅ In Use |
| **Google Gemini** | Primary LLM API | 1500 requests/day (free tier) | ✅ In Use |
| **Groq** | Fallback LLM API | 14,400 requests/day (free tier) | ⚠️ Optional |
| **Vercel** | Frontend Hosting | 100 GB bandwidth, unlimited sites | ✅ In Use |
| **Clerk** | Authentication | 10,000 monthly active users | ✅ In Use |
| **Render/Railway** | Backend Hosting | 750 hrs/month (free tier) | 🔄 To Setup |

**Estimated Monthly Cost: $0** (within free tier limits)

---

## 📋 Service-by-Service Implementation Plan

### 1. Database - Neon PostgreSQL (FREE)

**Free Tier Limits:**
- ✅ 0.5 GB storage
- ✅ 10 GB/month data transfer
- ✅ 1 project, 10 branches
- ✅ Automatic suspend after 5 minutes of inactivity
- ✅ Point-in-time recovery (7 days)

**Setup Steps:**
```bash
# 1. Create account at https://neon.tech
# 2. Create new project "JurisQuery"
# 3. Copy connection string
# 4. Add to .env file
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.us-east-2.aws.neon.tech/jurisquery?sslmode=require
```

**Optimization Tips:**
- Enable connection pooling (already in your config)
- Use prepared statements to reduce bandwidth
- Archive old chat history after 30 days
- Expected usage: ~100 MB for 1000 documents + chat history

**Upgrade Trigger:** Storage exceeds 400 MB (80% of 0.5 GB)

---

### 2. Vector Database - Qdrant Cloud (FREE)

**Free Tier Limits:**
- ✅ 1 GB RAM cluster
- ✅ Up to 1M vectors (768-dim)
- ✅ Unlimited collections
- ✅ Automatic backups

**Setup Steps:**
```bash
# 1. Create account at https://qdrant.io/cloud
# 2. Create free cluster (US/EU region)
# 3. Get API key and URL
# 4. Add to .env file
QDRANT_URL=https://xxx-xxx.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=jurisquery_documents
```

**Optimization Tips:**
- Current parent-child chunking: ~512 chars per chunk
- Average document (10 pages): ~100 chunks = 100 vectors
- **Free tier capacity**: ~10,000 documents (1M vectors / 100)
- Use payload filtering instead of multiple collections
- Enable compression for metadata

**Current Usage Estimate:**
- 100 documents = 10,000 vectors = 0.01M (1% of limit)

**Upgrade Trigger:** Vector count exceeds 800K (80% of 1M limit)

---

### 3. File Storage - Cloudinary (FREE)

**Free Tier Limits:**
- ✅ 25 GB storage
- ✅ 25 GB/month bandwidth
- ✅ 25,000 transformations/month
- ✅ Secure HTTPS delivery

**Setup Steps:**
```bash
# 1. Create account at https://cloudinary.com
# 2. Go to Dashboard → Settings → Access Keys
# 3. Copy Cloud Name, API Key, API Secret
# 4. Add to .env file
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Optimization Tips:**
- Store original PDFs/DOCX only (no duplicate formats)
- Average legal document: 500 KB
- **Free tier capacity**: ~50,000 documents (25 GB / 500 KB)
- Use eager transformations only for previews
- Implement client-side caching (cache-control headers)

**Current Usage Estimate:**
- 100 documents × 500 KB = 50 MB (0.2% of 25 GB limit)

**Upgrade Trigger:** Storage exceeds 20 GB (80% of 25 GB)

---

### 4. AI Services - Google Gemini 2.0 Flash (FREE)

**Free Tier Limits:**
- ✅ 1,500 requests/day (RPD)
- ✅ 1,000,000 tokens/minute (TPM)
- ✅ 15 requests/minute (RPM)
- ✅ Gemini 2.0 Flash model
- ✅ Text embeddings (768-dim) included

**Setup Steps:**
```bash
# 1. Go to https://aistudio.google.com/apikey
# 2. Create API key for free tier
# 3. Optional: Create 2nd key for rotation
# 4. Add to .env file
GEMINI_API_KEY=your_primary_gemini_key
GEMINI_API_KEY_2=your_secondary_gemini_key  # Optional for rotation
```

**Optimization Tips:**
- Implement your existing BrainLLM meta-reasoning (already done ✅)
- Use streaming responses to reduce perceived latency
- Cache common queries with Redis (optional)
- Average query: 2000 tokens (input) + 500 tokens (output)
- **Free tier capacity**: 1500 queries/day

**Request Distribution:**
- Answer generation: 70% (1050/day)
- Embeddings: 20% (300/day)
- IPC prediction: 10% (150/day)

**Upgrade Trigger:** Consistent daily usage > 1200 requests (80% of 1500)

---

### 5. Fallback LLM - Groq (FREE - Optional)

**Free Tier Limits:**
- ✅ 14,400 requests/day
- ✅ 7,000 tokens/minute
- ✅ 30 requests/minute
- ✅ LLaMA 3.3 70B model access

**Setup Steps:**
```bash
# 1. Create account at https://console.groq.com
# 2. Generate API key
# 3. Add to .env file
GROQ_API_KEY=your_groq_api_key

# 4. Install Groq SDK (currently optional in your code)
cd backend
uv add groq
```

**Optimization Tips:**
- Use only as fallback when Gemini rate limit hit
- Your code already supports optional Groq (✅ implemented)
- Groq is much faster (300+ tokens/sec) for real-time responses
- Consider using Groq for IPC prediction (faster inference)

**When to Use:**
- Gemini hits rate limit (after 1500 requests/day)
- Need faster response times for chat interface
- A/B testing different models

---

### 6. Frontend Hosting - Vercel (FREE)

**Free Tier Limits:**
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Edge functions (100 GB-hours)
- ✅ Custom domain support

**Setup Steps:**
```bash
# 1. Push code to GitHub repository
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/jurisquery.git
git push -u origin main

# 2. Go to https://vercel.com
# 3. Import GitHub repository
# 4. Configure project:
#    - Framework: Next.js
#    - Root directory: frontend
#    - Build command: (auto-detected)
#    - Output directory: (auto-detected)

# 5. Add environment variables in Vercel dashboard
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

**Optimization Tips:**
- Enable Vercel Analytics (free tier)
- Use Image Optimization (auto-enabled)
- Implement ISR (Incremental Static Regeneration) for docs pages
- Expected bandwidth: ~10 GB/month for 1000 users

**Upgrade Trigger:** Bandwidth exceeds 80 GB/month

---

### 7. Backend Hosting - Render (FREE)

**Free Tier Limits:**
- ✅ 750 hours/month (enough for 1 instance running 24/7)
- ✅ 512 MB RAM
- ✅ Automatic deploys from GitHub
- ✅ Custom domain support
- ⚠️ Spins down after 15 minutes of inactivity (cold start: ~30 seconds)

**Setup Steps:**
```bash
# 1. Create account at https://render.com
# 2. New → Web Service
# 3. Connect GitHub repository
# 4. Configure:
#    - Name: jurisquery-backend
#    - Region: Oregon (US West)
#    - Branch: main
#    - Root Directory: backend
#    - Runtime: Python 3
#    - Build Command: pip install uv && uv pip install -r pyproject.toml
#    - Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Environment Variables to Add:**
```bash
DATABASE_URL=<Neon connection string>
GEMINI_API_KEY=<your_gemini_key>
QDRANT_URL=<your_qdrant_url>
QDRANT_API_KEY=<your_qdrant_key>
CLOUDINARY_CLOUD_NAME=<your_cloudinary_name>
CLOUDINARY_API_KEY=<your_cloudinary_key>
CLOUDINARY_API_SECRET=<your_cloudinary_secret>
JWT_SECRET=<random_secret_string>
CLERK_SECRET_KEY=<your_clerk_secret>
CORS_ORIGINS=https://your-app.vercel.app
ENVIRONMENT=production
DEBUG=false
```

**Optimization Tips:**
- Accept cold starts (free tier limitation)
- Implement health check endpoint (already exists: `/health`)
- Use background workers for document processing
- Consider Railway.app as alternative (similar free tier)

**Alternative: Railway.app**
- ✅ 500 hours/month + 100 hours trial credit
- ✅ 512 MB RAM + 1 GB disk
- ✅ No automatic sleep (better for production)
- ✅ Similar setup process

---

### 8. Authentication - Clerk (FREE)

**Free Tier Limits:**
- ✅ 10,000 monthly active users (MAU)
- ✅ Social logins (Google, GitHub, etc.)
- ✅ Email/password authentication
- ✅ User management dashboard
- ✅ Session management

**Setup Steps:**
```bash
# 1. Create account at https://clerk.com
# 2. Create new application "JurisQuery"
# 3. Configure sign-in options (Email, Google)
# 4. Copy API keys from dashboard

# Frontend (.env.local)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Backend (.env)
CLERK_SECRET_KEY=sk_test_xxx
```

**Optimization Tips:**
- Already implemented in your Frontend (✅)
- Use Clerk webhooks for user sync with your database
- Implement role-based access control (RBAC)
- Expected usage: 100-500 MAU in early stages

**Upgrade Trigger:** MAU exceeds 8,000 (80% of 10,000)

---

## 🚀 Deployment Checklist

### Phase 1: Database & Storage (Day 1)
- [ ] Create Neon PostgreSQL account
- [ ] Run Alembic migrations: `alembic upgrade head`
- [ ] Verify database connection
- [ ] Create Qdrant Cloud cluster
- [ ] Initialize collection with embeddings
- [ ] Setup Cloudinary account
- [ ] Test file upload/download

### Phase 2: AI Services (Day 2)
- [ ] Generate Gemini API keys (2 for rotation)
- [ ] Test embeddings generation
- [ ] Test answer generation
- [ ] (Optional) Setup Groq API key
- [ ] Configure rate limiting in code

### Phase 3: Backend Deployment (Day 3)
- [ ] Choose platform (Render or Railway)
- [ ] Connect GitHub repository
- [ ] Add all environment variables
- [ ] Deploy backend
- [ ] Test API endpoints
- [ ] Setup health monitoring

### Phase 4: Frontend Deployment (Day 4)
- [ ] Setup Clerk authentication
- [ ] Configure environment variables
- [ ] Deploy to Vercel
- [ ] Connect custom domain (optional)
- [ ] Test production build

### Phase 5: Testing & Monitoring (Day 5)
- [ ] End-to-end test: Upload → Process → Query
- [ ] Load test with 10 concurrent users
- [ ] Monitor error logs
- [ ] Setup uptime monitoring (UptimeRobot - free)
- [ ] Configure alerts for rate limits

---

## 📊 Capacity Planning

### Current Free Tier Capacity

| Resource | Limit | Estimated Capacity | Good For |
|----------|-------|-------------------|----------|
| **Documents** | Qdrant 1M vectors | ~10,000 documents | Small law firm |
| **Storage** | Cloudinary 25 GB | ~50,000 PDFs | Medium archive |
| **Queries** | Gemini 1500/day | ~45,000/month | 500 active users |
| **Users** | Clerk 10K MAU | 10,000 users | Early startup |
| **Bandwidth** | Vercel 100 GB | ~100K page views | Small traffic |

### Usage Projections

**Month 1-3 (MVP Testing):**
- 10 users
- 100 documents
- 300 queries/month
- **Cost: $0**

**Month 4-6 (Beta Launch):**
- 100 users
- 1,000 documents
- 3,000 queries/month
- **Cost: $0**

**Month 7-12 (Public Launch):**
- 500 users
- 5,000 documents
- 15,000 queries/month
- **Cost: $0** (still within free tiers)

**Upgrade Needed When:**
- > 10,000 documents (Qdrant upgrade: $25/month)
- > 1,500 queries/day (Gemini upgrade: $0.50/1000 requests)
- > 10,000 MAU (Clerk upgrade: $25/month)

---

## 🔧 Configuration Files

### Backend `.env` File (Production)
```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.us-east-2.aws.neon.tech/jurisquery?sslmode=require

# AI Services (FREE TIER)
GEMINI_API_KEY=AIza....................  # 1500 req/day
GEMINI_API_KEY_2=AIza..................  # Backup key
GROQ_API_KEY=gsk_....................    # Optional fallback

# Vector DB (FREE TIER)
QDRANT_URL=https://xxx-xxx.qdrant.io
QDRANT_API_KEY=xxx.....................
QDRANT_COLLECTION_NAME=jurisquery_documents

# Storage (FREE TIER)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx...............
CLOUDINARY_API_SECRET=xxx.............

# Auth (FREE TIER)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
CLERK_SECRET_KEY=sk_live_xxx.........

# App Config
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://your-app.vercel.app

# Rate Limiting (stay within free tiers)
MAX_REQUESTS_PER_MINUTE=15
MAX_REQUESTS_PER_DAY=1200
```

### Frontend `.env.local` File (Production)
```bash
# API Backend
NEXT_PUBLIC_API_URL=https://jurisquery-backend.onrender.com

# Auth (FREE TIER)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx...
CLERK_SECRET_KEY=sk_live_xxx...

# Analytics (Optional - Free)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=auto
```

---

## 💰 Cost Comparison

### Option 1: All Free Tiers (Current Plan)
| Service | Monthly Cost |
|---------|--------------|
| Neon PostgreSQL | $0 |
| Qdrant Cloud | $0 |
| Cloudinary | $0 |
| Google Gemini | $0 |
| Groq | $0 |
| Vercel | $0 |
| Render/Railway | $0 |
| Clerk | $0 |
| **TOTAL** | **$0/month** |

### Option 2: Paid Tiers (For Comparison)
| Service | Monthly Cost |
|---------|--------------|
| Neon Pro | $19 |
| Qdrant Standard | $25 |
| Cloudinary Plus | $89 |
| Gemini Pro | ~$50 (usage-based) |
| Render Basic | $7 |
| Clerk Production | $25 |
| **TOTAL** | **$215/month** |

**Savings with Free Tier: $215/month = $2,580/year**

---

## 🎯 Recommended Strategy

### For Development & MVP (0-6 months)
✅ **Use 100% free tiers** as outlined above
- Perfect for testing and validation
- Zero hosting costs
- Easy to scale when needed

### For Beta/Early Production (6-12 months)
- Continue with free tiers
- Monitor usage closely
- Implement rate limiting and caching
- Expected cost: Still $0

### For Growth Phase (12+ months)
Upgrade only what's needed:
1. **First upgrade**: Backend hosting to Render Basic ($7/month) - eliminates cold starts
2. **Second upgrade**: Qdrant Standard ($25/month) - when documents exceed 8,000
3. **Third upgrade**: Gemini API - pay-per-use only if exceeding 1,500/day consistently

---

## 🚨 Monitoring & Alerts

### Free Monitoring Tools

**1. UptimeRobot (FREE)**
```bash
# Setup at https://uptimerobot.com
# Monitor endpoints:
- https://your-backend.onrender.com/health
- https://your-app.vercel.app

# Alert channels:
- Email notifications
- Slack webhook (optional)
```

**2. Vercel Analytics (FREE)**
- Automatic page view tracking
- Real user monitoring (RUM)
- Web Vitals scoring

**3. Backend Metrics (Built-in)**
```python
# Add to main.py
from prometheus_client import Counter, Histogram

request_count = Counter('http_requests_total', 'Total HTTP requests')
query_latency = Histogram('query_duration_seconds', 'Query processing time')

# Track usage
@app.get("/metrics")
async def metrics():
    return {
        "requests_today": request_count._value.get(),
        "gemini_api_calls": gemini_counter._value.get(),
        "qdrant_vectors": await get_vector_count(),
        "cloudinary_storage_mb": await get_storage_usage(),
    }
```

**4. Rate Limit Alerts**
```python
# Add email alerts when approaching limits
if gemini_requests_today > 1200:  # 80% of 1500
    send_alert_email("Approaching Gemini API limit")
```

---

## 📚 Additional Free Services (Optional)

### Error Tracking
- **Sentry** - Free tier: 5K errors/month
- Setup: `pip install sentry-sdk`

### Email Service
- **Resend** - Free tier: 100 emails/day
- For password resets, notifications

### Caching (Optional)
- **Upstash Redis** - Free tier: 10K commands/day
- Reduce API calls by caching query results

### Monitoring
- **Better Stack** - Free tier: 1 project
- Log aggregation and search

### Domain
- **Freenom** - Free domains (.tk, .ml, .ga)
- Or use free subdomain from Vercel

---

## 🔄 Migration Path (When Upgrading)

### Stage 1: Free Tiers (Current)
- All services on free plans
- Cost: $0/month
- Capacity: 10K documents, 1500 queries/day

### Stage 2: Backend Upgrade ($7/month)
- Move backend to Render Basic
- Eliminates cold starts
- Better for production reliability

### Stage 3: Database Upgrade (+$19/month = $26 total)
- Neon Pro: 10 GB storage
- Point-in-time recovery
- Faster query performance

### Stage 4: Vector DB Upgrade (+$25/month = $51 total)
- Qdrant Standard: 16M vectors
- Support 100K+ documents
- Better performance

### Stage 5: Full Production (+$100/month = $150 total)
- All paid tiers
- Custom domains
- Priority support

---

## ✅ Action Items

### This Week
1. [ ] Create accounts on all free tier services
2. [ ] Setup Neon database and run migrations
3. [ ] Configure Qdrant vector store
4. [ ] Setup Cloudinary storage
5. [ ] Get Gemini API keys
6. [ ] Test locally with production credentials

### Next Week
1. [ ] Deploy backend to Render/Railway
2. [ ] Deploy frontend to Vercel
3. [ ] Configure Clerk authentication
4. [ ] End-to-end testing
5. [ ] Setup monitoring and alerts

### Ongoing
1. [ ] Monitor daily API usage
2. [ ] Track storage growth
3. [ ] Review error logs weekly
4. [ ] Optimize slow queries
5. [ ] Plan for scale when needed

---

## 📖 Resources & Documentation

- **Neon PostgreSQL**: https://neon.tech/docs
- **Qdrant Cloud**: https://qdrant.tech/documentation/cloud/
- **Cloudinary**: https://cloudinary.com/documentation
- **Google Gemini**: https://ai.google.dev/gemini-api/docs
- **Groq**: https://console.groq.com/docs
- **Vercel**: https://vercel.com/docs
- **Render**: https://render.com/docs
- **Clerk**: https://clerk.com/docs
## 🔄 Alternative: AWS Services

Want to use AWS services instead? See **[AWS_FREE_TIER_PLAN.md](AWS_FREE_TIER_PLAN.md)** for:
- AWS RDS PostgreSQL (20 GB vs Neon 0.5 GB)
- AWS S3 (alternative to Cloudinary)
- AWS Lambda (backend hosting)
- AWS Cognito (50K users vs Clerk 10K)
- Complete hybrid architecture recommendations
---

## 🎉 Summary

You can run **JurisQuery completely free** with these services:

✅ **Database**: Neon (0.5 GB)  
✅ **Vector DB**: Qdrant (1M vectors)  
✅ **Storage**: Cloudinary (25 GB)  
✅ **AI**: Gemini (1500 req/day) + Groq (14.4K req/day)  
✅ **Frontend**: Vercel (unlimited)  
✅ **Backend**: Render (750 hrs/month)  
✅ **Auth**: Clerk (10K users)  

**Total Cost: $0/month**  
**Capacity: Good for 500+ active users**  
**Upgrade When**: Past MVP stage with consistent high traffic

---

*Last Updated: March 1, 2026*
