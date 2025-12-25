# AWS Production Deployment Guide

## Architecture Overview

```
Your Domain (civitron.com)
    ↓
CloudFront CDN (Frontend)
    ↓
S3 Bucket (Static React App)

API (api.civitron.com)
    ↓
API Gateway
    ↓
Lambda Functions (API Backend)
    ↓
RDS PostgreSQL (Database)
    ↑
Your PC (Scraper Backend)
```

## Cost Estimate (AWS)

### Free Tier (First 12 Months)
- **RDS db.t4g.micro**: Free 750 hours/month
- **Lambda**: 1M requests/month free
- **CloudFront**: 1TB transfer/month free
- **S3**: 5GB storage free
- **Route 53**: $0.50/month (per hosted zone)
- **Total**: ~$0.50/month

### After Free Tier
- **RDS db.t4g.micro**: ~$15/month (1 vCPU, 1GB RAM)
- **Lambda**: ~$0 (125K requests = ~$0.25)
- **CloudFront**: ~$1-5/month (depends on traffic)
- **S3**: ~$0.50/month
- **Route 53**: $0.50/month
- **Total**: ~$17-21/month

## Prerequisites

- AWS Account
- Domain name purchased (GoDaddy, Namecheap, etc.)
- AWS CLI installed: `aws configure`
- Your custom domain (e.g., civitron.com)

---

## Part 1: Setup RDS PostgreSQL

### 1.1 Create RDS Instance

```bash
# Create security group for RDS
aws ec2 create-security-group \
  --group-name civitron-rds-sg \
  --description "PostgreSQL database for Civitron"

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
  --group-names civitron-rds-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow PostgreSQL access from anywhere (we'll restrict later)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0

# Create RDS instance (free tier eligible)
aws rds create-db-instance \
  --db-instance-identifier civitron-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username postgres \
  --master-user-password "YOUR_SECURE_PASSWORD_HERE" \
  --allocated-storage 20 \
  --vpc-security-group-ids $SG_ID \
  --backup-retention-period 7 \
  --publicly-accessible \
  --storage-encrypted
```

**Wait 10-15 minutes for RDS to be available.**

### 1.2 Get RDS Endpoint

```bash
aws rds describe-db-instances \
  --db-instance-identifier civitron-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

Save this endpoint (e.g., `civitron-db.xxxxx.us-east-1.rds.amazonaws.com`)

### 1.3 Connect and Setup Schema

```bash
# Install psql if you don't have it
# Windows: Download from https://www.postgresql.org/download/windows/

# Connect to RDS
psql -h civitron-db.xxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d postgres

# In psql:
CREATE DATABASE civitron;
\c civitron
\i database/schema.sql
\q
```

---

## Part 2: Deploy Frontend to S3 + CloudFront

### 2.1 Build Frontend

```bash
# Build production bundle
npm run build

# Should create dist/ directory with static files
```

### 2.2 Create S3 Bucket

```bash
# Replace with your domain
DOMAIN="civitron.com"

# Create bucket
aws s3 mb s3://$DOMAIN

# Enable static website hosting
aws s3 website s3://$DOMAIN \
  --index-document index.html \
  --error-document index.html
```

### 2.3 Upload Frontend

```bash
# Upload all files
aws s3 sync dist/ s3://$DOMAIN/ \
  --delete \
  --cache-control "max-age=31536000"

# Upload index.html with no cache (for updates)
aws s3 cp dist/index.html s3://$DOMAIN/index.html \
  --cache-control "no-cache"
```

### 2.4 Create CloudFront Distribution

```bash
# Create CloudFront distribution (returns distribution ID)
aws cloudfront create-distribution \
  --origin-domain-name $DOMAIN.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html
```

**Wait 15-20 minutes for CloudFront to deploy.**

Get your CloudFront domain:
```bash
# Get CloudFront domain (e.g., d1234567890.cloudfront.net)
aws cloudfront list-distributions \
  --query "DistributionList.Items[0].DomainName" \
  --output text
```

---

## Part 3: Deploy API Backend (Lambda + API Gateway)

### Option A: Using Serverless Framework (Recommended)

#### 3.1 Install Serverless

```bash
npm install -g serverless
serverless --version
```

#### 3.2 Create Serverless Config

Create `serverless.yml` in project root:

```yaml
service: civitron-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  stage: prod
  environment:
    POSTGRES_HOST: civitron-db.xxxxx.us-east-1.rds.amazonaws.com
    POSTGRES_PORT: 5432
    POSTGRES_DB: civitron
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${env:POSTGRES_PASSWORD}
    USE_POSTGRESQL: true
    CONGRESS_API_KEY: ${env:CONGRESS_API_KEY}
    OPENSTATES_API_KEY: ${env:OPENSTATES_API_KEY}

functions:
  stateEvents:
    handler: netlify/functions/state-events.handler
    events:
      - httpApi:
          path: /state-events
          method: get
    timeout: 30
    memorySize: 512

  congressMeetings:
    handler: netlify/functions/congress-meetings.handler
    events:
      - httpApi:
          path: /congress-meetings
          method: get
    timeout: 30
    memorySize: 512

  localMeetings:
    handler: netlify/functions/local-meetings.handler
    events:
      - httpApi:
          path: /local-meetings
          method: get
    timeout: 30
    memorySize: 512

  topEvents:
    handler: netlify/functions/top-events.handler
    events:
      - httpApi:
          path: /top-events
          method: get
    timeout: 15
    memorySize: 256

  adminEvents:
    handler: netlify/functions/admin-events.handler
    events:
      - httpApi:
          path: /admin-events
          method: get
    timeout: 30
    memorySize: 512

plugins:
  - serverless-offline

package:
  exclude:
    - node_modules/**
    - .git/**
    - dist/**
    - src/**
```

#### 3.3 Deploy API

```bash
# Set environment variables
export POSTGRES_PASSWORD="your-rds-password"
export CONGRESS_API_KEY="your-key"
export OPENSTATES_API_KEY="your-key"

# Deploy
serverless deploy --verbose
```

This will output your API Gateway URL (e.g., `https://xxxxx.execute-api.us-east-1.amazonaws.com`)

### Option B: Manual Lambda Setup (Alternative)

If you prefer manual setup, see the detailed steps in the appendix below.

---

## Part 4: Setup Custom Domain with Route 53

### 4.1 Create Hosted Zone

```bash
DOMAIN="civitron.com"

# Create hosted zone
aws route53 create-hosted-zone \
  --name $DOMAIN \
  --caller-reference $(date +%s)
```

### 4.2 Get Name Servers

```bash
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='$DOMAIN.'].Id" \
  --output text
```

Then get name servers:
```bash
aws route53 get-hosted-zone \
  --id /hostedzone/ZXXXXX \
  --query "DelegationSet.NameServers" \
  --output text
```

### 4.3 Update Domain Registrar

Go to your domain registrar (GoDaddy, Namecheap, etc.) and update the name servers to the AWS Route 53 name servers from above.

**Wait 2-48 hours for DNS propagation.**

### 4.4 Request SSL Certificate (ACM)

```bash
# Must be in us-east-1 for CloudFront
aws acm request-certificate \
  --domain-name $DOMAIN \
  --domain-name "www.$DOMAIN" \
  --domain-name "api.$DOMAIN" \
  --validation-method DNS \
  --region us-east-1
```

Get certificate ARN:
```bash
aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" \
  --output text
```

### 4.5 Validate Certificate

```bash
# Get validation CNAME records
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:xxxxx:certificate/xxxxx \
  --region us-east-1 \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord"
```

Add the CNAME record to Route 53 (or use AWS Console for easier validation).

### 4.6 Update CloudFront with Custom Domain

```bash
# Get CloudFront distribution ID
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[0].Id" \
  --output text)

# Update distribution (complex JSON config)
# Recommended: Use AWS Console for this step
# CloudFront → Distributions → Edit → Alternate Domain Names (CNAMEs)
# Add: civitron.com, www.civitron.com
# SSL Certificate: Select your ACM certificate
```

### 4.7 Create Route 53 Records

```bash
# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='$DOMAIN.'].Id" \
  --output text | cut -d'/' -f3)

# Create A record for root domain (civitron.com → CloudFront)
cat > route53-root.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "$DOMAIN",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "d1234567890.cloudfront.net",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://route53-root.json

# Create CNAME for www.civitron.com → civitron.com
cat > route53-www.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "www.$DOMAIN",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "$DOMAIN"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://route53-www.json

# Create CNAME for api.civitron.com → API Gateway
cat > route53-api.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "api.$DOMAIN",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "xxxxx.execute-api.us-east-1.amazonaws.com"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://route53-api.json
```

---

## Part 5: Configure Scraper Backend

### 5.1 Update scraper-backend/.env

```bash
cd scraper-backend
cp .env.example .env
```

Edit `.env`:
```env
POSTGRES_HOST=civitron-db.xxxxx.us-east-1.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-rds-password
POSTGRES_SSL=true

CONGRESS_API_KEY=your-key
OPENSTATES_API_KEY=your-key
SCRAPE_INTERVAL_HOURS=24
```

### 5.2 Test Connection

```bash
npm install
npm test
```

Should show: ✅ Database connection successful

### 5.3 Initial Scrape

```bash
npm run scrape
```

### 5.4 Start Scheduler

```bash
npm start
# Or setup PM2 as described in scraper-backend/README.md
```

---

## Part 6: Update Frontend API URLs

### 6.1 Update Vite Config

Edit `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5341,
    proxy: {
      '/.netlify/functions': {
        target: 'https://api.civitron.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.netlify\/functions/, '')
      }
    }
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://api.civitron.com')
  }
});
```

### 6.2 Rebuild and Redeploy

```bash
npm run build
aws s3 sync dist/ s3://civitron.com/ --delete
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

---

## Testing

### Test Frontend
```
https://civitron.com
https://www.civitron.com
```

### Test API
```bash
curl https://api.civitron.com/state-events?state=CA
curl https://api.civitron.com/congress-meetings
```

### Verify Database
```bash
psql -h civitron-db.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d civitron

# In psql:
SELECT state_code, COUNT(*) FROM events GROUP BY state_code;
```

---

## Deployment Checklist

- [ ] RDS PostgreSQL created and accessible
- [ ] Database schema imported
- [ ] S3 bucket created with website hosting
- [ ] Frontend built and uploaded to S3
- [ ] CloudFront distribution created
- [ ] SSL certificate requested and validated
- [ ] API Lambda functions deployed
- [ ] Route 53 hosted zone created
- [ ] Name servers updated at registrar
- [ ] DNS records created (A, CNAME for api)
- [ ] CloudFront configured with custom domain
- [ ] Scraper backend configured with RDS credentials
- [ ] Initial scrape completed
- [ ] PM2 setup for scraper backend

---

## Ongoing Maintenance

### Update Frontend
```bash
npm run build
aws s3 sync dist/ s3://civitron.com/ --delete
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### Update API
```bash
serverless deploy
```

### Monitor Scraper
```bash
pm2 logs civitron-scraper
pm2 status
```

### Database Backups
RDS automatically backs up daily (7-day retention configured).

Manual backup:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier civitron-db \
  --db-snapshot-identifier civitron-backup-$(date +%Y%m%d)
```

---

## Cost Optimization

1. **RDS**: Use db.t4g.micro (free tier eligible, $15/month after)
2. **Lambda**: Stay under 1M requests/month (free)
3. **S3**: Enable lifecycle rules to delete old objects
4. **CloudFront**: Use cache effectively (31536000 seconds for assets)
5. **Route 53**: Only pay for hosted zone ($0.50/month) + queries ($0.40/million)

**Estimated Total: $17-25/month after free tier**

---

## Troubleshooting

### RDS Connection Timeout
- Check security group allows your IP on port 5432
- Verify RDS is publicly accessible
- Check VPC route tables

### CloudFront 403 Errors
- Verify S3 bucket policy allows CloudFront
- Check origin settings
- Invalidate cache

### Lambda Timeout
- Increase timeout in serverless.yml (max 30 seconds)
- Check database connection pooling
- Monitor CloudWatch logs

### DNS Not Resolving
- Wait up to 48 hours for propagation
- Verify name servers at registrar match Route 53
- Use `dig civitron.com` to check DNS

---

## Appendix: Manual Lambda Setup

If not using Serverless Framework, follow AWS Console:

1. **Create Lambda Functions**
   - Runtime: Node.js 20.x
   - Handler: `netlify/functions/state-events.handler`
   - Timeout: 30 seconds
   - Memory: 512 MB
   - Environment variables: POSTGRES_HOST, etc.

2. **Create API Gateway**
   - REST API
   - Create resources: /state-events, /congress-meetings, etc.
   - Integrate with Lambda functions
   - Deploy to prod stage

3. **Configure Custom Domain**
   - API Gateway → Custom domain names
   - Add api.civitron.com
   - Map to prod stage

---

## Security Recommendations

1. **RDS**: Restrict security group to specific IPs (your PC, Lambda VPC)
2. **Lambda**: Use IAM roles, no hardcoded credentials
3. **S3**: Use CloudFront OAI (Origin Access Identity)
4. **API Gateway**: Enable API key/usage plans for rate limiting
5. **Secrets**: Use AWS Secrets Manager for sensitive data

---

## Next Steps After Deployment

1. Setup CloudWatch alarms for RDS, Lambda errors
2. Enable AWS WAF for CloudFront (DDoS protection)
3. Configure backup retention policies
4. Setup monitoring dashboard
5. Document runbooks for common operations
