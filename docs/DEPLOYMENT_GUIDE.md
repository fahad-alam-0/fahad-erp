# Deployment Guide - Fahad ERP PWA

## Vercel / Netlify Deployment
1. Set Build Command: `npm run build`
2. Set Output Directory: `dist`
3. Configure Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Self-Hosted (Nginx)
Ensure SPA rewrite rules are enabled so React Router paths resolve properly:

```nginx
server {
    listen 80;
    server_name erp.fahadelectronics.com;
    root /var/www/fahad-erp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
