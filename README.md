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

Production deploy bo'yicha to'liq yo'riqnoma: [DEPLOYMENT.md](DEPLOYMENT.md).

Qisqa oqim:

```bash
npm ci
cp .env.production.example .env
npm run build
docker build -f server/code-runner.Dockerfile -t attestatsiya-python-runner:latest .
mkdir -p logs
pm2 start ecosystem.config.cjs
```

Tekshirish:

```bash
curl http://127.0.0.1:3001/api/health
```
