# CORS Fix & Deployment Guide

## Changes Made

### Server (Backend)
1. ✅ Fixed CORS configuration in `server.js` to allow HTTPS requests from frontend
2. ✅ Updated `.env` file with correct MongoDB URI and frontend URL
3. ✅ Created `vercel.json` for Vercel deployment configuration

### Client (Frontend)
1. ✅ Created `.env.local` for local development
2. ✅ Created `.env.production` for production deployment
3. ✅ Updated `api.js` to use environment variables

## Deployment Steps

### Backend (Server) Deployment

1. **Commit and push your server changes:**
   ```powershell
   cd "d:\GitHub Destop\Hously Task\server"
   git add .
   git commit -m "Fix CORS configuration for production"
   git push origin main
   ```

2. **Set Environment Variables in Vercel:**
   - Go to your Vercel backend project dashboard
   - Navigate to Settings → Environment Variables
   - Add these variables:
     - `MONGODB_URI`: `mongodb+srv://kaustubhkumbharkar0601_db_user:NPppYpUbppcKcNwi@cluster0.jsihg3t.mongodb.net/task-management?retryWrites=true&w=majority`
     - `JWT_SECRET`: `your-super-secure-jwt-secret-key-2024-task-management-system-12345`
     - `FRONTEND_URL`: `https://task-management-wiix.vercel.app`
     - `NODE_ENV`: `production`

3. **Redeploy** the backend on Vercel (it should auto-deploy on push)

### Frontend (Client) Deployment

1. **Commit and push your client changes:**
   ```powershell
   cd "d:\GitHub Destop\Hously Task\client"
   git add .
   git commit -m "Add environment variables for API configuration"
   git push origin main
   ```

2. **Set Environment Variable in Vercel:**
   - Go to your Vercel frontend project dashboard
   - Navigate to Settings → Environment Variables
   - Add this variable:
     - `VITE_API_BASE_URL`: `https://task-management-blue-xi.vercel.app/api`

3. **Redeploy** the frontend on Vercel

## Testing

After deployment:
1. Visit `https://task-management-wiix.vercel.app`
2. Try logging in - the CORS error should be resolved
3. Check browser console for any errors

## Key Changes Summary

**CORS Configuration:**
- Changed from `http://` to `https://` for frontend URL
- Added proper origin checking with multiple allowed origins
- Added credentials support
- Added all necessary HTTP methods and headers

**Environment Configuration:**
- Separated local and production API URLs
- Made backend URL configurable via environment variables
- Added proper MongoDB connection string with database name

## Notes

- Make sure both frontend and backend are redeployed after these changes
- Verify environment variables are set correctly in Vercel dashboard
- The CORS error occurs because the server needs to explicitly allow requests from your frontend domain
