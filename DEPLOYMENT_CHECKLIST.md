# AWS + Custom Domain Deployment Checklist

Use this checklist to track your deployment progress.

## Prerequisites ✓
- [ ] AWS account created
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS credentials configured (`aws configure`)
- [ ] Domain name purchased (e.g., civitron.com)
- [ ] Node.js 20+ installed
- [ ] PostgreSQL client installed (psql)

## Phase 1: Infrastructure Setup (Day 1)

### RDS PostgreSQL Database
- [ ] Create security group for RDS
- [ ] Launch RDS db.t4g.micro instance
- [ ] Wait for RDS to be available (~15 min)
- [ ] Get RDS endpoint address
- [ ] Test connection: `psql -h ENDPOINT -U postgres`
- [ ] Create civitron database
- [ ] Import schema: `\i database/schema.sql`
- [ ] Verify tables created: `\dt`

**Time: 30 minutes**

### S3 + CloudFront (Frontend)
- [ ] Build frontend: `npm run build`
- [ ] Create S3 bucket with domain name
- [ ] Enable static website hosting
- [ ] Upload dist/ to S3
- [ ] Create CloudFront distribution
- [ ] Wait for CloudFront deployment (~20 min)
- [ ] Get CloudFront domain (d1234.cloudfront.net)
- [ ] Test CloudFront URL loads site

**Time: 30 minutes**

### Route 53 (DNS)
- [ ] Create Route 53 hosted zone for domain
- [ ] Get Route 53 name servers (4 addresses)
- [ ] Update domain registrar with Route 53 name servers
- [ ] Create Route 53 A record (domain → CloudFront)
- [ ] Wait for DNS propagation (2-48 hours)

**Time: 15 minutes (+ wait time)**

## Phase 2: SSL & Custom Domain (Day 1-2)

### SSL Certificate (ACM)
- [ ] Request certificate in us-east-1 region
- [ ] Include: yourdomain.com, www.yourdomain.com, api.yourdomain.com
- [ ] Choose DNS validation
- [ ] Get validation CNAME records
- [ ] Create CNAME records in Route 53
- [ ] Wait for certificate validation (~5-30 min)
- [ ] Verify status: "Issued"

**Time: 30 minutes**

### CloudFront Custom Domain
- [ ] Edit CloudFront distribution
- [ ] Add alternate domain names (CNAMEs)
- [ ] Select SSL certificate
- [ ] Save and wait for deployment (~20 min)
- [ ] Test: `https://yourdomain.com`
- [ ] Verify redirects to HTTPS

**Time: 30 minutes**

## Phase 3: API Backend (Day 2)

### Serverless Framework Setup
- [ ] Install: `npm install -g serverless`
- [ ] Create serverless.yml (see AWS_DEPLOYMENT.md)
- [ ] Configure environment variables
- [ ] Set POSTGRES_HOST to RDS endpoint
- [ ] Add API keys (CONGRESS_API_KEY, OPENSTATES_API_KEY)

**Time: 15 minutes**

### Deploy Lambda Functions
- [ ] Run: `serverless deploy`
- [ ] Get API Gateway endpoint URL
- [ ] Test state-events: `curl API-URL/state-events?state=CA`
- [ ] Test congress-meetings endpoint
- [ ] Test local-meetings endpoint
- [ ] Verify all endpoints return data or empty arrays

**Time: 15 minutes**

### API Custom Domain
- [ ] Create Route 53 CNAME: api.yourdomain.com → API Gateway
- [ ] Wait for DNS propagation (~1 hour)
- [ ] Test: `curl https://api.yourdomain.com/state-events?state=CA`
- [ ] Verify HTTPS works

**Time: 10 minutes**

## Phase 4: Scraper Backend (Day 2)

### Configure Scraper
- [ ] Navigate to scraper-backend/
- [ ] Copy .env.example to .env
- [ ] Set POSTGRES_HOST to RDS endpoint
- [ ] Set POSTGRES_PASSWORD
- [ ] Set POSTGRES_SSL=true
- [ ] Add API keys

**Time: 5 minutes**

### Test & Deploy
- [ ] Install dependencies: `npm install`
- [ ] Test connection: `npm test`
- [ ] Run initial scrape: `npm run scrape`
- [ ] Verify events in database
- [ ] Install PM2: `npm install -g pm2 pm2-windows-service`
- [ ] Setup PM2 service: `pm2-service-install`
- [ ] Start scraper: `pm2 start src/index.js --name civitron-scraper`
- [ ] Save PM2 config: `pm2 save`
- [ ] Verify PM2 status: `pm2 status`

**Time: 20 minutes**

## Phase 5: Frontend Configuration (Day 2)

### Update API URLs
- [ ] Edit vite.config.ts
- [ ] Set proxy target to api.yourdomain.com
- [ ] Set VITE_API_URL to https://api.yourdomain.com
- [ ] Rebuild: `npm run build`
- [ ] Upload to S3: `aws s3 sync dist/ s3://yourdomain.com/`
- [ ] Invalidate CloudFront: `aws cloudfront create-invalidation`

**Time: 10 minutes**

## Phase 6: Testing & Verification (Day 2-3)

### Frontend Testing
- [ ] Visit https://yourdomain.com
- [ ] Check home page loads
- [ ] Select a state (e.g., California)
- [ ] Verify state events display
- [ ] Check congress meetings tab
- [ ] Test local meetings search
- [ ] Verify map displays correctly
- [ ] Test on mobile device

### API Testing
- [ ] Test all API endpoints:
  - [ ] GET /state-events?state=CA
  - [ ] GET /state-events?state=NY
  - [ ] GET /congress-meetings
  - [ ] GET /local-meetings?lat=37.7749&lng=-122.4194
  - [ ] GET /top-events
  - [ ] GET /admin-events (if implemented)
- [ ] Verify response times < 500ms
- [ ] Check for errors in CloudWatch logs

### Database Testing
- [ ] Connect to RDS
- [ ] Check event counts by state
- [ ] Verify scraper_health logs
- [ ] Test scraper is populating data
- [ ] Check for duplicate events (should be none)

### DNS Testing
- [ ] Test DNS resolution:
  - [ ] `nslookup yourdomain.com`
  - [ ] `nslookup www.yourdomain.com`
  - [ ] `nslookup api.yourdomain.com`
- [ ] Verify all point to correct services
- [ ] Test from different networks
- [ ] Test from mobile network

**Time: 1 hour**

## Phase 7: Monitoring Setup (Day 3)

### CloudWatch Alarms
- [ ] Create RDS CPU alarm (>80%)
- [ ] Create RDS storage alarm (<10% free)
- [ ] Create Lambda error alarm (>10 errors/5min)
- [ ] Create Lambda duration alarm (>10s)
- [ ] Test alarms trigger

### Backup Configuration
- [ ] Verify RDS automated backups enabled (7 days)
- [ ] Create manual snapshot
- [ ] Test restore procedure
- [ ] Document backup/restore process

**Time: 30 minutes**

## Launch Checklist (Go-Live)

### Pre-Launch
- [ ] All tests passing
- [ ] Database has >100 events
- [ ] Scraper ran successfully within 24 hours
- [ ] SSL certificate valid
- [ ] DNS fully propagated (test from multiple locations)
- [ ] Backups configured
- [ ] Monitoring/alarms set up

### Launch
- [ ] Announce to users
- [ ] Monitor CloudWatch for errors
- [ ] Check scraper continues running
- [ ] Verify no 500 errors
- [ ] Monitor AWS costs

### Post-Launch (First Week)
- [ ] Daily: Check scraper logs
- [ ] Daily: Verify events updating
- [ ] Daily: Check AWS cost estimates
- [ ] Daily: Monitor CloudWatch metrics
- [ ] Weekly: Review performance
- [ ] Weekly: Optimize if needed

## Maintenance Checklist (Ongoing)

### Daily
- [ ] Check PM2 scraper status
- [ ] Verify scraper ran at 3 AM
- [ ] Quick check: site loads, events display

### Weekly
- [ ] Review CloudWatch logs
- [ ] Check AWS cost report
- [ ] Verify data freshness
- [ ] Test all API endpoints

### Monthly
- [ ] Review and optimize database
- [ ] Create manual RDS backup
- [ ] Review and update documentation
- [ ] Check for AWS service updates
- [ ] Review security groups/policies

## Rollback Plan (If Issues)

### Frontend Issues
1. Revert S3 to previous version
2. Invalidate CloudFront cache
3. Wait 5-10 minutes
4. Test

### API Issues
1. Run: `serverless rollback -t TIMESTAMP`
2. Verify previous version deployed
3. Test endpoints

### Database Issues
1. Restore from RDS snapshot
2. Update scraper backend .env
3. Test connection
4. Re-run scraper if needed

### Scraper Issues
1. Stop PM2: `pm2 stop civitron-scraper`
2. Fix code
3. Restart: `pm2 restart civitron-scraper`
4. Monitor logs: `pm2 logs`

## Troubleshooting Reference

### Issue: Domain not resolving
- Check name servers at registrar
- Wait up to 48 hours
- Use `dig yourdomain.com` to debug

### Issue: API timeouts
- Check Lambda logs in CloudWatch
- Verify RDS connection
- Check security groups

### Issue: Scraper not running
- Check PM2 status: `pm2 status`
- View logs: `pm2 logs civitron-scraper`
- Verify RDS accessible from your PC

### Issue: High AWS costs
- Check CloudFront bandwidth usage
- Verify RDS instance stopped when not needed
- Review Lambda invocation count

## Success Metrics

### Week 1
- [ ] Site loads in <2 seconds
- [ ] API responses <500ms
- [ ] >1000 events in database
- [ ] Zero downtime
- [ ] Costs under $25

### Month 1
- [ ] 99.9% uptime
- [ ] <5% error rate
- [ ] Consistent data updates
- [ ] User feedback positive
- [ ] Costs stable and predictable

## Resources

- AWS_DEPLOYMENT.md - Full deployment guide
- AWS_QUICK_REFERENCE.md - Quick commands
- deploy-aws.ps1 - Automated deployment script
- aws-config.txt - Your specific configuration

## Notes

### Estimated Total Time
- Infrastructure: 2-3 hours
- DNS propagation wait: 2-48 hours
- SSL + API deployment: 2 hours
- Testing: 1-2 hours
- **Total active time: 5-7 hours**
- **Total elapsed time: 1-3 days**

### Estimated Costs
- First 12 months (free tier): $0.50/month
- After free tier: $17-25/month
- One-time setup: $0 (using free tier)

---

**Last Updated:** [Date]
**Deployed By:** [Your Name]
**Domain:** [Your Domain]
**AWS Region:** [Your Region]
