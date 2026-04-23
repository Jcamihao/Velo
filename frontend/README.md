# Triluga Frontend 0.5.0

Aplicação Angular standalone do classificado Triluga.

## Escopo atual

- home, busca e detalhe de veículo
- fluxo de favoritos, chat e perfil
- comparação entre veículos
- dashboard de anúncios e área administrativa
- branding PWA e base iOS com Capacitor

## Desenvolvimento

```bash
npm install
npm start
```

Por padrão, o app usa:

- `FRONTEND_API_BASE_URL=http://localhost:3002/api/v1`
- `FRONTEND_WS_BASE_URL=http://localhost:3002`

## Build

```bash
npm run build
```

## iOS

```bash
npm run ios:prepare
npm run cap:open:ios
```
