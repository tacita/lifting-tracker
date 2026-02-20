# Supabase Setup

## 1) Create table + RLS
Run `/Users/tacita/Projects/lifting-tracker/supabase/schema.sql` in Supabase SQL Editor.

## 2) Auth providers
- Enable `Google` provider in Auth > Providers.
- Enable `Email` provider with magic links.

## 3) Bot protection (recommended)
- In Supabase Auth settings, enable CAPTCHA protection and configure Cloudflare Turnstile.
- This protects magic-link requests from automated abuse.

## 4) Add app URL
In Supabase Auth URL configuration:
- Add your production URL (and localhost while testing) as a redirect URL.

## 5) Connect app
Recommended: hardcode credentials once in `/Users/tacita/Projects/lifting-tracker/supabase-config.js` and deploy.
- Set `SUPABASE_URL`
- Set `SUPABASE_ANON_KEY`

Then users only need to sign in (no per-device config entry).

Fallback option: In app Settings > Account, paste URL/key and save.

## Notes on migration
- Existing local IndexedDB data is used as the initial snapshot for each account if that account has no cloud data yet.
- After sign-in, local edits auto-sync to that signed-in account.
