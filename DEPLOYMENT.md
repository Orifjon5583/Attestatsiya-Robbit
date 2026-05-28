# Production Deployment

Bu loyiha productionda bitta Node/Express server orqali ishlaydi: `dist/` ichidagi React buildni ham, `/api` backendni ham `server/index.mjs` serve qiladi.

## 1. Server Talablari

- Node.js 20+
- PostgreSQL 14+
- Nginx
- PM2
- Docker, agar `CODE_RUNNER=docker` ishlatilsa
- Redis, agar IP ban/rate-limit holatini restartdan keyin ham saqlamoqchi bo'lsangiz

## 2. Loyihani Tayyorlash

```bash
git clone <repo-url> attestatsiya
cd attestatsiya
npm ci
cp .env.production.example .env
```

`.env` ichidagi qiymatlarni server domeningiz va parollaringizga almashtiring:

```env
NODE_ENV=production
CLIENT_ORIGIN=https://your-domain.uz
DB_PASSWORD=strong_password
JWT_SECRET=32_plus_random_bytes
ADMIN_EMAIL=admin@your-domain.uz
ADMIN_PASSWORD=strong_admin_password
```

Random secret yaratish:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 3. PostgreSQL

```sql
CREATE DATABASE "Attestatsiya-Robbit";
CREATE USER attestatsiya_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE "Attestatsiya-Robbit" TO attestatsiya_user;
```

Schema server start paytida avtomatik yaratiladi.

## 4. Frontend Build

```bash
npm run build
```

## 5. Kod Runner Docker Image

Productionda kod tekshirish uchun Docker ishlating:

```bash
docker build -f server/code-runner.Dockerfile -t attestatsiya-python-runner:latest .
```

`.env`:

```env
CODE_RUNNER=docker
CODE_DOCKER_IMAGE=attestatsiya-python-runner:latest
```

## 6. PM2 Bilan Ishga Tushirish

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Tekshirish:

```bash
curl http://127.0.0.1:3001/api/health
pm2 logs attestatsiya
```

## 7. Nginx

`server/nginx-security.conf` faylini domeningizga moslang:

- `server_name example.com;`
- SSL certificate path
- `proxy_pass http://127.0.0.1:3001;`

So'ng:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL

Let's Encrypt:

```bash
sudo certbot --nginx -d your-domain.uz -d www.your-domain.uz
```

## 9. Redis Ixtiyoriy

Redis yoqilsa:

```env
REDIS_URL=redis://127.0.0.1:6379
```

Redis bo'lmasa server memory mode bilan ishlaydi, lekin restartdan keyin ban/rate-limit counterlari tozalanadi.

## 10. Deploydan Keyin Tekshiruv

```bash
curl https://your-domain.uz/api/health
npm audit --audit-level=moderate
```

Admin login:

- Email: `.env` ichidagi `ADMIN_EMAIL`
- Parol: `.env` ichidagi `ADMIN_PASSWORD`

## Muhim

- `.env` GitHubga chiqmasin.
- Productionda `NODE_ENV=production`.
- `CLIENT_ORIGIN` aniq domen bo'lsin.
- `JWT_SECRET`, `ADMIN_PASSWORD`, `DB_PASSWORD` kuchli bo'lsin.
- Kod execution uchun `CODE_RUNNER=docker` ishlating.
