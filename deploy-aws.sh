#!/bin/bash
# AWS Deployment Script for Civitron
# Run this after configuring AWS CLI with: aws configure

set -e  # Exit on error

echo "🚀 Civitron AWS Deployment Script"
echo "=================================="
echo ""

# Configuration
read -p "Enter your domain name (e.g., civitron.com): " DOMAIN
read -sp "Enter PostgreSQL master password: " DB_PASSWORD
echo ""
read -p "Enter AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

echo ""
echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  Region: $AWS_REGION"
echo ""
read -p "Proceed with deployment? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Step 1: Create RDS Security Group
echo ""
echo "📦 Step 1/7: Creating RDS security group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name civitron-rds-sg \
    --description "PostgreSQL for Civitron" \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
    --group-names civitron-rds-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "  Security Group ID: $SG_ID"

# Allow PostgreSQL access
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "  Port 5432 already open"

# Step 2: Create RDS Instance
echo ""
echo "🗄️  Step 2/7: Creating RDS PostgreSQL instance..."
echo "  (This takes 10-15 minutes...)"
aws rds create-db-instance \
    --db-instance-identifier civitron-db \
    --db-instance-class db.t4g.micro \
    --engine postgres \
    --engine-version 16.1 \
    --master-username postgres \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --vpc-security-group-ids $SG_ID \
    --backup-retention-period 7 \
    --publicly-accessible \
    --storage-encrypted \
    --region $AWS_REGION 2>/dev/null || echo "  RDS instance already exists"

# Wait for RDS to be available
echo "  Waiting for RDS to be available..."
aws rds wait db-instance-available \
    --db-instance-identifier civitron-db \
    --region $AWS_REGION

RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier civitron-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $AWS_REGION)

echo "  ✅ RDS Endpoint: $RDS_ENDPOINT"

# Step 3: Setup Database Schema
echo ""
echo "📋 Step 3/7: Setting up database schema..."
echo "  Please run manually:"
echo "  psql -h $RDS_ENDPOINT -U postgres -d postgres"
echo "  Then: CREATE DATABASE civitron; \\c civitron; \\i database/schema.sql"
read -p "Press Enter when schema is imported..."

# Step 4: Create S3 Bucket
echo ""
echo "☁️  Step 4/7: Creating S3 bucket..."
aws s3 mb s3://$DOMAIN --region $AWS_REGION 2>/dev/null || echo "  Bucket already exists"

# Configure static website hosting
aws s3 website s3://$DOMAIN \
    --index-document index.html \
    --error-document index.html

# Build and upload frontend
echo "  Building frontend..."
npm run build

echo "  Uploading to S3..."
aws s3 sync dist/ s3://$DOMAIN/ \
    --delete \
    --cache-control "max-age=31536000"

aws s3 cp dist/index.html s3://$DOMAIN/index.html \
    --cache-control "no-cache"

# Step 5: Create CloudFront Distribution
echo ""
echo "🌐 Step 5/7: Creating CloudFront distribution..."
echo "  (This takes 15-20 minutes...)"

DIST_CONFIG=$(cat <<EOF
{
  "CallerReference": "$(date +%s)",
  "Comment": "Civitron Frontend",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-$DOMAIN",
        "DomainName": "$DOMAIN.s3-website-$AWS_REGION.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-$DOMAIN",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "MinTTL": 0,
    "Compress": true
  },
  "Enabled": true
}
EOF
)

DIST_ID=$(aws cloudfront create-distribution \
    --distribution-config "$DIST_CONFIG" \
    --query 'Distribution.Id' \
    --output text 2>/dev/null || \
    aws cloudfront list-distributions \
    --query "DistributionList.Items[0].Id" \
    --output text)

CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
    --id $DIST_ID \
    --query 'Distribution.DomainName' \
    --output text)

echo "  ✅ CloudFront Domain: $CLOUDFRONT_DOMAIN"

# Step 6: Setup Route 53
echo ""
echo "🌍 Step 6/7: Creating Route 53 hosted zone..."
ZONE_ID=$(aws route53 create-hosted-zone \
    --name $DOMAIN \
    --caller-reference $(date +%s) \
    --query 'HostedZone.Id' \
    --output text 2>/dev/null || \
    aws route53 list-hosted-zones \
    --query "HostedZones[?Name=='$DOMAIN.'].Id" \
    --output text)

ZONE_ID=$(echo $ZONE_ID | cut -d'/' -f3)

NAME_SERVERS=$(aws route53 get-hosted-zone \
    --id $ZONE_ID \
    --query "DelegationSet.NameServers" \
    --output text)

echo "  ✅ Hosted Zone ID: $ZONE_ID"
echo ""
echo "  📝 Update your domain registrar with these name servers:"
echo "  $NAME_SERVERS"
echo ""
read -p "Press Enter after updating name servers at your registrar..."

# Step 7: Save Configuration
echo ""
echo "💾 Step 7/7: Saving configuration..."

cat > scraper-backend/.env << EOF
# AWS RDS Configuration
POSTGRES_HOST=$RDS_ENDPOINT
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_SSL=true

# API Keys (add your own)
CONGRESS_API_KEY=
OPENSTATES_API_KEY=

# Scraper Configuration
SCRAPE_INTERVAL_HOURS=24
LOG_LEVEL=info
EOF

cat > aws-config.txt << EOF
AWS Deployment Configuration
============================

Domain: $DOMAIN
Region: $AWS_REGION

RDS Endpoint: $RDS_ENDPOINT
RDS Username: postgres
RDS Database: civitron

CloudFront Distribution ID: $DIST_ID
CloudFront Domain: $CLOUDFRONT_DOMAIN

Route 53 Zone ID: $ZONE_ID
Name Servers: $NAME_SERVERS

S3 Bucket: $DOMAIN

Next Steps:
1. Request SSL certificate in ACM (us-east-1)
2. Validate certificate via DNS
3. Update CloudFront with custom domain and SSL
4. Create Route 53 A record pointing to CloudFront
5. Deploy API functions (see AWS_DEPLOYMENT.md)
6. Test scraper backend connection: cd scraper-backend && npm test
7. Run initial scrape: npm run scrape
8. Start scraper: npm start
EOF

echo "  ✅ Configuration saved to:"
echo "     - scraper-backend/.env"
echo "     - aws-config.txt"

echo ""
echo "🎉 AWS Infrastructure Deployment Complete!"
echo ""
echo "Next steps (manual):"
echo "1. Request SSL certificate: aws acm request-certificate --domain-name $DOMAIN --domain-name www.$DOMAIN --domain-name api.$DOMAIN --validation-method DNS --region us-east-1"
echo "2. Follow AWS_DEPLOYMENT.md for SSL validation and CloudFront custom domain setup"
echo "3. Deploy API functions with Serverless Framework"
echo "4. Test and launch!"
echo ""
echo "See aws-config.txt for all connection details."
