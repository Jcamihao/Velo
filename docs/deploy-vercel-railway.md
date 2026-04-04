# Deploy em produção com Vercel + Railway

## Arquitetura recomendada

- Frontend Angular no Vercel
- Backend NestJS no Railway
- PostgreSQL no Railway
- Redis no Railway
- Storage S3 compatível para uploads

## 1. Backend no Railway

No serviço do backend, configure o `Root Directory` como `backend`.

Como este diretório já tem `Dockerfile`, o Railway pode subir usando Docker normalmente.

### Variáveis obrigatórias

```env
PORT=3000
APP_URL=https://SEU_BACKEND.up.railway.app
DATABASE_URL=postgresql://...

JWT_ACCESS_SECRET=troque_isto
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=troque_isto
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_COOKIE_NAME=triluga_refresh_token
JWT_REFRESH_COOKIE_SECURE=true
JWT_REFRESH_COOKIE_SAME_SITE=lax
PLATFORM_FEE_RATE=0.12
PRIVACY_CONTACT_EMAIL=privacidade@seudominio.com
PRIVACY_POLICY_VERSION=2026-03-27

REDIS_URL=redis://...
CACHE_TTL_SECONDS=300

MINIO_ENDPOINT=...
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=triluga-public
MINIO_PRIVATE_BUCKET=triluga-private
MINIO_PRIVATE_URL_EXPIRES_IN_SECONDS=600
MINIO_PUBLIC_URL=https://SEU_BUCKET_PUBLICO
```

### Observações importantes

- `DATABASE_URL` deve vir do PostgreSQL do Railway.
- `REDIS_URL` deve vir do Redis do Railway.
- O projeto precisa de storage compatível com S3 para upload de imagens públicas e documentos privados. Se você não for usar MinIO fora do Docker, pode apontar essas variáveis para Cloudflare R2, AWS S3 ou outro provedor S3 compatível.
- O `APP_URL` precisa ser a URL pública final do backend no Railway.
- O container já sobe executando `prisma db push` antes da API.

## 2. Frontend no Vercel

No projeto da Vercel:

- defina o `Root Directory` como `frontend`
- `Build Command`: `npm run build`
- `Output Directory`: `dist/frontend`

### Variáveis do frontend

```env
FRONTEND_API_BASE_URL=https://SEU_BACKEND.up.railway.app/api/v1
FRONTEND_WS_BASE_URL=https://SEU_BACKEND.up.railway.app
FRONTEND_CLIENT_LOGGING_ENABLED=true
```

Essas variáveis geram o arquivo `assets/app-config.js` no build e fazem o Angular parar de apontar para `localhost` em produção.

## 3. Ordem de subida

1. Suba Postgres e Redis no Railway.
2. Suba o backend no Railway e confirme o health básico em `/api/v1` e `/api/docs`.
3. Configure as variáveis do frontend com a URL final do backend.
4. Suba o frontend no Vercel.

## 4. Checklist rápido

- Backend respondendo em `https://...railway.app/api/v1`
- Swagger abrindo em `https://...railway.app/api/docs`
- Frontend usando a URL do Railway, não `localhost`
- WebSocket conectado na mesma base pública do backend
- Bucket público de imagens configurado
- Bucket privado de documentos configurado
