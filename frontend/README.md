# Triluga Frontend 0.2.0

Aplicação Angular standalone do marketplace Triluga.

## Escopo atual

- home, busca e detalhe de veículo
- fluxo de favoritos, chat, perfil e reservas
- comparação entre veículos
- dashboard de anúncios e área administrativa
- branding PWA e base iOS com Capacitor

## Desenvolvimento

```bash
npm install
npm start
```

Por padrão, o app usa:

- `FRONTEND_API_BASE_URL=http://localhost:3000/api/v1`
- `FRONTEND_WS_BASE_URL=http://localhost:3000`

## Build

```bash
npm run build
```

## iOS

```bash
npm run ios:prepare
npm run cap:open:ios
```
