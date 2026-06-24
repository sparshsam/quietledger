# Google OAuth Branding Audit

## The Problem

When users sign in with Google, they see:

```
qoxmibmbyjmkntzrckyr.supabase.co
```

…in the redirect URL displayed during the OAuth flow, instead of OpenLedger branding.

## Root Cause

The app uses **Supabase Auth** as the OAuth gateway. The OAuth flow is:

```
User → App → Supabase Auth → Google → Supabase Auth → App
                ↑                                   ↑
     qoxmibmbyjmkntzrckyr.supabase.co     (same URL, shown in consent)
```

The `qoxmibmbyjmkntzrckyr.supabase.co` domain is the Supabase project's default auth endpoint. Google displays this URL in the consent screen because Google redirects the user back to Supabase after authorization — and that redirect URL determines the domain shown.

## Current Configuration

- **Supabase project**: Elora (`qoxmibmbyjmkntzrckyr`)
- **Plan**: Free tier (no custom domain)
- **App URL**: `https://openledgerbysparsh.vercel.app`
- **Auth flow**: `signInWithOAuth({ provider: "google", options: { redirectTo: "origin/auth/callback" } })`

## What Can Be Fixed

### 1. Supabase Custom Domain (paid — Team plan ~$599/mo)

Configures a branded auth domain like `auth.openledgerbysparsh.vercel.app` in Supabase.
- **Effect**: Replaces `qoxmibmbyjmkntzrckyr.supabase.co` with your own domain everywhere in the OAuth flow.
- **Where**: Supabase Dashboard → Project Settings → Authentication → Custom Domain
- **Requires**: Team plan or higher + DNS record (CNAME to your Supabase project)
- **Priority**: High — this is the only way to remove the supabase.co URL from the OAuth flow

### 2. Google Cloud OAuth Consent Screen

Configure the Google Cloud project behind the OAuth app ID.
- **Effect**: Users see "OpenLedger" as the app name, with your logo and support email.
- **Where**: Google Cloud Console → APIs & Services → OAuth consent screen
- **What to set**:
  - App name: `OpenLedger`
  - User support email: sparsh@example.com (or your email)
  - Logo: Upload the OpenLedger icon (1024×1024 PNG)
  - Authorized domains: `openledgerbysparsh.vercel.app`, `qoxmibmbyjmkntzrckyr.supabase.co`
- **Note**: The URL will still be `qoxmibmbyjmkntzrckyr.supabase.co` unless a custom domain is set up, but the app name and logo will be correct.

### 3. Supabase Auth Settings (free)

Set branding in Supabase Auth → Settings:
- **App name**: `OpenLedger`
- **Site URL**: `https://openledgerbysparsh.vercel.app`
- **Redirect URLs**: `https://openledgerbysparsh.vercel.app/auth/callback`
- **Effect**: Changes email template branding but does NOT affect the OAuth consent screen URL.

### 4. Supabase Custom SMTP (Pro plan $25/mo)

Set up a custom SMTP provider (e.g., Resend) for auth emails.
- **Effect**: Auth emails come from a branded address like `noreply@openledgerbysparsh.vercel.app` instead of the default Supabase address.
- **Where**: Supabase Dashboard → Authentication → Settings → SMTP Settings

## Code-Level Changes (already correct)

The app's OAuth configuration is properly set up:
- `redirectTo: ${window.location.origin}/auth/callback` — dynamic, works for all environments
- No hardcoded supabase.co URLs in the app code
- The callback handler correctly exchanges the code for a session

## Recommended Action

1. **Immediate (free)**: Configure Google Cloud OAuth consent screen with OpenLedger branding (app name, logo, support email). This fixes what users see in the consent dialog.
2. **If budget allows**: Upgrade to Supabase Team plan and set up a custom auth domain. This is the only way to eliminate the supabase.co URL entirely.
3. **Optional**: Set up custom SMTP for branded auth emails.

## Exact Google Cloud Console Steps

1. Go to https://console.cloud.google.com/apis/credentials
2. Find the OAuth 2.0 Client ID used by Supabase (you may need to search — it's auto-created by Supabase)
3. Go to "OAuth consent screen" tab
4. Set:
   - App name: `OpenLedger`
   - Logo: Upload `public/icons/icon-192x192.png`
   - Support email: your email
   - Authorized domains: add `openledgerbysparsh.vercel.app`
5. Save

**To find the Google OAuth Client ID used by Supabase:**
1. Supabase Dashboard → Authentication → Providers → Google
2. Copy the "Client ID" shown there
3. Search for it in Google Cloud Console to find the matching OAuth app
