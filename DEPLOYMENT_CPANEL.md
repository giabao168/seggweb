# Deploy Vibe Edutainment to cPanel Hosting

## Step 1: Check if Node.js is enabled on your hosting

1. Log in to cPanel at: `https://techitoan.name.vn:2083`
2. Look for **"Node.js"** or **"Node.js Manager"** icon
3. If not visible, contact hosting support to enable Node.js

## Step 2: Access Terminal/SSH

Option A - Via cPanel Terminal:
1. Go to **Advanced** → **Terminal**
2. Run commands from there

Option B - Via SSH:
```bash
ssh -l techitoan techitoan.name.vn
# Enter your cPanel password
```

## Step 3: Navigate and Clone/Upload Your App

### Option A: Using Git (Recommended)

```bash
cd ~/public_html
git clone https://github.com/yourusername/seggweb.git app
cd app
npm install --production
```

### Option B: Upload via FTP/cPanel File Manager

1. Upload all files to: `/home/techitoan/public_html/app/`
2. Via SSH, navigate to that directory:
```bash
cd ~/public_html/app
npm install --production
```

## Step 4: Create .env File on Hosting

```bash
nano .env
```

Add these lines:
```
GOOGLE_API_KEY=AIzaSyCoL9WSm5ZyIC6PZkAwH9Dg1F4EP_e_9mM
JWT_SECRET=your-random-secret-key-12345-change-this
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://techitoan.name.vn
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 5: Create Node.js App via cPanel

1. Go to cPanel Dashboard
2. Click **"Node.js"** icon
3. Click **"Create Application"**
4. Fill in:
   - **Node.js version:** 18.x or higher
   - **Application mode:** Production
   - **Application startup file:** src/server.js
   - **Application root:** ~/public_html/app
   - **Application URL:** Select your domain
   - **Application port:** 5000 (cPanel will proxy it)
5. Click **"Create"**

## Step 6: Install Dependencies

In cPanel Node.js dashboard:
1. Click **"NPM install"** button next to your app
2. Wait for installation to complete

Or via SSH:
```bash
cd ~/public_html/app
npm install --production
```

## Step 7: Start Your App

In cPanel Node.js dashboard:
1. Click **"Start"** button
2. Wait for status to show "Running"

Or via SSH:
```bash
cd ~/public_html/app
npm start
```

## Step 8: Access Your App

Your app will be available at:
- `https://techitoan.name.vn` (if proxied)
- Or check the URL shown in cPanel Node.js section

## Step 9: Setup Auto-Start (Optional)

Via SSH, create a startup script:
```bash
# Create crontab entry for auto-restart
crontab -e

# Add this line at the end:
@reboot cd ~/public_html/app && npm start > ~/logs/app.log 2>&1 &
```

## Troubleshooting

### App won't start
```bash
cd ~/public_html/app
node src/server.js
# Check error messages
```

### Port already in use
```bash
lsof -i :5000
# Kill the process: kill -9 <PID>
```

### Module not found
```bash
cd ~/public_html/app
npm install
# Check package.json exists
```

### Check logs
```bash
tail -f ~/logs/app.log
# Or check cPanel Node.js dashboard logs
```

## Database Backup

Your app uses `config/database.json`. Back it up regularly:
```bash
cp ~/public_html/app/config/database.json ~/public_html/app/config/database.backup.json
```

## Update Application

When you make changes locally:
```bash
# Local:
git add .
git commit -m "Update message"
git push origin main

# On hosting via SSH:
cd ~/public_html/app
git pull origin main
npm install
# Restart app in cPanel Node.js dashboard
```

## Security Notes

⚠️ **IMPORTANT:**
1. Change `JWT_SECRET` to something random and unique
2. Keep `.env` file permissions restricted (chmod 600)
3. Don't commit `.env` to git
4. Use HTTPS only (already enabled by cPanel SSL)
5. Keep Node.js and npm updated

## Support

If Node.js isn't available on your hosting:
1. Contact your hosting provider
2. Ask them to enable Node.js support
3. Or upgrade to a hosting plan that supports Node.js
4. Alternative: Move to Render.com or Railway.app (easier for Node.js)
