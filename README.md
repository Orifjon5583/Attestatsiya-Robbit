# Attestatsiya-Robbit

React va Vite asosida yaratilgan attestatsiya platformasi.

## PostgreSQL bilan ishga tushirish

1. pgAdmin 4 ichida `Attestatsiya-Robbit` nomli database yarating.
2. `.env.example` faylidan nusxa olib `.env` yarating.
3. `.env` ichidagi `DB_PASSWORD` qiymatini PostgreSQL parolingizga almashtiring.
4. Backendni ishga tushiring:

```bash
npm run dev:server
```

5. Frontendni alohida terminalda ishga tushiring:

```bash
npm run dev
```

Admin panelda "PostgreSQL bazaga ulangan" xabari chiqsa, aloqa ishlayapti.

## Serverga qo'yish

Serverda Node.js 20+, PostgreSQL va PM2 o'rnatilgan bo'lishi kerak.

1. Loyihani serverga yuklang va papkaga kiring.
2. Paketlarni o'rnating:

```bash
npm ci
```

3. PostgreSQL database yarating:

```sql
CREATE DATABASE "Attestatsiya-Robbit";
```

4. `.env.example` faylidan `.env` yarating va production qiymatlarini yozing:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Attestatsiya-Robbit
DB_USER=postgres
DB_PASSWORD=your_secure_password
PORT=3001
CLIENT_ORIGIN=https://your-domain.uz
VITE_API_URL=/api
```

5. Frontendni build qiling:

```bash
npm run build
```

6. Ilovani PM2 bilan ishga tushiring:

```bash
pm2 start npm --name attestatsiya -- start
pm2 save
pm2 startup
```

7. Nginx reverse proxy namunasi:

```nginx
server {
  server_name your-domain.uz www.your-domain.uz;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Tekshirish:

```bash
curl http://127.0.0.1:3001/api/health
```
