# Triluga Backend 0.2.0

API NestJS do marketplace Triluga.

## Escopo atual

- autenticação com access e refresh token
- perfis, veículos, favoritos e alertas
- reservas com aprovações, cancelamento e checklist de retirada/devolução
- avaliações de veículos e avaliações públicas de usuários
- storage público para imagens e arquivos operacionais
- analytics, privacidade e admin

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
```

## Desenvolvimento

```bash
npm run start:dev
```

## Banco e seed

```bash
npm run prisma:migrate
npm run prisma:seed
```

## Build e testes

```bash
npm run build
npm test -- --runInBand
```
