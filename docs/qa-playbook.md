# Playbook de QA do Velo

## Objetivo

Este documento ajuda um QA a entender rapidamente o produto Velo, preparar o ambiente local, navegar pelos perfis da aplicacao e executar testes com contexto de negocio.

O foco aqui e:

- entender o que o app faz hoje
- saber o que existe no frontend e no backend
- reconhecer limites conhecidos para evitar falso positivo
- executar smoke tests e regressao com criterio

## O que e o Velo

Velo e um marketplace P2P de aluguel de veiculos. O fluxo principal conecta um locatario a um proprietario, com busca, detalhe do anuncio, reserva, acompanhamento de status, favoritos, chat e paines de gestao.

O projeto esta dividido assim:

- `frontend`: Angular standalone, PWA, mobile first
- `backend`: NestJS modular
- `database`: PostgreSQL com Prisma
- `infra local`: Docker Compose com Postgres, Redis e MinIO

## Perfis de usuario

Existem 3 papeis principais:

- `RENTER`: navega, favorita, conversa e solicita reservas
- `OWNER`: cadastra veiculos, publica anuncios, gerencia agenda e responde pedidos
- `ADMIN`: modera usuarios, veiculos, verificacao documental e pedidos de privacidade

## Estado atual do produto

Hoje, o Velo cobre estes fluxos:

- autenticacao e sessao
- busca de veiculos com filtros
- detalhe do anuncio
- favoritos
- chat entre locatario e proprietario
- criacao e acompanhamento de reservas
- painel do proprietario
- painel admin
- politica/central de privacidade e controles LGPD

Limites importantes para QA:

- nao existe billing real. O sistema calcula preco, subtotal, descontos e taxa, mas nao faz cobranca real em gateway.
- nao existe checkout operacional no frontend.
- o `README` ainda lista `POST /payments/checkout`, mas o modulo de pagamentos real nao esta implementado.
- a criacao de review existe no backend, mas nao ha um fluxo dedicado e visivel no frontend para o usuario enviar avaliacao.
- cancelamento hoje altera status da reserva, mas nao executa estorno financeiro.
- documento e CNH agora sao privados; o acesso acontece por URL temporaria assinada.

## Dados seed

O seed cria:

- 1 admin
- 1 owner
- 1 renter
- 3 veiculos
- 1 reserva concluida
- 1 pagamento mockado como `PAID`
- 1 review
- notificacoes e visitas do site

Credenciais padrao:

- `admin@velo.local` / `Admin123!`
- `owner@velo.local` / `Owner123!`
- `renter@velo.local` / `Renter123!`

## Setup local recomendado

### Opcao A: infra em Docker + apps locais

```bash
cd /home/caminhao/freela/codeStage/Velo
cp backend/.env.example backend/.env
npm run dev:infra
npm --prefix backend run prisma:deploy
npm --prefix backend run prisma:generate
npm --prefix backend run start:dev
npm --prefix frontend start
```

### Variaveis que o QA deve adicionar manualmente

Os exemplos de `.env` ainda nao trazem todas as chaves do pacote de privacidade/storage privado. Adicione estas entradas em `backend/.env` e, se usar `docker compose up`, tambem no `.env` da raiz:

```env
JWT_REFRESH_COOKIE_NAME=velo_refresh_token
JWT_REFRESH_COOKIE_SECURE=false
JWT_REFRESH_COOKIE_SAME_SITE=lax
MINIO_PRIVATE_BUCKET=velo-private
MINIO_PRIVATE_URL_EXPIRES_IN_SECONDS=600
PRIVACY_CONTACT_EMAIL=privacidade@velo.local
PRIVACY_POLICY_VERSION=2026-03-27
```

### URLs uteis

- frontend: `http://localhost:4202`
- backend API: `http://localhost:3002/api/v1`
- swagger: `http://localhost:3002/api/docs`
- MinIO console: `http://localhost:9005`

### Ferramentas de apoio para QA

- Swagger para validar endpoints e payloads
- DevTools do navegador para cookies, `localStorage`, `sessionStorage` e network
- MinIO Console para inspecionar uploads
- Prisma Studio para olhar banco:

```bash
cd /home/caminhao/freela/codeStage/Velo/backend
npx prisma studio
```

## Mapa funcional da aplicacao

### Visitante logado ou anonimo

- home com atalhos por marca
- busca com filtros, mapa e alertas
- detalhe do veiculo
- politica publica de privacidade

### Locatario

- cadastro/login
- alertas de busca
- favoritos
- chat
- reserva
- historico em "Minhas reservas"
- perfil
- central de privacidade

### Proprietario

- cadastro/login
- dashboard com indicadores
- criacao e edicao de anuncio
- upload de fotos
- configuracao de promocao e preco
- disponibilidade e bloqueios
- aprovacao e rejeicao de reservas
- chat

### Admin

- dashboard administrativo
- bloqueio de usuario
- aprovacao/recusa de documento e CNH
- desativacao de veiculo
- tratamento de solicitacoes LGPD

## Regras de negocio que o QA precisa saber

### Autenticacao e sessao

- cadastro so permite `OWNER` e `RENTER`
- `ADMIN` nao pode ser criado via cadastro publico
- refresh token fica em cookie `httpOnly`
- frontend guarda apenas sessao reduzida em `sessionStorage`
- `localStorage` deve guardar apenas dicas de sessao e preferencia de analytics

### Busca e listagem

- resultados filtram por:
  - texto
  - cidade
  - periodo
  - tipo de veiculo
  - categoria
  - faixa de preco
  - geolocalizacao e raio
- veiculos com conflito de reserva aprovada ou bloqueio manual devem sair do resultado quando o periodo e informado

### Favoritos

- so usuario autenticado consegue manter favoritos
- o mesmo veiculo nao deve duplicar em favoritos
- remover favorito deve refletir na listagem e no detalhe

### Chat

- a conversa nasce a partir da tela do veiculo
- nao e permitido abrir chat para o proprio anuncio
- mensagens atualizam a conversa e contagem de nao lidas
- ha integracao REST + socket

### Reserva

- o backend calcula preco com:
  - diaria media
  - extras
  - descontos
  - taxa da plataforma
- `INSTANT` aprova a reserva na hora
- `MANUAL` cria reserva `PENDING`
- owner pode aprovar ou rejeitar reservas pendentes
- renter e owner podem cancelar reservas `PENDING` ou `APPROVED`
- reservas aprovadas migram automaticamente para `IN_PROGRESS` e depois `COMPLETED` conforme datas

### Pagamento

- o pagamento exibido hoje e conceitual/mock
- nao ha checkout real, split real ou reembolso financeiro real
- a reserva pode existir sem cobranca real

### Reviews

- uma review so pode ser criada pelo locatario da reserva
- a reserva precisa estar concluida
- hoje isso e mais facil de validar via API do que via UI

### Privacidade/LGPD

- o banner de analytics deve aparecer quando o usuario ainda nao respondeu a preferencia
- analytics nao essencial so pode disparar com consentimento
- documentos de verificacao nao devem circular em URL publica permanente
- central de privacidade permite exportacao e abertura de solicitacoes
- admin pode listar e mudar status das solicitacoes

## Areas de risco que merecem atencao extra

- copy de preco: varias telas exibem `dailyRate` com rotulo visual de "`/ semana`"; vale validar se isso esta consistente com o calculo real da reserva.
- billing: como nao existe checkout real, qualquer comportamento de cobranca deve ser tratado como fora do escopo atual, nao como bug automatico.
- rotas protegidas: testar navegacao logada e anonima para chat, favoritos, profile, owner dashboard, admin e privacy center.
- arquivos privados: validar que documento/CNH abrem por endpoint de URL temporaria, nao por campo publico direto.
- sessao: validar restauracao apos reload, expiracao de token e logout.

## Smoke test recomendado

Execute este roteiro sempre que houver build nova:

1. Subir ambiente, rodar seed e fazer login com `RENTER`.
2. Abrir home, navegar para busca e confirmar que veiculos seed aparecem.
3. Salvar um alerta de busca e confirmar que ele aparece na propria pagina de busca.
4. Favoritar um veiculo e confirmar que ele entra em `/favorites`.
5. Abrir detalhe de um veiculo, iniciar chat e enviar mensagem.
6. Criar uma reserva em um veiculo `INSTANT` e validar status aprovado imediato.
7. Criar uma reserva em um veiculo `MANUAL` e validar status pendente.
8. Acessar `/my-bookings` e confirmar dados, total, status e botao de cancelar quando aplicavel.
9. Fazer logout e validar limpeza da sessao no navegador.
10. Fazer login com `OWNER` e abrir `/owner-dashboard`.
11. Aprovar ou rejeitar uma reserva pendente e confirmar atualizacao para o locatario.
12. Criar ou editar um anuncio, publicar e validar presenca na busca.
13. Subir foto(s) do anuncio e validar a galeria.
14. Ajustar disponibilidade/bloqueio e validar reflexo na reserva e na busca por periodo.
15. Fazer login com `ADMIN` e validar dashboard, usuarios, veiculos e reservas.
16. Aprovar ou recusar documento/CNH e validar status no perfil do usuario.
17. Abrir `/privacy` e `/privacy-center`, mudar consentimento de analytics, exportar dados e criar uma solicitacao LGPD.
18. Em `/admin`, validar que a solicitacao LGPD aparece e pode mudar para `IN_REVIEW` e `COMPLETED`.

## Roteiro de regressao por perfil

### Visitante

- home carrega sem login
- busca aceita filtros e query string
- detalhe abre a partir da busca
- links de privacidade funcionam

### Locatario

- cadastro com avatar opcional
- login redireciona corretamente
- alerta de busca salva e remove corretamente
- favoritos persistem
- chat cria conversa e envia mensagem
- reserva com datas invalidas falha com mensagem
- reserva com conflito de agenda nao pode ser enviada
- cancelamento de reserva atualiza lista
- perfil salva dados e uploads
- central de privacidade responde

### Proprietario

- login redireciona para area de anuncios
- criar anuncio com campos minimos
- editar anuncio existente
- alternar entre rascunho/publicado
- adicionar imagens
- configurar promocoes
- bloquear datas
- aprovar/rejeitar reserva
- acompanhar indicadores no dashboard

### Admin

- login redireciona para `/admin`
- listar usuarios
- bloquear usuario
- listar veiculos
- desativar veiculo
- abrir doc/CNH por link temporario
- listar pedidos LGPD
- mudar status de pedido LGPD

## Casos negativos importantes

- tentar cadastrar `ADMIN`
- tentar reservar veiculo proprio
- tentar iniciar chat no proprio anuncio
- tentar aprovar reserva ja aprovada
- tentar cancelar reserva `COMPLETED`
- tentar enviar review antes do fim da reserva
- tentar salvar alerta de busca sem filtro
- tentar abrir rota protegida sem login
- tentar abrir arquivo de verificacao inexistente

## Validacoes tecnicas no navegador

Ao testar login/sessao:

- `sessionStorage` deve conter `velo.accessToken` e `velo.user`
- refresh token nao deve aparecer em `localStorage`
- cookie `velo_refresh_token` deve existir
- apos logout, sessao e cookie devem ser invalidados

Ao testar privacidade:

- `localStorage` deve refletir `velo.privacy.analyticsConsent`
- se o consentimento estiver negado, a chamada de analytics nao deve sair

Ao testar documentos:

- o payload de perfil deve sinalizar `hasDocumentImage` e `hasDriverLicenseImage`
- ao clicar para abrir arquivo, o frontend deve chamar endpoint de URL temporaria

## Validacoes no backend e banco

Use Swagger para:

- autenticar
- validar endpoints de `vehicles`, `bookings`, `profiles`, `privacy`, `admin` e `reviews`

Use Prisma Studio para conferir:

- `Booking`
- `BookingStatusHistory`
- `Payment`
- `Profile`
- `PrivacyRequest`
- `Favorite`
- `SearchAlert`
- `Notification`

Use MinIO para conferir:

- imagens publicas de anuncios/avatar
- bucket privado de documentos

## Sugestao de dados para teste

Para evitar conflito com a reserva seed, prefira datas futuras, por exemplo:

- retirada: 10 dias a frente
- devolucao: 13 dias a frente

Use estes cenarios:

- veiculo instantaneo: teste aprovacao automatica
- veiculo manual: teste fluxo pendente -> aprovada/rejeitada
- veiculo com addons: teste impacto no valor total
- veiculo com promocao/cupom: teste descontos na preview

## Como registrar bugs

Ao abrir bug, capture:

- perfil usado (`RENTER`, `OWNER`, `ADMIN`)
- rota/tela
- dados usados
- resultado esperado
- resultado obtido
- request/response relevante da API
- evidencias visuais

Classifique com este raciocinio:

- `P0`: bloqueia reserva, login, acesso, upload ou admin
- `P1`: quebra fluxo principal mas ha contorno
- `P2`: problema funcional secundario
- `P3`: copy, layout, polish ou inconsistencias nao bloqueantes

## Checklist final de aceite

Antes de encerrar a rodada, confirme:

- build sobe sem erro
- smoke por perfil passou
- nenhum fluxo protegido abriu para usuario anonimo
- nenhum arquivo sensivel ficou publico
- analytics respeitou consentimento
- owner e admin conseguiram executar suas acoes principais
- tickets de billing foram avaliados com o escopo atual em mente

## Resumo rapido para um QA novo

Se voce tiver 15 minutos para conhecer o Velo, faca isto:

1. Rode o ambiente local e o seed.
2. Entre como `RENTER`, navegue da home ate uma reserva.
3. Entre como `OWNER`, aprove ou rejeite a reserva.
4. Entre como `ADMIN`, veja usuarios e privacidade.
5. Revise cookies, storage e links temporarios de documento.

Com isso voce ja entende o coracao do produto e consegue seguir para regressao com contexto.
