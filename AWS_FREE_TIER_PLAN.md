# JurisQuery - AWS Free Tier Deployment Plan

## 🎯 Quick Recommendation

**Want to use just ONE AWS service for 11+ months?**

**→ Use only AWS RDS PostgreSQL (20 GB database for 12 months free)**

See: **[AWS_RDS_QUICK_SETUP.md](AWS_RDS_QUICK_SETUP.md)** - 30-minute setup guide ⭐

This gives you 40x more database storage while keeping everything else on your current free services.

---

## Overview

This document covers **full AWS deployment** if you want to use multiple AWS services. For most users, we recommend the minimal approach above (just RDS).

Deploy JurisQuery entirely on **AWS Free Tier** services. AWS offers 12-month free tier access for most services, plus several "Always Free" offerings perfect for hosting your legal AI platform.

**Total Cost: $0/month** (within free tier limits for first 12 months)

---

## 🎯 AWS Free Tier Services for JurisQuery

| AWS Service | Replaces | Free Tier Limit | Duration | Good For |
|-------------|----------|-----------------|----------|----------|
| **RDS PostgreSQL** | Neon | 750 hrs/month, 20 GB storage | 12 months | Database |
| **S3** | Cloudinary | 5 GB storage, 20K GET, 2K PUT | 12 months | File storage |
| **Lambda + API Gateway** | Render | 1M requests/month, 400K GB-sec | Always Free | Backend API |
| **Amplify Hosting** | Vercel | 1000 build mins, 15 GB served | 12 months | Frontend |
| **Cognito** | Clerk | 50K MAU | Always Free | Authentication |
| **CloudFront** | CDN | 1 TB transfer, 10M requests | 12 months | Content delivery |
| **DynamoDB** | Optional cache | 25 GB storage, 25 WCU/RCU | Always Free | Caching |
| **CloudWatch** | Monitoring | 10 custom metrics, 5 GB logs | Always Free | Logging |

**Note**: Most services are free for 12 months, then pay-as-you-go. Always Free services continue indefinitely.

---

## 📋 Architecture Comparison

### Current Setup (Multi-Cloud)
```
Frontend: Vercel → Backend: Render → Database: Neon
                                    → Vector: Qdrant
                                    → Storage: Cloudinary
                                    → AI: Gemini
                                    → Auth: Clerk
```

### AWS Setup (All AWS)
```
Frontend: Amplify → API Gateway → Lambda Functions → RDS PostgreSQL
                                                    → S3 Storage
                                                    → Bedrock (AI)
                                                    → Cognito (Auth)

Vector DB: Still use Qdrant Cloud (AWS lacks native vector DB in free tier)
LLM: Still use Gemini (AWS Bedrock has costs, Gemini free tier is better)
```

### Hybrid Setup (Recommended)
```
Frontend: Amplify (AWS) or Vercel (better DX)
Backend: Lambda (AWS) or Render (easier Python deployment)
Database: RDS (AWS) - 20 GB vs Neon 0.5 GB ✨
Storage: S3 (AWS) - more control vs Cloudinary - easier
Vector: Qdrant Cloud (best free tier for vectors)
AI: Gemini (best free tier for LLM)
Auth: Cognito (AWS) or Clerk (better UX)
```

---

## 🗺️ Service-by-Service Guide

### 1. Database - Amazon RDS PostgreSQL (12 Months FREE)

**Free Tier Limits:**
- ✅ 750 hours/month of db.t2.micro (1 vCPU, 1 GB RAM)
- ✅ 20 GB SSD storage (40x more than Neon!)
- ✅ 20 GB backup storage
- ✅ Automated backups included
- ⚠️ Free for 12 months only

**Setup Steps:**

```bash
# 1. AWS Console → RDS → Create database

# Configuration:
Engine: PostgreSQL 16
Template: Free tier
DB Instance: db.t2.micro
Storage: 20 GB General Purpose SSD
Storage autoscaling: Disabled
VPC: Default VPC
Public access: Yes
Initial database: jurisquery
Master username: postgres
Master password: [secure password]

# 2. Wait for creation (5-10 minutes)

# 3. Get endpoint from RDS Console
# Example: jurisquery.xxxxxx.us-east-1.rds.amazonaws.com

# 4. Connection string for .env:
DATABASE_URL=postgresql+asyncpg://postgres:password@jurisquery.xxxxxx.us-east-1.rds.amazonaws.com:5432/jurisquery?sslmode=require
```

**Security Group Configuration:**
```bash
# RDS → Security Groups → Edit inbound rules
Type: PostgreSQL
Port: 5432
Source: Your IP (for development)
Source: Lambda Security Group (for production)
```

**Advantages over Neon:**
- ✅ 20 GB vs 0.5 GB (40x more storage)
- ✅ No auto-suspend (always available)
- ✅ Automated backups
- ✅ Better performance (dedicated instance)

**Disadvantages:**
- ❌ Only free for 12 months
- ❌ More complex setup
- ❌ Need to manage security groups

**Cost After 12 Months:** ~$15-20/month (can switch to Neon at that time)

---

### 2. File Storage - Amazon S3 (12 Months FREE)

**Free Tier Limits:**
- ✅ 5 GB standard storage
- ✅ 20,000 GET requests
- ✅ 2,000 PUT requests
- ✅ 100 GB data transfer out
- ⚠️ Free for 12 months

**Setup Steps:**

```bash
# 1. AWS Console → S3 → Create bucket

# Configuration:
Bucket name: jurisquery-documents-[unique-id]
Region: us-east-1 (or closest)
Block all public access: ❌ Uncheck (we need public read)
Versioning: Disabled
Encryption: AES-256 (default)

# 2. Set CORS policy
# S3 Bucket → Permissions → CORS configuration
```

**CORS Configuration (JSON):**
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://your-app.vercel.app", "http://localhost:3000"],
        "ExposeHeaders": ["ETag"]
    }
]
```

**Bucket Policy (for public read):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::jurisquery-documents-[unique-id]/*"
        }
    ]
}
```

**3. Create IAM User for Backend Access:**
```bash
# IAM → Users → Add user
User name: jurisquery-backend
Access type: Programmatic access

# Attach policy:
- AmazonS3FullAccess (or create custom restrictive policy)

# Copy credentials:
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=jurisquery-documents-[unique-id]
AWS_REGION=us-east-1
```

**Backend Code Changes Required:**

Create `backend/app/storage/s3_storage.py`:
```python
"""AWS S3 storage implementation."""
import boto3
from botocore.exceptions import ClientError
from app.config import settings

class S3Storage:
    """AWS S3 file storage."""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region
        )
        self.bucket_name = settings.aws_s3_bucket
    
    async def upload_file(
        self, 
        file_content: bytes, 
        filename: str,
        content_type: str = "application/pdf"
    ) -> str:
        """Upload file to S3, return public URL."""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=file_content,
                ContentType=content_type,
                ACL='public-read'  # Make publicly readable
            )
            
            # Return public URL
            url = f"https://{self.bucket_name}.s3.{settings.aws_region}.amazonaws.com/{filename}"
            return url
            
        except ClientError as e:
            raise Exception(f"S3 upload failed: {str(e)}")
    
    async def delete_file(self, filename: str) -> bool:
        """Delete file from S3."""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=filename
            )
            return True
        except ClientError as e:
            print(f"S3 delete failed: {str(e)}")
            return False
    
    async def get_file_url(self, filename: str) -> str:
        """Get public URL for file."""
        return f"https://{self.bucket_name}.s3.{settings.aws_region}.amazonaws.com/{filename}"
```

**Add to `backend/app/config.py`:**
```python
# AWS Configuration
aws_access_key_id: str
aws_secret_access_key: str
aws_s3_bucket: str
aws_region: str = "us-east-1"
```

**Update `backend/app/documents/service.py`:**
```python
# Replace Cloudinary import
from app.storage.s3_storage import S3Storage

# In upload_document function:
storage = S3Storage()
file_url = await storage.upload_file(
    file_content=file_content,
    filename=f"documents/{user_id}/{document.id}.pdf",
    content_type=file.content_type
)
```

**Advantages over Cloudinary:**
- ✅ Direct S3 integration (no third-party API)
- ✅ Lower latency with CloudFront CDN
- ✅ More control over storage

**Disadvantages:**
- ❌ More setup complexity
- ❌ Need to manage IAM permissions
- ❌ No automatic format conversions (Cloudinary feature)

**Cost After 12 Months:** ~$0.10-0.50/month for low usage

---

### 3. Backend Hosting - AWS Lambda + API Gateway (ALWAYS FREE)

**Free Tier Limits (Always Free):**
- ✅ 1 million requests/month
- ✅ 400,000 GB-seconds compute time
- ✅ Unlimited duration (no 12-month limit!)

**Important Notes:**
- Lambda has **cold starts** (~1-3 seconds first request)
- FastAPI needs to be adapted for Lambda runtime
- More complex than Render but truly free forever

**Option A: Use Mangum (FastAPI → Lambda Adapter)**

Install dependency:
```bash
cd backend
uv add mangum
```

Create `backend/lambda_handler.py`:
```python
"""AWS Lambda handler for FastAPI app."""
from mangum import Mangum
from app.main import app

# Wrap FastAPI app for Lambda
handler = Mangum(app, lifespan="off")
```

**Deploy with AWS SAM:**

Create `backend/template.yaml`:
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: JurisQuery Backend API

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Runtime: python3.12
    Environment:
      Variables:
        DATABASE_URL: !Ref DatabaseUrl
        GEMINI_API_KEY: !Ref GeminiApiKey
        # Add all environment variables here

Resources:
  JurisQueryAPI:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: lambda_handler.handler
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
  
Parameters:
  DatabaseUrl:
    Type: String
    NoEcho: true
  GeminiApiKey:
    Type: String
    NoEcho: true
```

**Deploy:**
```bash
# Install SAM CLI
pip install aws-sam-cli

# Build
sam build

# Deploy
sam deploy --guided
```

**Option B: Keep Using Render (Easier)**

Lambda is powerful but complex. If you prefer simplicity:
- ✅ Keep backend on Render (free tier: 750 hrs/month)
- ✅ Use AWS only for database (RDS) and storage (S3)
- ✅ Much easier deployment workflow

**Recommendation:** Start with Render, migrate to Lambda later if needed.

---

### 4. Frontend Hosting - AWS Amplify (12 Months FREE)

**Free Tier Limits:**
- ✅ 1000 build minutes/month
- ✅ 15 GB served/month
- ✅ 5 GB storage
- ⚠️ Free for 12 months

**Setup Steps:**

```bash
# 1. Push code to GitHub (already done)

# 2. AWS Console → Amplify → New app → Host web app

# 3. Connect repository
Source: GitHub
Repository: JurisQuery
Branch: main

# 4. Configure build settings
App name: JurisQuery
Framework: Next.js
Build command: (auto-detected)
Output directory: .next

# 5. Advanced settings → Environment variables
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# 6. Save and deploy
```

**Custom Domain (Optional):**
```bash
# Amplify → App settings → Domain management
# Add custom domain (e.g., jurisquery.com)
# Follow DNS verification steps
```

**Advantages over Vercel:**
- ✅ Integrated with other AWS services
- ✅ CloudFront CDN included
- ✅ Good for AWS-centric architectures

**Disadvantages:**
- ❌ Slower builds than Vercel
- ❌ Less mature DX (developer experience)
- ❌ Only free for 12 months

**Recommendation:** Stick with Vercel unless you need AWS integration. Vercel's free tier is permanent.

**Cost After 12 Months:** ~$5-10/month

---

### 5. Authentication - Amazon Cognito (ALWAYS FREE)

**Free Tier Limits (Always Free):**
- ✅ 50,000 monthly active users (MAU)
- ✅ SAML, OAuth 2.0 support
- ✅ Social login (Google, Facebook, etc.)
- ✅ MFA included
- ✅ **No time limit!**

**Setup Steps:**

```bash
# 1. AWS Console → Cognito → Create user pool

# User pool configuration:
User pool name: jurisquery-users
Sign-in options: ✓ Email, ✓ Username
Password policy: Default (8 chars min)
MFA: Optional
Email delivery: Cognito (free, 50 emails/day) or SES

# 2. App client configuration:
App client name: jurisquery-web
Authentication flows: ✓ ALLOW_USER_PASSWORD_AUTH
                     ✓ ALLOW_REFRESH_TOKEN_AUTH

# 3. Copy credentials:
User Pool ID: us-east-1_xxxxxxxxx
App Client ID: xxxxxxxxxxxxxxxxxxxxx
```

**Frontend Integration (React/Next.js):**

Install AWS Amplify:
```bash
cd frontend
npm install aws-amplify @aws-amplify/ui-react
```

Create `frontend/src/lib/cognito.ts`:
```typescript
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      region: 'us-east-1',
      loginWith: {
        email: true,
        oauth: {
          domain: 'jurisquery.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: ['http://localhost:3000/'],
          redirectSignOut: ['http://localhost:3000/'],
          responseType: 'code',
        }
      }
    }
  }
});
```

**Environment Variables:**
```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=us-east-1
```

**Backend JWT Validation:**

Install dependency:
```bash
cd backend
uv add python-jose[cryptography] pyjwt
```

Update `backend/app/auth/dependencies.py`:
```python
from jose import jwt, JWTError
import requests

COGNITO_REGION = "us-east-1"
COGNITO_USER_POOL_ID = "us-east-1_xxxxxxxxx"
JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"

# Cache JWKS keys
jwks = requests.get(JWKS_URL).json()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate Cognito JWT token."""
    try:
        # Decode and verify token
        claims = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=COGNITO_CLIENT_ID
        )
        return claims
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

**Advantages over Clerk:**
- ✅ 50K MAU vs 10K MAU (5x more!)
- ✅ Always free (no time limit)
- ✅ Full AWS integration
- ✅ Advanced features (MFA, risk-based auth)

**Disadvantages:**
- ❌ More complex setup
- ❌ Less user-friendly UI than Clerk
- ❌ More code to write

**Recommendation:** 
- **Use Clerk** for faster development and better UX
- **Use Cognito** if you need 50K+ users on free tier

---

### 6. CDN - Amazon CloudFront (12 Months FREE)

**Free Tier Limits:**
- ✅ 1 TB data transfer out
- ✅ 10 million HTTP/HTTPS requests
- ✅ 2 million CloudFront function invocations
- ⚠️ Free for 12 months

**Use Cases:**
- Speed up S3 file delivery (documents, images)
- Cache API responses at edge locations
- Reduce S3 data transfer costs

**Setup for S3:**
```bash
# AWS Console → CloudFront → Create distribution

Origin domain: jurisquery-documents-[id].s3.us-east-1.amazonaws.com
Origin path: (leave empty)
Origin access: Public
Viewer protocol: Redirect HTTP to HTTPS
Cache policy: CachingOptimized
Price class: Use all edge locations

# After creation, get CloudFront URL:
# https://d1234567890abc.cloudfront.net
```

**Update S3 URLs in Backend:**
```python
# Instead of:
url = f"https://{bucket}.s3.{region}.amazonaws.com/{filename}"

# Use CloudFront:
url = f"https://d1234567890abc.cloudfront.net/{filename}"
```

**Benefit:** Faster global access, reduced latency

**Cost After 12 Months:** ~$1-5/month for low traffic

---

### 7. Monitoring - Amazon CloudWatch (ALWAYS FREE)

**Free Tier Limits (Always Free):**
- ✅ 10 custom metrics
- ✅ 5 GB log ingestion
- ✅ 5 GB log storage
- ✅ 1 million API requests

**Setup:**
```bash
# Automatic for Lambda, RDS, S3
# View in: CloudWatch → Dashboards

# Create alarms:
# CloudWatch → Alarms → Create alarm
# Metric: RDS → CPU Utilization
# Threshold: > 80%
# Action: SNS topic → Email notification
```

**Backend Logging to CloudWatch:**

Install SDK:
```bash
uv add boto3
```

Create logger:
```python
import boto3
import json
from datetime import datetime

cloudwatch = boto3.client('logs', region_name='us-east-1')

def log_to_cloudwatch(message: str, level: str = "INFO"):
    """Send log to CloudWatch."""
    log_group = "/jurisquery/backend"
    log_stream = datetime.now().strftime("%Y-%m-%d")
    
    cloudwatch.put_log_events(
        logGroupName=log_group,
        logStreamName=log_stream,
        logEvents=[{
            'timestamp': int(datetime.now().timestamp() * 1000),
            'message': json.dumps({
                'level': level,
                'message': message,
                'timestamp': datetime.now().isoformat()
            })
        }]
    )
```

---

## 📊 Cost Comparison: AWS vs Multi-Cloud

### Year 1 (Free Tier Active)

| Service | AWS Cost | Multi-Cloud Cost | Savings |
|---------|----------|------------------|---------|
| Database | $0 | $0 (Neon free) | Equal |
| Storage | $0 | $0 (Cloudinary free) | Equal |
| Backend | $0 (Lambda) | $0 (Render free) | Equal |
| Frontend | $0 | $0 (Vercel free) | Equal |
| Auth | $0 | $0 (Clerk free) | Equal |
| CDN | $0 | $0 (included) | Equal |
| **TOTAL** | **$0/month** | **$0/month** | **Equal** |

### Year 2+ (After AWS Free Tier Expires)

| Service | AWS Cost | Multi-Cloud Cost | Winner |
|---------|----------|------------------|--------|
| Database | $15-20 | $0 (stay on Neon) | Multi-Cloud |
| Storage | $0.50 | $0 (Cloudinary free) | Multi-Cloud |
| Backend | $0 (Lambda) | $0 (Render free) | Equal |
| Frontend | $5-10 | $0 (Vercel always free) | Multi-Cloud |
| Auth | $0 (Cognito) | $0 (Clerk free tier) | Equal |
| **TOTAL** | **~$20-30/month** | **$0/month** | **Multi-Cloud Wins** |

**Verdict:** Use AWS for Year 1 to get more storage (20 GB vs 0.5 GB), then migrate database back to Neon and frontend to Vercel to stay free forever.

---

## 🚀 Recommended Hybrid Architecture

### Best of Both Worlds

```yaml
Database:
  Year 1: AWS RDS (20 GB, better performance)
  Year 2+: Migrate to Neon (stay free)

Storage:
  Option A: AWS S3 (more control)
  Option B: Cloudinary (easier, always free)
  Recommendation: Cloudinary for simplicity

Backend:
  Option A: AWS Lambda (always free, cold starts)
  Option B: Render (always free, easier Python)
  Recommendation: Render for FastAPI simplicity

Frontend:
  Always: Vercel (best DX, always free)

Vector DB:
  Always: Qdrant Cloud (best free vector DB)

AI/LLM:
  Always: Google Gemini (best free tier)

Auth:
  Option A: AWS Cognito (50K MAU, always free)
  Option B: Clerk (10K MAU, better UX)
  Recommendation: Clerk for faster development
```

---

## ✅ AWS-Specific Setup Checklist

### Phase 1: AWS Account Setup
- [ ] Create AWS account at https://aws.amazon.com
- [ ] Verify email and phone
- [ ] Add payment method (won't be charged on free tier)
- [ ] Enable MFA on root account (security best practice)
- [ ] Create IAM user for daily use (don't use root)

### Phase 2: Database (30 min)
- [ ] Create RDS PostgreSQL instance (db.t2.micro)
- [ ] Configure security group (port 5432 access)
- [ ] Get endpoint and create connection string
- [ ] Test connection from local machine
- [ ] Run Alembic migrations: `alembic upgrade head`

### Phase 3: Storage (20 min)
- [ ] Create S3 bucket `jurisquery-documents-[unique-id]`
- [ ] Configure bucket policy for public read
- [ ] Set CORS configuration
- [ ] Create IAM user with S3 permissions
- [ ] Get AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- [ ] Update backend code to use S3Storage class

### Phase 4: Backend (Choose One)

**Option A: Lambda (Complex but Always Free)**
- [ ] Install AWS SAM CLI
- [ ] Add Mangum to dependencies
- [ ] Create lambda_handler.py
- [ ] Create template.yaml
- [ ] Deploy with `sam deploy --guided`
- [ ] Get API Gateway URL
- [ ] Test endpoints

**Option B: Keep Render (Easier)**
- [ ] Keep current Render deployment
- [ ] Just update DATABASE_URL to RDS
- [ ] Update storage to use S3 or keep Cloudinary

### Phase 5: Frontend (Choose One)

**Option A: AWS Amplify**
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Deploy and test

**Option B: Keep Vercel (Recommended)**
- [ ] Keep current Vercel deployment
- [ ] Update API_URL if using Lambda

### Phase 6: Auth (Optional)
- [ ] Create Cognito User Pool
- [ ] Configure app client
- [ ] Update frontend to use Amplify Auth
- [ ] Update backend JWT validation
- [ ] Test sign-up and login flow

### Phase 7: Monitoring
- [ ] Set up CloudWatch dashboards
- [ ] Create alarms for RDS CPU, storage
- [ ] Enable S3 access logging
- [ ] Configure SNS for email alerts

---

## 🎯 Migration Strategy

### Immediate (Keep Most Current Services)
```
✅ Switch: Use AWS RDS instead of Neon (20 GB vs 0.5 GB)
✅ Keep: Everything else on current providers
✅ Benefit: 40x more database storage
✅ Risk: Low (only database changes)
```

### Month 6 (Evaluate Performance)
```
📊 Review: Database usage, storage needs
🔄 Decide: Keep RDS or prepare to migrate back to Neon
📈 Optimize: Query performance, indexing
```

### Month 11 (Before Free Tier Ends)
```
⚠️ Warning: AWS free tier expires in Month 12
🔄 Migrate: Database back to Neon (free forever)
🔄 Migrate: Frontend from Amplify to Vercel (if using)
✅ Keep: S3 if costs are low (<$1/month)
```

### Post-Migration Architecture
```
Database: Neon (free forever)
Storage: Cloudinary or S3 (<$1/month)
Backend: Render (free tier) or Lambda (free forever)
Frontend: Vercel (free forever)
Vector: Qdrant (free tier)
AI: Gemini (free tier)
Auth: Clerk (free tier)

Total Cost: $0-1/month forever
```

---

## 🔧 Environment Variables for AWS Setup

### Backend `.env` with AWS Services

```bash
# Database - AWS RDS
DATABASE_URL=postgresql+asyncpg://postgres:password@jurisquery.xxxxxx.us-east-1.rds.amazonaws.com:5432/jurisquery?sslmode=require

# Storage - AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=jurisquery-documents-12345
AWS_REGION=us-east-1
AWS_CLOUDFRONT_DOMAIN=d1234567890abc.cloudfront.net  # Optional

# AI Services (Keep Gemini - best free tier)
GEMINI_API_KEY=AIza...
GEMINI_API_KEY_2=AIza...

# Vector DB (Keep Qdrant - no good AWS alternative in free tier)
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=...

# Auth - AWS Cognito (or keep Clerk)
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1

# App Config
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://your-app.vercel.app
```

---

## 📚 AWS Resources

### Official Documentation
- **RDS Free Tier**: https://aws.amazon.com/rds/free/
- **S3 Pricing**: https://aws.amazon.com/s3/pricing/
- **Lambda Free Tier**: https://aws.amazon.com/lambda/pricing/
- **Amplify Pricing**: https://aws.amazon.com/amplify/pricing/
- **Cognito Pricing**: https://aws.amazon.com/cognito/pricing/

### Tutorials
- **RDS PostgreSQL Setup**: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html
- **S3 Python SDK**: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/s3-examples.html
- **FastAPI on Lambda**: https://github.com/jordaneremieff/mangum

---

## ⚡ Quick Start: Minimal AWS Integration

**Fastest way to try AWS (30 minutes):**

### Step 1: Just Add RDS Database (Biggest Benefit)

```bash
# 1. Create RDS PostgreSQL (db.t2.micro, 20 GB)
# 2. Get connection string
# 3. Update .env:
DATABASE_URL=postgresql+asyncpg://postgres:password@your-rds-endpoint:5432/jurisquery?sslmode=require

# 4. Run migrations
cd backend
alembic upgrade head

# 5. Test
uv run uvicorn app.main:app --reload
```

**That's it!** You now have 40x more database storage (20 GB vs 0.5 GB) for free for 12 months.

Keep everything else the same:
- ✅ Cloudinary for storage (easier than S3)
- ✅ Render for backend (easier than Lambda)
- ✅ Vercel for frontend (better than Amplify)
- ✅ Clerk for auth (better UX than Cognito)

---

## 💡 Final Recommendation

### For Your Use Case (JurisQuery):

```
✅ USE AWS FOR:
  - Database (RDS): 20 GB storage is worth it for Year 1

❌ DON'T USE AWS FOR:
  - Storage: Cloudinary is easier, always free
  - Backend: Render is easier for FastAPI
  - Frontend: Vercel has better DX
  - Auth: Clerk has better UX
  - Vector DB: Qdrant is best free option
  - AI: Gemini has best free LLM tier

RESULT:
  - Hybrid approach: RDS + your current stack
  - Year 1: Get 20 GB database free
  - Year 2: Migrate back to Neon, stay free forever
```

---

## 🎉 Summary

**Can you use AWS for free?** YES!

**Should you use AWS for everything?** NO - hybrid is better!

**Best Strategy:**
1. Use AWS RDS for database (Year 1: 20 GB free)
2. Keep Cloudinary, Render, Vercel, Clerk (always free)
3. Month 11: Migrate database back to Neon
4. Stay 100% free forever after Year 1

**Total Year 1 Cost:** $0  
**Total Year 2+ Cost:** $0  
**Extra Database Storage Year 1:** 20 GB vs 0.5 GB (40x more!)

---

*For full multi-cloud free tier setup, see: [CLOUD_SERVICES_FREE_TIER_PLAN.md](CLOUD_SERVICES_FREE_TIER_PLAN.md)*

*Last Updated: March 1, 2026*
