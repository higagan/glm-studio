# Google OAuth Custom Domain Setup for MediBricks

## Problem
Google OAuth consent screen shows `qxrrjpepoyubksiuxany.supabase.co` instead of `medibrick.com`.

## Solution Steps

### Step 1: Fix Authorized Domains (Google Cloud Console)

1. Go to **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**
2. In the **Authorized domains** section:
   - ✅ Keep `medibrick.com` (your main domain)
   - ✅ Keep `qxrrjpepoyubksiuxany.supabase.co` (needed for Supabase callbacks)
   - ❌ **Remove** `www.medibrick.com` (invalid - Google doesn't allow www subdomains here)
   - Keep the Lovable preview domain if you're still testing

### Step 2: Update OAuth Client Redirect URIs

1. Go to **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Click on your **OAuth 2.0 Client ID** (the one used for Supabase)
3. Under **Authorized redirect URIs**, you should see:
   ```
   https://qxrrjpepoyubksiuxany.supabase.co/auth/v1/callback
   ```
4. **Add your custom domain redirect URI** (if you have a custom Supabase auth domain):
   ```
   https://YOUR_CUSTOM_AUTH_DOMAIN/auth/v1/callback
   ```
   OR if you're using a custom domain for your app:
   ```
   https://medibrick.com/auth/v1/callback
   ```

### Step 3: Configure Custom Domain in Supabase (Required for Custom Domain to Show)

**Option A: Custom Auth Domain (Recommended)**
1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Scroll to **Custom Domain** section
3. Add a custom auth subdomain like `auth.medibrick.com`
4. Follow Supabase's DNS instructions to verify
5. This will make OAuth callbacks use `auth.medibrick.com` instead of the Supabase domain

**Option B: Use Your Main Domain**
1. In **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://medibrick.com`
3. Add to **Redirect URLs**: `https://medibrick.com/**`

### Step 4: Update Google OAuth Client (After Custom Domain is Live)

Once your custom Supabase auth domain is verified and working:

1. Go back to **Google Cloud Console** → **Credentials** → Your OAuth Client
2. Update the **Authorized redirect URIs** to use your custom domain:
   ```
   https://auth.medibrick.com/auth/v1/callback
   ```
   OR
   ```
   https://medibrick.com/auth/v1/callback
   ```
3. Remove or keep the Supabase domain URI (you can keep both during transition)

### Step 5: Update Supabase Provider Settings

1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Google**
2. Make sure your **Client ID** and **Client Secret** are correct
3. The redirect URI should automatically use your custom domain once configured

## Important Notes

- **Authorized domains** ≠ **Redirect URIs**: 
  - Authorized domains are for the consent screen branding
  - Redirect URIs are what actually show in the OAuth flow
- **Custom domains require Supabase Pro plan** or higher
- The domain shown in OAuth consent is determined by the **redirect URI**, not just authorized domains
- You can keep both the Supabase domain and custom domain in redirect URIs during migration

## Testing

After setup:
1. Try Google login from your app
2. Check the OAuth consent screen - it should show your custom domain
3. Verify the redirect works correctly after authentication

## Troubleshooting

If you still see the Supabase domain:
- Check that your custom domain is verified in Supabase
- Verify DNS records are correct
- Ensure the redirect URI in Google Console matches your custom domain
- Clear browser cache and try again
