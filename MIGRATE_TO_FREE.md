# Migrate to Free Tier (Netlify + Neon)

## 🎯 Goal: $0/month instead of $17-25/month

---

## Step 1: Create Neon Database (5 min)

1. Go to: https://neon.tech
2. Click **"Sign Up"** (use GitHub for instant signup)
3. Click **"Create Project"**
   - Name: `civitron`
   - Region: **US East (Ohio)** or **US East (N. Virginia)**
   - PostgreSQL version: 16 (default)
4. Copy your connection string - looks like:
   ```
   postgresql://neondb_owner:AbCdEf123@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Import Database Schema to Neon

### Option A: Using Neon Console (Easiest)
1. In Neon dashboard, click **"SQL Editor"**
2. Open `database/schema.sql` in VS Code
3. Copy the entire contents
4. Paste into Neon SQL Editor
5. Click **"Run"**

### Option B: Using psql (if you have it installed)
```bash
# Get connection string from Neon dashboard
psql "postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" -f database/schema.sql
```

---

## Step 3: Update Scraper Backend Configuration

Edit `scraper-backend/.env`:

```bash
# Replace AWS RDS with Neon
POSTGRES_HOST=ep-xxxxx.us-east-2.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=your-neon-password
POSTGRES_SSL=true

# Rest stays the same
CONGRESS_API_KEY=your-congress-api-key
OPENSTATES_API_KEY=your-openstates-api-key
SCRAPE_INTERVAL_HOURS=24
LOG_LEVEL=info
```

Test connection:
```bash
cd scraper-backend
npx tsx src/test-connection.ts
```

---

## Step 4: Update Netlify Functions

Edit root `.env` file (for Netlify functions):

```bash
# Replace with Neon connection string
DATABASE_URL=postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Or individual variables
POSTGRES_HOST=ep-xxxxx.us-east-2.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=your-neon-password
```

---

## Step 5: Deploy to Netlify

### Configure Environment Variables in Netlify Dashboard
1. Go to: https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add these variables:
   ```
   DATABASE_URL = postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   CONGRESS_API_KEY = your-key
   OPENSTATES_API_KEY = your-key
   ```

### Deploy
```bash
# Build frontend
npm run build

# Deploy to Netlify (if not already connected)
netlify deploy --prod

# Or if using Git deployment (recommended):
git add .
git commit -m "Migrate to Neon database"
git push
```

Netlify will automatically deploy on git push if connected!

---

## Step 6: Migrate Data from AWS RDS to Neon (Optional)

If you have data in AWS RDS you want to keep:

```bash
# Dump from AWS RDS
pg_dump -h civitron-db.cxagg6kocuov.us-east-1.rds.amazonaws.com -U postgres -d postgres > backup.sql

# Import to Neon
psql "postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" < backup.sql
```

---

## Step 7: Test Everything

### Test Scraper Backend
```bash
cd scraper-backend
npx tsx src/test-connection.ts
# Should show: ✅ Database connected
```

### Test Local Development
```bash
npm run dev
# Visit: http://localhost:8888
```

### Test Production
```bash
# Visit your Netlify URL
# Check: https://your-site.netlify.app
```

---

## Step 8: Clean Up AWS (Save $17-25/month!)

### Delete AWS Resources
```bash
# Delete RDS instance
aws rds delete-db-instance --db-instance-identifier civitron-db --skip-final-snapshot --region us-east-1

# Delete RDS subnet group
aws rds delete-db-subnet-group --db-subnet-group-name civitron-subnet-group --region us-east-1

# Delete security group (after RDS is deleted)
aws ec2 delete-security-group --group-id sg-0f50612ce48be443b --region us-east-1

# Delete S3 bucket
aws s3 rb s3://imodernize.dev --force --region us-east-1

# Delete CloudFront distribution (first disable it, wait 10 min, then delete)
aws cloudfront get-distribution-config --id E1DPSNZRFQ7KCS > dist-config.json
# Edit dist-config.json: change "Enabled": true to "Enabled": false
aws cloudfront update-distribution --id E1DPSNZRFQ7KCS --if-match <ETag> --distribution-config file://dist-config.json
# Wait 10 minutes for deployment
aws cloudfront delete-distribution --id E1DPSNZRFQ7KCS --if-match <ETag>

# Delete Route 53 hosted zone (after deleting all records except NS and SOA)
aws route53 delete-hosted-zone --id Z08121151HAT31F67V5H

# Delete SSL certificate (after CloudFront is deleted)
aws acm delete-certificate --certificate-arn arn:aws:acm:us-east-1:905418332668:certificate/2f352224-4195-41cd-a892-9f977f7895db --region us-east-1
```

---

## Step 9: Configure Custom Domain on Netlify

### Option A: Use Netlify DNS (Easiest)
1. Go to **Domain settings** in Netlify
2. Click **"Add custom domain"**
3. Enter: `imodernize.dev`
4. Follow instructions to update name servers at your registrar
5. Netlify automatically provisions SSL (free via Let's Encrypt)

### Option B: Use Cloudflare DNS (Free + Better)
1. Go to: https://cloudflare.com
2. Add your domain: `imodernize.dev`
3. Update name servers at your registrar
4. In Cloudflare DNS, add CNAME:
   - Name: `@` or `imodernize.dev`
   - Target: `your-site.netlify.app`
   - Proxy: ON (orange cloud)
5. Add CNAME for www:
   - Name: `www`
   - Target: `your-site.netlify.app`
   - Proxy: ON
6. SSL/TLS mode: **Full** or **Full (strict)**

---

## ✅ Migration Complete!

### What You Get:
- ✅ **$0/month** hosting (vs $17-25 on AWS)
- ✅ Same functionality
- ✅ Better performance (Netlify global CDN)
- ✅ Automatic SSL certificates
- ✅ Continuous deployment from Git
- ✅ 0.5GB database (plenty for your use case)
- ✅ 100GB bandwidth/month

### Upgrade Path (when needed):
- **Netlify Pro**: $19/mo (100GB bandwidth)
- **Neon Scale**: $19/mo (10GB database)
- **Total at scale**: $38/mo (still 40% cheaper than AWS!)

---

## Support

- **Neon Docs**: https://neon.tech/docs
- **Netlify Docs**: https://docs.netlify.com
- **Your Neon Dashboard**: https://console.neon.tech
- **Your Netlify Dashboard**: https://app.netlify.com
