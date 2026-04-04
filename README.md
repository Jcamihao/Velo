# Triluga 0.2.0

Marketplace mobile-first de aluguel de carros entre pessoas, com frontend Angular PWA, backend NestJS modular e uma nova base de marca, operação e confiança para locatários e anunciantes.

## Destaques da versão

- identidade oficial `Triluga` aplicada ao produto, PWA, iOS, assets e ambiente local
- comparação de veículos no fluxo de busca e detalhe
- perfil público do anunciante com avaliações de usuário
- checklist de retirada e devolução com fotos dentro da reserva
- seed, infraestrutura local e docs alinhados ao novo domínio da plataforma

## Arquitetura

- Frontend: Angular 16 standalone, SCSS, mobile first, lazy loading e service worker.
- Backend: NestJS 10 em monólito modular com módulos de domínio e serviços transversais.
- Banco: PostgreSQL com Prisma.
- Infra local: Docker Compose com PostgreSQL, Redis, MinIO, backend e frontend.
- Integrações desacopladas:
  - `StorageService` para MinIO/S3 futuro.
  - `MockPaymentGateway` para evoluir para gateway real.
  - `CacheQueueService` para cache Redis e filas BullMQ.

## Estrutura

```text
.
├── backend
│   ├── prisma
│   └── src
│       ├── auth
│       ├── users
│       ├── profiles
│       ├── vehicles
│       ├── vehicle-images
│       ├── availability
│       ├── bookings
│       ├── payments
│       ├── reviews
│       ├── notifications
│       ├── admin
│       ├── privacy
│       ├── storage
│       ├── cache-queue
│       ├── common
│       └── prisma
├── frontend
│   └── src/app
│       ├── core
│       ├── shared
│       └── features
├── docs
└── docker-compose.yml
```

## Banco

Entidades principais modeladas no Prisma:

- `User`
- `Profile`
- `Vehicle`
- `VehicleImage`
- `VehicleAvailability`
- `VehicleBlockedDate`
- `Booking`
- `BookingStatusHistory`
- `Payment`
- `Review`
- `Notification`

Regras centrais já refletidas no schema e nos serviços:

- múltiplos veículos por proprietário
- busca por cidade/período
- prevenção de conflito com reservas aprovadas e datas bloqueadas
- cálculo de subtotal, taxa da plataforma e total
- histórico de status da reserva
- avaliações pós-locação

## Backend

Endpoints principais implementados:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /privacy/policy`
- `GET /privacy/me`
- `PATCH /privacy/me/preferences`
- `GET /privacy/me/export`
- `GET /privacy/me/requests`
- `POST /privacy/me/requests`
- `GET /vehicles`
- `GET /vehicles/me`
- `GET /vehicles/:id`
- `POST /vehicles`
- `PATCH /vehicles/:id`
- `DELETE /vehicles/:id`
- `POST /vehicles/:id/images`
- `GET /vehicles/:id/availability`
- `PUT /vehicles/:id/availability`
- `POST /vehicles/:id/blocked-dates`
- `POST /bookings`
- `GET /bookings/my`
- `GET /bookings/owner`
- `PATCH /bookings/:id/approve`
- `PATCH /bookings/:id/reject`
- `PATCH /bookings/:id/cancel`
- `POST /payments/checkout`
- `POST /reviews`
- `GET /reviews/vehicle/:vehicleId`
- `GET /notifications/my`
- `PATCH /notifications/:id/read`
- `GET /admin/dashboard`
- `GET /admin/users`
- `GET /admin/vehicles`
- `GET /admin/bookings`
- `GET /admin/privacy/requests`
- `PATCH /admin/users/:id/block`
- `PATCH /admin/vehicles/:id/deactivate`

No Docker Compose padrão, Swagger fica disponível em `http://localhost:3002/api/docs`.

## Frontend

Fluxos disponíveis no Angular:

- home com busca rápida
- lista com filtros e carregamento progressivo
- detalhe do veículo com galeria e reviews
- solicitação de reserva
- login e cadastro
- minhas reservas
- perfil com notificações
- política de privacidade pública
- central de privacidade autenticada
- painel do proprietário
- painel admin

Componentes obrigatórios implementados:

- card de veículo
- header com busca
- filtro modal
- galeria de imagens
- botão fixo mobile
- bottom navigation

Preparação mobile adicional:

- base do Capacitor configurada para iOS em `frontend/capacitor.config.ts`
- projeto nativo iOS gerado em `frontend/ios`

## Rodando localmente

### Opção 1: um comando com Docker

```bash
cp .env.example .env
docker compose up --build
```

Frontend: `http://localhost:4202`  
Backend: `http://localhost:3002/api/v1`  
Swagger: `http://localhost:3002/api/docs`  
MinIO Console: `http://localhost:9005`

Se alguma porta já estiver em uso na sua máquina, ajuste no `.env` antes de subir. Exemplo:

```env
POSTGRES_HOST_PORT=5436
```

### Opção 2: apps locais + infra em containers

```bash
cp backend/.env.example backend/.env
npm run dev:infra
npm --prefix backend run prisma:generate
npm --prefix backend run start:dev
npm --prefix frontend start
```

## Seed

Depois da infraestrutura estar disponível:

```bash
npm run db:seed
```

Se precisar recriar o Postgres local do zero e recolocar o `triluga` como banco/usuário principal do ambiente:

```bash
npm run db:rebuild
```

Credenciais sugeridas:

- Admin: `admin@triluga.local` / `Admin123!`
- Usuária anunciante: `mariana@triluga.local` / `User123!`
- Usuário locatário: `lucas@triluga.local` / `User123!`

## Wireframes

Os wireframes textuais mobile first estão em [docs/wireframes.md](./docs/wireframes.md).

## Privacidade e LGPD

- política resumida: [docs/privacy-policy.md](./docs/privacy-policy.md)
- operação e atendimento: [docs/lgpd-operations.md](./docs/lgpd-operations.md)
- retenção de dados: [docs/data-retention.md](./docs/data-retention.md)
- playbook de QA: [docs/qa-playbook.md](./docs/qa-playbook.md)

## Deploy

Guia de produção para frontend no Vercel e backend no Railway em [docs/deploy-vercel-railway.md](./docs/deploy-vercel-railway.md).

## iOS com Capacitor

Guia para abrir o Triluga no Xcode e testar em iPhone em [docs/ios-capacitor.md](./docs/ios-capacitor.md).
