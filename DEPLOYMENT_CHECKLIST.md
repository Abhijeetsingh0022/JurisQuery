# JurisQuery Cloud Services Setup Checklist

**Goal**: Deploy JurisQuery for FREE using cloud service free tiers  
**Estimated Time**: 2-3 hours  
**Total Cost**: $0/month  

---

## Pre-Setup Requirements

- [ ] GitHub account (for code repository)
- [ ] Valid email address (for service signups)
- [ ] Credit card (for identity verification - won't be charged on free tiers)
- [ ] Text editor for managing environment variables

---

## Phase 1: Core Infrastructure (30 minutes)

### 1.1 Database - Neon PostgreSQL

- [ ] Go to https://neon.tech
- [ ] Click "Sign Up" → Authenticate with GitHub
- [ ] Create new project:
  - Name: `JurisQuery`
  - Region: Select closest to your users
  - PostgreSQL version: 16 (default)
- [ ] Copy connection string from dashboard
- [ ] Update connection string format:
  ```
  FROM: postgresql://user:pass@host/db
  TO:   postgresql+asyncpg://user:pass@host/db?sslmode=require
  ```
- [ ] Save to notepad as: `DATABASE_URL=postgresql+asyncpg://...`

**Test Connection:**
```bash
cd backend
alembic upgrade head  # Should run migrations successfully
```

---

### 1.2 Vector Database - Qdrant Cloud

- [ ] Go to https://qdrant.io/cloud
- [ ] Sign up with email/GitHub
- [ ] Create free cluster:
  - Name: `jurisquery-vectors`
  - Cloud Provider: AWS
  - Region: `us-east-1` (or closest)
  - Cluster Type: **Free 1GB**
- [ ] Wait for cluster to provision (2-3 minutes)
- [ ] Copy **Cluster URL** (e.g., `https://xxx-xxx.us-east-1-0.aws.cloud.qdrant.io`)
- [ ] Go to "API Keys" → Generate new key
- [ ] Copy API key
- [ ] Save to notepad:
  ```
  QDRANT_URL=https://xxx-xxx.us-east-1-0.aws.cloud.qdrant.io
  QDRANT_API_KEY=your_api_key_here
  QDRANT_COLLECTION_NAME=jurisquery_documents
  ```

**Test Connection:**
```bash
curl -X GET "${QDRANT_URL}/collections" \
  -H "api-key: ${QDRANT_API_KEY}"
# Should return: {"result":{"collections":[]}}
```

---

### 1.3 File Storage - Cloudinary

- [ ] Go to https://cloudinary.com
- [ ] Sign up for free account
- [ ] Verify email address
- [ ] Go to Dashboard → Settings → Access Keys
- [ ] Copy the following:
  - Cloud Name
  - API Key
  - API Secret
- [ ] Save to notepad:
  ```
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=123456789012345
  CLOUDINARY_API_SECRET=your_secret_here
  ```

**Test Upload:**
```bash
# Test via Cloudinary dashboard
# Upload → Media Library → Upload a sample PDF
# Verify it appears in your library
```

---

## Phase 2: AI Services (20 minutes)

### 2.1 Primary LLM - Google Gemini

- [ ] Go to https://aistudio.google.com/app/apikey
- [ ] Sign in with Google account
- [ ] Click "Get API Key" → "Create API key"
- [ ] Select or create Google Cloud project
- [ ] Copy API key (starts with `AIza...`)
- [ ] **IMPORTANT**: Create a second key for rotation
  - [ ] Repeat process → Create API key again
  - [ ] Copy second key
- [ ] Save to notepad:
  ```
  GEMINI_API_KEY=AIzaSy...your_primary_key
  GEMINI_API_KEY_2=AIzaSy...your_backup_key
  ```

**Test API:**
```bash
curl "https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}"
# Should return list of available models
```

---

### 2.2 Fallback LLM - Groq (OPTIONAL)

- [ ] Go to https://console.groq.com
- [ ] Sign up with email/Google
- [ ] Navigate to API Keys section
- [ ] Click "Create API Key"
- [ ] Name: `JurisQuery Backend`
- [ ] Copy key (starts with `gsk_`)
- [ ] Save to notepad:
  ```
  GROQ_API_KEY=gsk_your_groq_key_here
  ```
- [ ] Install Groq SDK:
  ```bash
  cd backend
  uv add groq
  ```

**Skip this if you want to use only Gemini**

---

## Phase 3: Authentication & Security (15 minutes)

### 3.1 Authentication - Clerk

- [ ] Go to https://clerk.com
- [ ] Sign up for free account
- [ ] Create new application:
  - Name: `JurisQuery`
  - Sign-in options: ✓ Email, ✓ Google
- [ ] Go to "API Keys" section
- [ ] Copy **Secret Key** (starts with `sk_test_` or `sk_live_`)
- [ ] Go to "JWT Templates" (for backend validation)
- [ ] Copy **Publishable Key** (starts with `pk_test_`)
- [ ] Save to notepad:
  ```
  # Backend
  CLERK_SECRET_KEY=sk_test_your_secret_key

  # Frontend (separate .env.local file)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
  CLERK_SECRET_KEY=sk_test_your_secret_key
  ```

---

### 3.2 JWT Configuration

- [ ] Generate strong JWT secret (32+ characters)
  ```bash
  # On Linux/Mac:
  openssl rand -hex 32

  # On Windows PowerShell:
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

  # Or use online generator:
  # https://randomkeygen.com/ (CodeIgniter Encryption Keys)
  ```
- [ ] Copy generated string
- [ ] Save to notepad:
  ```
  JWT_SECRET=your_generated_secret_here_minimum_32_chars
  JWT_ALGORITHM=HS256
  JWT_EXPIRY_MINUTES=60
  ```

---

## Phase 4: Backend Deployment (30 minutes)

### 4.1 Prepare Repository

- [ ] Initialize Git repository:
  ```bash
  cd d:\project\JurisQuery
  git init
  git add .
  git commit -m "Initial commit - JurisQuery v1.0"
  ```
- [ ] Create GitHub repository:
  - [ ] Go to https://github.com/new
  - [ ] Name: `JurisQuery`
  - [ ] Visibility: Private
  - [ ] Don't initialize with README (already exists)
  - [ ] Click "Create repository"
- [ ] Push to GitHub:
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/JurisQuery.git
  git branch -M main
  git push -u origin main
  ```

---

### 4.2 Deploy to Render (OR Railway)

**Option A: Render (Recommended)**

- [ ] Go to https://render.com
- [ ] Sign up with GitHub
- [ ] Click "New +" → "Web Service"
- [ ] Connect repository: `JurisQuery`
- [ ] Configure:
  ```
  Name:           jurisquery-backend
  Region:         Oregon (US West)
  Branch:         main
  Root Directory: backend
  Runtime:        Python 3
  Build Command:  pip install uv && uv pip install -r pyproject.toml
  Start Command:  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  Instance Type:  Free
  ```
- [ ] Click "Advanced" → Add Environment Variables (paste all from notepad)
- [ ] Add production config:
  ```
  ENVIRONMENT=production
  DEBUG=false
  CORS_ORIGINS=https://your-app-name.vercel.app
  ```
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 minutes)
- [ ] Copy deployment URL: `https://jurisquery-backend.onrender.com`

**Option B: Railway**

- [ ] Go to https://railway.app
- [ ] Sign up with GitHub
- [ ] New Project → Deploy from GitHub repo
- [ ] Select `JurisQuery` repository
- [ ] Add service → Select `backend` folder
- [ ] Add all environment variables
- [ ] Deploy
- [ ] Copy deployment URL

---

### 4.3 Test Backend

- [ ] Open deployment URL in browser
- [ ] Should see: `{"message": "JurisQuery API is running"}`
- [ ] Test health endpoint: `https://your-backend.onrender.com/health`
- [ ] Should return: `{"status": "healthy"}`
- [ ] Test API docs: `https://your-backend.onrender.com/docs`
- [ ] Should see Swagger UI

---

## Phase 5: Frontend Deployment (20 minutes)

### 5.1 Configure Frontend Environment

- [ ] Create `frontend/.env.local` file
- [ ] Add environment variables:
  ```bash
  # Backend API
  NEXT_PUBLIC_API_URL=https://jurisquery-backend.onrender.com

  # Clerk Auth
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
  CLERK_SECRET_KEY=sk_test_your_secret

  # Optional Analytics
  NEXT_PUBLIC_VERCEL_ANALYTICS_ID=auto
  ```

---

### 5.2 Deploy to Vercel

- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Click "Add New" → "Project"
- [ ] Import `JurisQuery` repository
- [ ] Configure:
  ```
  Framework Preset:     Next.js (auto-detected)
  Root Directory:       frontend
  Build Command:        (leave default)
  Output Directory:     (leave default)
  Install Command:      (leave default)
  Development Command:  (leave default)
  ```
- [ ] Add Environment Variables:
  - [ ] Click "Environment Variables"
  - [ ] Add each variable from `frontend/.env.local`
  - [ ] Select "Production", "Preview", "Development"
- [ ] Click "Deploy"
- [ ] Wait for deployment (3-5 minutes)
- [ ] Copy deployment URL: `https://your-app.vercel.app`

---

### 5.3 Update CORS Settings

- [ ] Go back to Render/Railway backend dashboard
- [ ] Update `CORS_ORIGINS` environment variable:
  ```
  CORS_ORIGINS=https://your-app.vercel.app,https://your-app-name-git-main.vercel.app
  ```
- [ ] Redeploy backend service

---

## Phase 6: Testing & Verification (30 minutes)

### 6.1 End-to-End Test

- [ ] Open frontend URL: `https://your-app.vercel.app`
- [ ] Click "Sign Up" → Create test account
- [ ] Verify email confirmation (if enabled)
- [ ] Log in successfully
- [ ] Navigate to Dashboard
- [ ] **Test Document Upload:**
  - [ ] Click "Upload Document"
  - [ ] Select a PDF file (< 10 MB for testing)
  - [ ] Wait for processing (should see: Uploading → Processing → Vectorizing → Ready)
  - [ ] Status should change to "Ready"
- [ ] **Test Chat Interface:**
  - [ ] Click "Chat" on the uploaded document
  - [ ] Ask question: "What is this document about?"
  - [ ] Should receive answer with citations
- [ ] **Test IPC Predictor:**
  - [ ] Navigate to IPC Predictor
  - [ ] Enter crime scenario
  - [ ] Should receive predicted IPC sections

---

### 6.2 Monitor Performance

- [ ] Check Render logs for errors
- [ ] Verify Neon database connection (Dashboard → Monitoring)
- [ ] Check Qdrant vector count (Dashboard → Collections)
- [ ] Verify Cloudinary storage usage (Dashboard → Media Library)
- [ ] Check Gemini API usage (Google Cloud Console → API usage)

---

## Phase 7: Monitoring & Alerts (15 minutes)

### 7.1 Setup UptimeRobot (FREE)

- [ ] Go to https://uptimerobot.com
- [ ] Sign up for free account
- [ ] Add New Monitor:
  ```
  Monitor Type:    HTTPS
  Friendly Name:   JurisQuery Backend
  URL:             https://jurisquery-backend.onrender.com/health
  Monitoring Interval: 5 minutes (free tier)
  ```
- [ ] Add second monitor for frontend:
  ```
  Monitor Type:    HTTPS
  Friendly Name:   JurisQuery Frontend
  URL:             https://your-app.vercel.app
  Monitoring Interval: 5 minutes
  ```
- [ ] Configure alert contacts:
  - [ ] Email: your-email@example.com
  - [ ] (Optional) SMS, Slack webhook

---

### 7.2 Enable Vercel Analytics

- [ ] Go to Vercel Dashboard → Your Project
- [ ] Click "Analytics" tab
- [ ] Enable "Web Analytics" (FREE)
- [ ] Redeploy frontend if needed
- [ ] View real-time visitor data

---

## Phase 8: Documentation & Handoff (10 minutes)

### 8.1 Create Production .env File

- [ ] Save all environment variables to secure location
- [ ] Create `backend/.env.production` (DO NOT commit to GitHub)
- [ ] Store backup in password manager (1Password, LastPass)

---

### 8.2 Update Documentation

- [ ] Update README.md with production URLs
- [ ] Document any deployment-specific notes
- [ ] Create backup of database schema:
  ```bash
  cd backend
  alembic heads  # Note current migration version
  ```

---

## ✅ Final Checklist

### Security
- [ ] All environment variables are in `.env` files (not hardcoded)
- [ ] `.env` files are in `.gitignore`
- [ ] Clerk authentication is working
- [ ] JWT secret is strong (32+ characters)
- [ ] CORS is configured correctly

### Functionality
- [ ] User can sign up and log in
- [ ] Documents can be uploaded and processed
- [ ] Chat interface works with citations
- [ ] IPC predictor works
- [ ] All API endpoints return expected responses

### Performance
- [ ] Backend responds within 3 seconds (considering Render cold starts)
- [ ] Frontend loads within 2 seconds
- [ ] Database queries are optimized
- [ ] Vector search returns results in < 1 second

### Monitoring
- [ ] UptimeRobot monitors are active
- [ ] Email alerts are configured
- [ ] Vercel Analytics is tracking visitors
- [ ] Error logging is visible in Render dashboard

---

## 🎯 Success Criteria

You have successfully deployed JurisQuery when:

✅ Frontend is accessible at `https://your-app.vercel.app`  
✅ Backend is accessible at `https://your-backend.onrender.com`  
✅ Users can sign up, log in, and access dashboard  
✅ Documents can be uploaded and processed to "Ready" status  
✅ Chat interface returns AI-powered answers with citations  
✅ IPC Predictor returns section predictions  
✅ All services are on FREE tiers ($0/month cost)  
✅ Uptime monitoring is active and sending alerts  

---

## 📊 Expected Free Tier Usage (First Month)

| Service | Usage | % of Limit |
|---------|-------|------------|
| Neon Database | 50 MB | 10% of 0.5 GB |
| Qdrant Vectors | 5,000 vectors | 0.5% of 1M |
| Cloudinary Storage | 500 MB | 2% of 25 GB |
| Gemini API Calls | 300/day | 20% of 1,500/day |
| Clerk Users | 20 MAU | 0.2% of 10K |
| Vercel Bandwidth | 5 GB | 5% of 100 GB |

**All comfortably within free tier limits!**

---

## 🆘 Troubleshooting

### Backend won't start on Render
- [ ] Check environment variables are all set
- [ ] Verify Database URL format includes `+asyncpg`
- [ ] Check Render logs for specific error messages
- [ ] Verify build command installed dependencies

### Frontend can't connect to backend
- [ ] Verify `NEXT_PUBLIC_API_URL` is correct
- [ ] Check CORS settings in backend
- [ ] Ensure backend is running (not sleeping)
- [ ] Test API directly in browser

### Documents stuck in "Processing"
- [ ] Check Cloudinary upload succeeded
- [ ] Verify Gemini API key is valid
- [ ] Check Qdrant connection is working
- [ ] Review backend logs for errors

### Authentication not working
- [ ] Verify Clerk keys are correct (pk_test/sk_test match environment)
- [ ] Check Clerk dashboard for application status
- [ ] Ensure JWT_SECRET is set in backend
- [ ] Test Clerk sign-in flow independently

---

## 📞 Support Resources

- **Neon Docs**: https://neon.tech/docs
- **Qdrant Docs**: https://qdrant.tech/documentation
- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Clerk Docs**: https://clerk.com/docs

---

**Estimated Total Setup Time**: 2-3 hours  
**Total Monthly Cost**: $0 (all free tiers)  
**Capacity**: 500+ active users, 10,000 documents, 45,000 queries/month  

🎉 **Ready to launch your legal AI assistant!**
