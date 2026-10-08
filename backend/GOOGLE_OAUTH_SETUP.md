# Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

## Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/login`
   - `http://localhost:3000/register`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Step 3: Configure Backend

Create a `.env` file in the `backend` directory with:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# JWT Settings
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

## Step 4: Configure Frontend

The frontend will automatically read the Google Client ID from the backend `/auth/google/config` endpoint.

## Testing

1. Start the backend server: `python run.py`
2. Start the frontend: `npm start`
3. Navigate to `http://localhost:3000`
4. Click the "Sign in with Google" button
5. You should be redirected to Google's OAuth consent screen

## Troubleshooting

### Error: "Invalid Client"
- Double-check your Client ID in the `.env` file
- Make sure the origins and redirect URIs match exactly

### Error: "Redirect URI Mismatch"
- Add all possible URLs to the authorized redirect URIs in Google Cloud Console

### Error: "Access Blocked"
- Your app might need to go through Google's verification process for production use
- For development, add yourself as a test user in the OAuth consent screen settings

