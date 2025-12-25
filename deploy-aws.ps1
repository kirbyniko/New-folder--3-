# Civitron AWS + Custom Domain Setup
# PowerShell script for Windows

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 Civitron AWS Deployment (Windows)`n" -ForegroundColor Green
Write-Host "===================================`n" -ForegroundColor Green

# Configuration
$Domain = Read-Host "Enter your domain name (e.g., civitron.com)"
$DBPassword = Read-Host "Enter PostgreSQL master password" -AsSecureString
$DBPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DBPassword))
$AWSRegion = Read-Host "Enter AWS region (default: us-east-1)"
if ([string]::IsNullOrWhiteSpace($AWSRegion)) { $AWSRegion = "us-east-1" }

Write-Host "`nConfiguration:" -ForegroundColor Cyan
Write-Host "  Domain: $Domain"
Write-Host "  Region: $AWSRegion`n"

$Confirm = Read-Host "Proceed with deployment? (y/n)"
if ($Confirm -ne "y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit
}

# Step 1: Create RDS Security Group
Write-Host "`n📦 Step 1/7: Creating RDS security group..." -ForegroundColor Yellow

try {
    $SG = aws ec2 create-security-group `
        --group-name civitron-rds-sg `
        --description "PostgreSQL for Civitron" `
        --query 'GroupId' `
        --output text 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        $SG = aws ec2 describe-security-groups `
            --group-names civitron-rds-sg `
            --query 'SecurityGroups[0].GroupId' `
            --output text
    }
    
    Write-Host "  Security Group ID: $SG" -ForegroundColor Green
    
    # Allow PostgreSQL access
    aws ec2 authorize-security-group-ingress `
        --group-id $SG `
        --protocol tcp `
        --port 5432 `
        --cidr 0.0.0.0/0 2>&1 | Out-Null
    
    Write-Host "  ✅ Port 5432 configured" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Security group may already exist" -ForegroundColor Yellow
}

# Step 2: Create RDS Instance
Write-Host "`n🗄️  Step 2/7: Creating RDS PostgreSQL instance..." -ForegroundColor Yellow
Write-Host "  (This takes 10-15 minutes...)" -ForegroundColor Gray

try {
    aws rds create-db-instance `
        --db-instance-identifier civitron-db `
        --db-instance-class db.t4g.micro `
        --engine postgres `
        --engine-version 16.1 `
        --master-username postgres `
        --master-user-password $DBPasswordPlain `
        --allocated-storage 20 `
        --vpc-security-group-ids $SG `
        --backup-retention-period 7 `
        --publicly-accessible `
        --storage-encrypted `
        --region $AWSRegion 2>&1 | Out-Null
} catch {
    Write-Host "  ⚠️  RDS instance may already exist" -ForegroundColor Yellow
}

Write-Host "  Waiting for RDS to be available..." -ForegroundColor Gray
aws rds wait db-instance-available --db-instance-identifier civitron-db --region $AWSRegion

$RDSEndpoint = aws rds describe-db-instances `
    --db-instance-identifier civitron-db `
    --query 'DBInstances[0].Endpoint.Address' `
    --output text `
    --region $AWSRegion

Write-Host "  ✅ RDS Endpoint: $RDSEndpoint" -ForegroundColor Green

# Step 3: Setup Database Schema
Write-Host "`n📋 Step 3/7: Setting up database schema..." -ForegroundColor Yellow
Write-Host "  Connection string: psql -h $RDSEndpoint -U postgres -d postgres" -ForegroundColor Cyan
Write-Host "  Then run: CREATE DATABASE civitron; \c civitron; \i database/schema.sql`n" -ForegroundColor Cyan
Read-Host "Press Enter when schema is imported"

# Step 4: Create S3 Bucket
Write-Host "`n☁️  Step 4/7: Creating S3 bucket..." -ForegroundColor Yellow

try {
    aws s3 mb s3://$Domain --region $AWSRegion 2>&1 | Out-Null
    Write-Host "  ✅ Bucket created: $Domain" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Bucket may already exist" -ForegroundColor Yellow
}

# Configure static website hosting
aws s3 website s3://$Domain `
    --index-document index.html `
    --error-document index.html

# Build frontend
Write-Host "  Building frontend..." -ForegroundColor Gray
npm run build

# Upload to S3
Write-Host "  Uploading to S3..." -ForegroundColor Gray
aws s3 sync dist/ s3://$Domain/ --delete --cache-control "max-age=31536000"
aws s3 cp dist/index.html s3://$Domain/index.html --cache-control "no-cache"

Write-Host "  ✅ Frontend uploaded" -ForegroundColor Green

# Step 5: Create CloudFront Distribution
Write-Host "`n🌐 Step 5/7: Creating CloudFront distribution..." -ForegroundColor Yellow
Write-Host "  (This takes 15-20 minutes...)" -ForegroundColor Gray

$DistConfig = @"
{
  "CallerReference": "$(Get-Date -Format 'yyyyMMddHHmmss')",
  "Comment": "Civitron Frontend",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-$Domain",
        "DomainName": "$Domain.s3-website-$AWSRegion.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-$Domain",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]}
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "MinTTL": 0,
    "Compress": true,
    "TrustedSigners": {"Enabled": false, "Quantity": 0}
  },
  "Enabled": true
}
"@

$DistConfig | Out-File -FilePath "cloudfront-config.json" -Encoding UTF8

try {
    $DistID = aws cloudfront create-distribution `
        --distribution-config file://cloudfront-config.json `
        --query 'Distribution.Id' `
        --output text 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        $DistID = aws cloudfront list-distributions `
            --query "DistributionList.Items[0].Id" `
            --output text
    }
} catch {
    $DistID = aws cloudfront list-distributions `
        --query "DistributionList.Items[0].Id" `
        --output text
}

$CloudFrontDomain = aws cloudfront get-distribution `
    --id $DistID `
    --query 'Distribution.DomainName' `
    --output text

Write-Host "  ✅ CloudFront Domain: $CloudFrontDomain" -ForegroundColor Green

# Step 6: Setup Route 53
Write-Host "`n🌍 Step 6/7: Creating Route 53 hosted zone..." -ForegroundColor Yellow

try {
    $ZoneID = aws route53 create-hosted-zone `
        --name $Domain `
        --caller-reference $(Get-Date -Format 'yyyyMMddHHmmss') `
        --query 'HostedZone.Id' `
        --output text 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        $ZoneID = aws route53 list-hosted-zones `
            --query "HostedZones[?Name=='$Domain.'].Id" `
            --output text
    }
} catch {
    $ZoneID = aws route53 list-hosted-zones `
        --query "HostedZones[?Name=='$Domain.'].Id" `
        --output text
}

$ZoneID = $ZoneID.Split('/')[-1]

$NameServers = aws route53 get-hosted-zone `
    --id $ZoneID `
    --query "DelegationSet.NameServers" `
    --output text

Write-Host "  ✅ Hosted Zone ID: $ZoneID" -ForegroundColor Green
Write-Host "`n  📝 Update your domain registrar with these name servers:" -ForegroundColor Cyan
Write-Host "  $NameServers`n" -ForegroundColor White
Read-Host "Press Enter after updating name servers at your registrar"

# Step 7: Save Configuration
Write-Host "`n💾 Step 7/7: Saving configuration..." -ForegroundColor Yellow

$EnvContent = @"
# AWS RDS Configuration
POSTGRES_HOST=$RDSEndpoint
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$DBPasswordPlain
POSTGRES_SSL=true

# API Keys (add your own)
CONGRESS_API_KEY=
OPENSTATES_API_KEY=

# Scraper Configuration
SCRAPE_INTERVAL_HOURS=24
LOG_LEVEL=info
"@

$EnvContent | Out-File -FilePath "scraper-backend\.env" -Encoding UTF8

$ConfigContent = @"
AWS Deployment Configuration
============================

Domain: $Domain
Region: $AWSRegion

RDS Endpoint: $RDSEndpoint
RDS Username: postgres
RDS Database: civitron

CloudFront Distribution ID: $DistID
CloudFront Domain: $CloudFrontDomain

Route 53 Zone ID: $ZoneID
Name Servers: $NameServers

S3 Bucket: $Domain

Next Steps:
1. Request SSL certificate in ACM (us-east-1)
2. Validate certificate via DNS
3. Update CloudFront with custom domain and SSL
4. Create Route 53 A record pointing to CloudFront
5. Deploy API functions (see AWS_DEPLOYMENT.md)
6. Test scraper backend: cd scraper-backend && npm test
7. Run initial scrape: npm run scrape
8. Start scraper: npm start
"@

$ConfigContent | Out-File -FilePath "aws-config.txt" -Encoding UTF8

Write-Host "  ✅ Configuration saved to:" -ForegroundColor Green
Write-Host "     - scraper-backend\.env" -ForegroundColor White
Write-Host "     - aws-config.txt`n" -ForegroundColor White

# Cleanup
Remove-Item "cloudfront-config.json" -ErrorAction SilentlyContinue

Write-Host "🎉 AWS Infrastructure Deployment Complete!`n" -ForegroundColor Green

Write-Host "Next steps (manual):" -ForegroundColor Cyan
Write-Host "1. Request SSL certificate:" -ForegroundColor White
Write-Host "   aws acm request-certificate --domain-name $Domain --domain-name www.$Domain --domain-name api.$Domain --validation-method DNS --region us-east-1`n" -ForegroundColor Gray
Write-Host "2. Follow AWS_DEPLOYMENT.md for:" -ForegroundColor White
Write-Host "   - SSL validation" -ForegroundColor Gray
Write-Host "   - CloudFront custom domain setup" -ForegroundColor Gray
Write-Host "   - API Lambda deployment`n" -ForegroundColor Gray
Write-Host "3. Test scraper backend:" -ForegroundColor White
Write-Host "   cd scraper-backend" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   npm test`n" -ForegroundColor Gray
Write-Host "See aws-config.txt for all details." -ForegroundColor White
