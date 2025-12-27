# AWS + Custom Domain Quick Reference

## Prerequisites
```bash
# Install AWS CLI
# Windows: https://awscli.amazonaws.com/AWSCLIV2.msi
# Verify: aws --version

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output (json)

# Verify access
aws sts get-caller-identity
```

## Quick Deployment (Automated)

### Windows (PowerShell):
```powershell
.\deploy-aws.ps1
```

### Linux/Mac (Bash):
```bash
chmod +x deploy-aws.sh
./deploy-aws.sh
```

## Manual Step-by-Step

### 1. Create RDS PostgreSQL (~15 min)
```bash
aws rds create-db-instance \
  --db-instance-identifier civitron-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --publicly-accessible
```

Get endpoint:
```bash
aws rds describe-db-instances \
  --db-instance-identifier civitron-db \
  --query 'DBInstances[0].Endpoint.Address'
```

### 2. Setup Database Schema
```bash
psql -h YOUR-RDS-ENDPOINT -U postgres -d postgres
CREATE DATABASE civitron;
\c civitron
\i database/schema.sql
```

### 3. Deploy Frontend to S3
```bash
# Build
npm run build

# Create bucket
aws s3 mb s3://YOUR-DOMAIN.com

# Upload
aws s3 sync dist/ s3://YOUR-DOMAIN.com/ --delete

# Enable website
aws s3 website s3://YOUR-DOMAIN.com \
  --index-document index.html
```

### 4. Create CloudFront (~20 min)
```bash
# Via AWS Console is easier:
# CloudFront → Create Distribution
# Origin: YOUR-DOMAIN.s3-website-REGION.amazonaws.com
# Wait for deployment
```

### 5. Setup Custom Domain

#### a) Request SSL Certificate
```bash
aws acm request-certificate \
  --domain-name YOUR-DOMAIN.com \
  --domain-name www.YOUR-DOMAIN.com \
  --domain-name api.YOUR-DOMAIN.com \
  --validation-method DNS \
  --region us-east-1
```

#### b) Create Route 53 Hosted Zone
```bash
aws route53 create-hosted-zone \
  --name YOUR-DOMAIN.com \
  --caller-reference $(date +%s)
```

Get name servers:
```bash
aws route53 list-hosted-zones
# Copy name servers and update at your registrar (GoDaddy, Namecheap, etc.)
```

#### c) Validate Certificate (AWS Console easier)
1. ACM → Certificate → Create records in Route 53
2. Wait for validation (~5-30 min)

#### d) Update CloudFront with Custom Domain
1. CloudFront → Distribution → Edit
2. Alternate Domain Names: YOUR-DOMAIN.com, www.YOUR-DOMAIN.com
3. SSL Certificate: Select your ACM certificate
4. Save

#### e) Create Route 53 Records
```bash
# A record: YOUR-DOMAIN.com → CloudFront
# Use AWS Console: Route 53 → Hosted Zone → Create Record
# Type: A, Alias: Yes, Target: CloudFront distribution
```

### 6. Deploy API (Serverless Framework)

Install:
```bash
npm install -g serverless
```

Create `serverless.yml` (see AWS_DEPLOYMENT.md for full config):
```yaml
service: civitron-api
provider:
  name: aws
  runtime: nodejs20.x
functions:
  stateEvents:
    handler: lib/functions/state-events.handler
    events:
      - httpApi:
          path: /state-events
          method: get
```

Deploy:
```bash
export POSTGRES_PASSWORD="your-rds-password"
serverless deploy
```

Get API URL, then create Route 53 CNAME:
```
api.YOUR-DOMAIN.com → API-GATEWAY-URL
```

### 7. Setup Scraper Backend
```bash
cd scraper-backend

# Edit .env with RDS credentials
# POSTGRES_HOST=your-rds-endpoint.amazonaws.com

npm install
npm test      # Verify connection
npm run scrape  # Initial data
npm start     # Start scheduler
```

## Domain Configuration at Registrar

**Update Name Servers** at your domain registrar (GoDaddy, Namecheap, etc.):

Example Route 53 name servers:
```
ns-123.awsdns-12.com
ns-456.awsdns-34.net
ns-789.awsdns-56.co.uk
ns-012.awsdns-78.org
```

**Wait 2-48 hours for DNS propagation.**

## Testing

### Check DNS Propagation
```bash
nslookup YOUR-DOMAIN.com
dig YOUR-DOMAIN.com

# Should show CloudFront IP addresses
```

### Test Frontend
```
https://YOUR-DOMAIN.com
https://www.YOUR-DOMAIN.com
```

### Test API
```bash
curl https://api.YOUR-DOMAIN.com/state-events?state=CA
```

### Test Database
```bash
psql -h YOUR-RDS-ENDPOINT -U postgres -d civitron
SELECT COUNT(*) FROM events;
```

## Cost Summary

| Service | Free Tier (12 months) | After Free Tier |
|---------|----------------------|-----------------|
| RDS db.t4g.micro | 750 hours/month | ~$15/month |
| Lambda | 1M requests/month | ~$0.20/1M requests |
| CloudFront | 1TB transfer/month | $0.085/GB |
| S3 | 5GB storage | $0.023/GB |
| Route 53 | - | $0.50/month + $0.40/million queries |
| **Total** | **~$0.50/month** | **~$17-25/month** |

## Useful Commands

### Update Frontend
```bash
npm run build
aws s3 sync dist/ s3://YOUR-DOMAIN.com/ --delete
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

### Update API
```bash
serverless deploy
```

### Monitor Scraper
```bash
pm2 logs civitron-scraper
```

### Database Backup
```bash
aws rds create-db-snapshot \
  --db-instance-identifier civitron-db \
  --db-snapshot-identifier backup-$(date +%Y%m%d)
```

### View RDS Logs
```bash
aws rds describe-db-log-files --db-instance-identifier civitron-db
```

### CloudFront Invalidation
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

## Troubleshooting

### Domain not resolving
- Check name servers at registrar match Route 53
- Wait up to 48 hours for propagation
- Use `dig YOUR-DOMAIN.com` to check

### CloudFront 403 errors
- Check S3 bucket policy
- Verify origin domain name
- Invalidate CloudFront cache

### RDS connection timeout
- Check security group allows port 5432
- Verify RDS is publicly accessible
- Test: `telnet RDS-ENDPOINT 5432`

### API Gateway 502 errors
- Check Lambda function logs in CloudWatch
- Verify environment variables
- Test Lambda function directly

### SSL certificate stuck "Pending Validation"
- Verify CNAME records in Route 53
- Check email (if using email validation)
- Wait up to 30 minutes

## Security Best Practices

1. **RDS**: Restrict security group to specific IPs
2. **Lambda**: Use IAM roles, enable VPC if needed
3. **S3**: Use bucket policies, block public access except via CloudFront
4. **API Gateway**: Enable API keys, throttling
5. **Secrets**: Use AWS Secrets Manager or Parameter Store

## Monitoring

### CloudWatch Alarms
```bash
# RDS CPU
aws cloudwatch put-metric-alarm \
  --alarm-name civitron-rds-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --threshold 80

# Lambda Errors
aws cloudwatch put-metric-alarm \
  --alarm-name civitron-lambda-errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --threshold 10
```

### View Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/civitron-api-stateEvents --follow

# RDS slow queries
aws rds download-db-log-file-portion \
  --db-instance-identifier civitron-db \
  --log-file-name slowquery/postgresql.log
```

## Common Issues

**Q: My domain shows CloudFront default page**
A: Check CloudFront alternate domain names and origin settings

**Q: API returns CORS errors**
A: Add CORS headers in Lambda functions

**Q: Scraper can't connect to RDS**
A: Verify RDS security group allows your PC's IP on port 5432

**Q: High AWS costs**
A: Check CloudFront usage, enable caching, review RDS instance size

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com
- **Serverless Framework**: https://www.serverless.com/framework/docs
- **AWS CLI Reference**: https://awscli.amazonaws.com/v2/documentation/api/latest/index.html
- **Route 53 Guide**: https://docs.aws.amazon.com/route53/
