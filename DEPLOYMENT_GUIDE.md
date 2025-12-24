# Test Deployment Setup Guide
## Zero-Cost Setup with Local Backend

### 🎯 Architecture
```
[GitHub live-testing branch] 
    ↓ (auto-deploy)
[Netlify Frontend] → [Your Machine via Cloudflare Tunnel] → [Local PostgreSQL]
```

---

## Step 1: Install Cloudflare Tunnel (FREE)

Cloudflare Tunnel is better than ngrok for testing:
- ✅ Completely free
- ✅ No bandwidth limits
- ✅ Persistent URLs
- ✅ No timeouts

### Install:
```powershell
# Download cloudflared
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "cloudflared.exe"

# Move to permanent location
Move-Item cloudflared.exe C:\Windows\System32\cloudflared.exe

# Login to Cloudflare (opens browser)
cloudflared tunnel login
```

### Create Tunnel:
```powershell
# Create tunnel named 'civitron-backend'
cloudflared tunnel create civitron-backend

# Note the tunnel ID that gets printed
```

---

## Step 2: Configure Tunnel

Create `C:\Users\nikow\.cloudflared\config.yml`:
```yaml
tunnel: civitron-backend
credentials-file: C:\Users\nikow\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: civitron-backend.your-domain.com
    service: http://localhost:8888
  - service: http_status:404
```

Or use quick tunnel (no domain needed):
```powershell
# Start tunnel (gives you a random URL like https://abc-def.trycloudflare.com)
cloudflared tunnel --url http://localhost:8888
```

---

## Step 3: Setup Netlify

### A. Create Netlify Account & Site
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize site
netlify init
```

### B. Get Netlify Tokens
1. Go to https://app.netlify.com/user/applications
2. Create new personal access token → Copy it
3. Go to your site settings → Copy "Site ID" (API ID)

---

## Step 4: Configure GitHub Secrets

Go to your repo: `Settings → Secrets and variables → Actions → New secret`

Add these secrets:
1. **NETLIFY_AUTH_TOKEN**: Your Netlify personal access token
2. **NETLIFY_SITE_ID**: Your Netlify site ID
3. **BACKEND_TUNNEL_URL**: Your tunnel URL (e.g., `https://abc-def.trycloudflare.com`)

---

## Step 5: Update Frontend Config

The frontend needs to know your backend URL. Two options:

### Option A: Environment Variable (Recommended)
Create `.env.production`:
```env
VITE_API_URL=https://your-tunnel-url.trycloudflare.com
```

### Option B: Build-time Variable
Already configured in GitHub Actions workflow - just set the secret.

---

## Step 6: Start Your Backend

Create `start-backend-tunnel.bat`:
```batch
@echo off
echo Starting Civitron Backend with Cloudflare Tunnel
echo.

REM Start PostgreSQL (if not running)
net start postgresql-x64-16

REM Start Netlify Dev (backend functions)
start "Civitron Backend" cmd /c "npm run netlify:dev"

timeout /t 5

REM Start Cloudflare Tunnel
echo.
echo Starting Cloudflare Tunnel...
echo Your backend will be available at the URL shown below:
echo.
cloudflared tunnel --url http://localhost:8888
```

Run it:
```powershell
.\start-backend-tunnel.bat
```

Note the URL it prints (e.g., `https://abc-def-123.trycloudflare.com`)

---

## Step 7: Deploy!

### Option 1: Via GitHub (Automated)
```bash
# Create live-testing branch
git checkout -b live-testing

# Push to trigger deployment
git push origin live-testing
```

### Option 2: Via Netlify CLI (Manual)
```bash
# Build frontend
npm run build

# Deploy
netlify deploy --prod
```

---

## 📊 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| **Netlify** | Free tier | $0/month |
| **Cloudflare Tunnel** | Free | $0/month |
| **PostgreSQL** | Local | $0/month |
| **Your Machine** | Already owned | $0/month |
| **GitHub Actions** | Free tier (2000 min/month) | $0/month |
| **Total** | | **$0/month** |

---

## 🔄 Workflow After Setup

1. **Start backend** (when testing):
   ```powershell
   .\start-backend-tunnel.bat
   ```

2. **Make changes** to code

3. **Push to live-testing** branch:
   ```bash
   git add .
   git commit -m "Testing new feature"
   git push origin live-testing
   ```

4. **Auto-deploys** in ~2 minutes
   - Frontend rebuilds on Netlify
   - Connects to your local backend via tunnel

5. **Test** at `https://your-site.netlify.app`

---

## 🎛️ Alternative: If You Want Backend Hosted Too

If you want backend hosted (not on your machine):

### Cheapest Options:

1. **Netlify Functions** (Recommended)
   - Already configured in your project
   - Free tier: 125k requests/month
   - No changes needed
   - **Cost: $0/month** (your current usage likely fits)

2. **Railway.app** (PostgreSQL + Node.js)
   - Free tier: $5/month credit
   - Includes PostgreSQL
   - **Cost: $0/month** (trial), then ~$5/month

3. **Fly.io** (Node.js + PostgreSQL)
   - Free tier: 3 shared VMs + 3GB storage
   - **Cost: $0/month** (within limits)

But for testing, **local backend + Cloudflare Tunnel is the best choice** - zero cost and full control.

---

## 🐛 Troubleshooting

### Backend not accessible:
```powershell
# Check if Netlify Dev is running
netstat -ano | findstr :8888

# Restart tunnel
taskkill /F /IM cloudflared.exe
cloudflared tunnel --url http://localhost:8888
```

### CORS errors:
Add to your backend functions:
```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://your-site.netlify.app',
  // ... other headers
}
```

### Database connection fails:
Update PostgreSQL to accept tunnel connections:
```powershell
# Edit: C:\Program Files\PostgreSQL\16\data\postgresql.conf
# Change: listen_addresses = 'localhost' → listen_addresses = '*'

# Restart PostgreSQL
net stop postgresql-x64-16
net start postgresql-x64-16
```

---

## 📈 When to Upgrade (Later)

Keep this setup until:
- You get 100+ daily active users
- You need 24/7 uptime
- Your machine can't handle the load

Then migrate to:
- **Render.com** ($7/month) or **Railway** ($5/month) for backend
- **Neon.tech** or **Supabase** (free tier) for PostgreSQL
- Keep Netlify for frontend (still free)
