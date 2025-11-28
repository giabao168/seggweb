# Quick Deployment to techitoan.name.vn cPanel

## 🚀 QUICKSTART (5 minutes)

### Step 1: Prepare Your Code
```powershell
# On your Windows machine in VS Code terminal
cd d:\VISUAL_CODE\seggweb

# Run the deployment script
.\deploy.bat
```

This will:
- ✅ Stage all changes
- ✅ Commit to git
- ✅ Push to GitHub
- ✅ Prepare environment

### Step 2: Access cPanel
1. Open browser: `https://techitoan.name.vn:2083`
2. Login with your cPanel credentials

### Step 3: Find Node.js Manager
- Look for icon that says **"Node.js"** or **"Node.js Manager"**
- If you don't see it, your hosting provider hasn't enabled Node.js yet
- Contact them to enable it

### Step 4: Deploy (Via cPanel GUI - Easiest)
1. Click **"Node.js"** icon
2. Click **"Create Application"** button
3. Fill in the form:

```
✓ Node.js version:        18.18.0 (or latest LTS)
✓ Application mode:       Production
✓ Application startup file: src/server.js
✓ Application root:        ~/public_html/app
✓ Application URL:         techitoan.name.vn (select your domain)
✓ Application port:        5000
```

4. Click **"Create"** button
5. Wait ~30 seconds for creation
6. Click **"NPM install"** button when it appears
7. Wait for installation to complete (~2-3 minutes)
8. Click **"Start"** button
9. ✅ App is now LIVE!

### Step 5: Verify It's Working
- Open: `https://techitoan.name.vn`
- Try to login with: `admin / admin123`
- Test creating a quiz

---

## 📤 Alternative: Deploy via SSH/Git

If you prefer command line:

```bash
# SSH into your hosting
ssh -l techitoan techitoan.name.vn
# Enter your password when prompted

# Navigate to public_html
cd ~/public_html

# Remove old app if exists
rm -rf app

# Clone your repository
git clone https://github.com/YOUR_USERNAME/seggweb.git app
cd app

# Create .env file
nano .env
```

Add:
```
GOOGLE_API_KEY=AIzaSyCoL9WSm5ZyIC6PZkAwH9Dg1F4EP_e_9mM
JWT_SECRET=change-this-to-random-secret-12345
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://techitoan.name.vn
```

Press `Ctrl+X` → `Y` → `Enter`

```bash
# Install dependencies
npm install --production

# Start the app
npm start
```

---

## 🔗 What URL Will Your App Be At?

Your app will be deployed to:
```
https://techitoan.name.vn
```

All routes:
- Login: `https://techitoan.name.vn/`
- Admin: `https://techitoan.name.vn/admin`
- API: `https://techitoan.name.vn/api/*`

---

## ⚠️ Important Settings Before Going Live

### 1. Change JWT_SECRET
On hosting, edit `.env`:
```bash
# Generate a random secret (don't use this exact one)
JWT_SECRET=aB3xY9pQm2n5kL8vZwFjH6gD1sE4tUiOcRwXyZ0aB
```

### 2. Update ALLOWED_ORIGINS
In `.env` on hosting:
```
ALLOWED_ORIGINS=https://techitoan.name.vn,https://www.techitoan.name.vn
```

### 3. Check SSL Certificate
- cPanel usually provides free SSL via AutoSSL
- Verify green padlock in browser ✅

### 4. Backup Database Regularly
```bash
# Your database is at: ~/public_html/app/config/database.json
# Backup command:
cp ~/public_html/app/config/database.json ~/backups/database.json
```

---

## 🛠️ Troubleshooting

### Problem: Node.js Manager not showing in cPanel
**Solution:** Contact hosting support
- Tell them: "Please enable Node.js support on my account"
- Ask them to verify version 18.x is available

### Problem: "Port already in use"
**Solution:** Change port in cPanel Node.js settings to a different port (e.g., 5001)

### Problem: "Cannot find module"
**Solution:** Run npm install
```bash
cd ~/public_html/app
npm install --production
```

### Problem: "GOOGLE_API_KEY is invalid"
**Solution:** Check your .env file has correct API key
```bash
cat .env  # View contents
nano .env # Edit if needed
```

### Problem: App crashes on startup
**Solution:** Check logs in cPanel Node.js dashboard
- Click your app
- Look for error logs/output
- Report the error to me

---

## 📝 After Successful Deployment

1. **Test everything works:**
   - Login page loads ✅
   - Admin login works ✅
   - Quiz creation works ✅
   - Logs display in admin panel ✅

2. **Set up monitoring (Optional):**
   - cPanel usually has monitoring built-in
   - You can set up email alerts for crashes

3. **Update your DNS (if needed):**
   - If using custom domain, point it to your hosting
   - Might take 24-48 hours to propagate

4. **Share your live app URL:**
   ```
   https://techitoan.name.vn
   ```

---

## 🎉 Success Indicators

✅ You'll see in cPanel Node.js:
- Application status: **"Running"** (green)
- Port shows **5000**
- You can click "Open App" to launch it

✅ App features working:
- Fast loading time (< 2 seconds)
- Login works smoothly
- PDF upload works
- Quizzes generate and display
- Admin panel shows logs

---

## Need Help?

If anything goes wrong:
1. Check the `.cpanel.yml` file is correct
2. Verify all files uploaded to `~/public_html/app/`
3. Check `.env` file has correct API keys
4. Look at Node.js logs in cPanel dashboard
5. Contact your hosting provider's support

---

**Good luck! 🚀 Your app should be live in minutes!**
