# Playbook de QA do Triluga

## Objetivo

Este documento ajuda um QA a entender rapidamente o produto Triluga, preparar o ambiente local, navegar pelos perfis da aplicacao e executar testes com contexto de negocio.

O foco aqui e:

- entender o que o app faz hoje
- saber o que existe no frontend e no backend
- reconhecer limites conhecidos para evitar falso positivo
- executar smoke tests e regressao com criterio

## O que e o Triluga

Triluga e um classificado P2P de veiculos. O fluxo principal conecta interessados a anunciantes, com busca, detalhe do anuncio, favoritos, chat e paines de gestao.

O projeto esta dividido assim:

- `frontend`: Angular standalone, PWA, mobile first
- `backend`: NestJS modular
- `database`: PostgreSQL com Prisma
- `infra local`: Docker Compose com Postgres, Redis e MinIO

## Perfis de usuario

Existem 3 papeis principais:

- `USER`: navega, favorita, anuncia e conversa com outros usuarios
- `OWNER`: papel de negocio usado para quem publica anuncios
- `ADMIN`: modera usuarios, veiculos, verificacao documental e pedidos de privacidade

## Estado atual do produto

Hoje, o Triluga cobre estes fluxos:

- autenticacao e sessao
- busca de veiculos com filtros
- detalhe do anuncio
- favoritos
- chat entre interessado e anunciante
- painel do proprietario
- painel admin
- politica/central de privacidade e controles LGPD

Limites importantes para QA:

- nao existe fluxo transacional operacional.
- o produto atual e um classificado: a negociacao acontece pelo chat.
- a criacao de review existe no backend, mas nao ha um fluxo dedicado e visivel no frontend para o usuario enviar avaliacao.
- documento e CNH agora sao privados; o acesso acontece por URL temporaria assinada.

## Dados seed

O seed cria:

- 1 admin
- 1 usuária anunciante
- 1 usuário interessado
- 3 veiculos
- 1 review
- notificacoes e visitas do site

Credenciais padrao:

- `admin@triluga.local` / `Admin123!`
- `mariana@triluga.local` / `User123!`
- `lucas@triluga.local` / `User123!`

## Setup local recomendado

### Opcao A: infra em Docker + apps locais

```bash
cd /Users/caminhao/Documents/codeStage/Triluga
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
JWT_REFRESH_COOKIE_NAME=triluga_refresh_token
JWT_REFRESH_COOKIE_SECURE=false
JWT_REFRESH_COOKIE_SAME_SITE=lax
MINIO_PRIVATE_BUCKET=triluga-private
MINIO_PRIVATE_URL_EXPIRES_IN_SECONDS=600
PRIVACY_CONTACT_EMAIL=privacidade@triluga.local
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
cd /Users/caminhao/Documents/codeStage/Triluga/backend
npx prisma studio
```

## Mapa funcional da aplicacao

### Visitante logado ou anonimo

- home com atalhos por marca
- busca com filtros, mapa e alertas
- detalhe do veiculo
- politica publica de privacidade

### Interessado

- cadastro/login
- alertas de busca
- favoritos
- chat
- perfil
- central de privacidade

### Proprietario

- cadastro/login
- dashboard com indicadores
- criacao de anuncio com navegação pelo fluxo de 3 passos
- navegacao em passos pendentes refletindo warning visual no wizard
- testar travamento do envio com +7 imagens no anuncio
- editar anuncio existente
- chat

### Admin

- dashboard administrativo
- bloqueio de usuario
- aprovacao/recusa de documento e CNH
- desativacao de veiculo
- tratamento de solicitacoes LGPD

## Regras de negocio que o QA precisa saber

### Autenticacao e sessao

- cadastro publico cria usuarios comuns
- `ADMIN` nao pode ser criado via cadastro publico
- refresh token fica em cookie `httpOnly`
- frontend guarda apenas sessao reduzida em `sessionStorage`
- `localStorage` deve guardar apenas dicas de sessao e preferencia de analytics

### Busca e listagem

- resultados filtram por:
  - texto
  - cidade
  - tipo de veiculo
  - categoria
  - faixa de preco
  - geolocalizacao e raio

### Favoritos

- so usuario autenticado consegue manter favoritos
- o mesmo veiculo nao deve duplicar em favoritos
- remover favorito deve refletir na listagem e no detalhe

### Chat

- a conversa nasce a partir da tela do veiculo
- nao e permitido abrir chat para o proprio anuncio
- mensagens atualizam a conversa e contagem de nao lidas
- ha integracao REST + socket

### Reviews

- reviews podem ser criadas para um anuncio ou para um usuario
- o backend impede autoavaliacao e duplicidade do mesmo autor para o mesmo alvo
- hoje isso e mais facil de validar via API do que via UI

### Privacidade/LGPD

- o banner de analytics deve aparecer quando o usuario ainda nao respondeu a preferencia
- analytics nao essencial so pode disparar com consentimento
- documentos de verificacao nao devem circular em URL publica permanente
- central de privacidade permite exportacao e abertura de solicitacoes
- admin pode listar e mudar status das solicitacoes

## Areas de risco que merecem atencao extra

- rotas protegidas: testar navegacao logada e anonima para chat, favoritos, profile, owner dashboard, admin e privacy center.
- arquivos privados: validar que documento/CNH abrem por endpoint de URL temporaria, nao por campo publico direto.
- sessao: validar restauracao apos reload, expiracao de token e logout.

## Smoke test recomendado

Execute este roteiro sempre que houver build nova:

1. Subir ambiente, rodar seed e fazer login com um usuario comum.
2. Abrir home, navegar para busca e confirmar que veiculos seed aparecem.
3. Salvar um alerta de busca e confirmar que ele aparece na propria pagina de busca.
4. Favoritar um veiculo e confirmar que ele entra em `/favorites`.
5. Abrir detalhe de um veiculo, iniciar chat e enviar mensagem.
6. Fazer logout e validar limpeza da sessao no navegador.
8. Fazer login com `OWNER` e abrir `/owner-dashboard`.
9. Criar um anúncio navegando por todo o fluxo wizard em 3 etapas (Dados principais, Condições gerais, Fotos e Preços).
10. Avançar para um passo seguinte deixando dados obrigatórios vazios, para validar a exibição de ícone de (⚠️) "Alerta Laranja" apontando campos incompletos.
11. Preencher tudo corretamente, testar o limite de 7 imagens da galeria, publicar e checar na busca online.
10. Fazer login com `ADMIN` e validar dashboard, usuarios, veiculos e privacidade.
11. Aprovar ou recusar documento/CNH e validar status no perfil do usuario.
12. Abrir `/privacy` e `/privacy-center`, mudar consentimento de analytics, exportar dados e criar uma solicitacao LGPD.
13. Em `/admin`, validar que a solicitacao LGPD aparece e pode mudar para `IN_REVIEW` e `COMPLETED`.

## Roteiro de regressao por perfil

### Visitante

- home carrega sem login
- busca aceita filtros e query string
- detalhe abre a partir da busca
- links de privacidade funcionam

### Interessado

- cadastro com avatar opcional
- login redireciona corretamente
- alerta de busca salva e remove corretamente
- favoritos persistem
- chat cria conversa e envia mensagem
- perfil salva dados e uploads
- central de privacidade responde

### Proprietario

- login redireciona para area de anuncios
- criar anuncio com campos minimos
- editar anuncio existente
- alternar entre rascunho/publicado
- adicionar imagens
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
- tentar iniciar chat no proprio anuncio
- tentar criar review duplicada para o mesmo anuncio ou usuario
- tentar salvar alerta de busca sem filtro
- tentar abrir rota protegida sem login
- tentar abrir arquivo de verificacao inexistente

## Validacoes tecnicas no navegador

Ao testar login/sessao:

- `sessionStorage` deve conter `triluga.accessToken` e `triluga.user`
- refresh token nao deve aparecer em `localStorage`
- cookie `triluga_refresh_token` deve existir
- apos logout, sessao e cookie devem ser invalidados

Ao testar privacidade:

- `localStorage` deve refletir `triluga.privacy.analyticsConsent`
- se o consentimento estiver negado, a chamada de analytics nao deve sair

Ao testar documentos:

- o payload de perfil deve sinalizar `hasDocumentImage` e `hasDriverLicenseImage`
- ao clicar para abrir arquivo, o frontend deve chamar endpoint de URL temporaria

## Validacoes no backend e banco

Use Swagger para:

- autenticar
- validar endpoints de `vehicles`, `profiles`, `privacy`, `admin` e `reviews`

Use Prisma Studio para conferir:

- `Profile`
- `PrivacyRequest`
- `Favorite`
- `SearchAlert`
- `Notification`

Use MinIO para conferir:

- imagens publicas de anuncios/avatar
- bucket privado de documentos

## Sugestao de dados para teste

Use estes cenarios:

- anuncio de carro: validar busca, detalhe, favorito e chat
- anuncio de moto: validar filtros por estilo e cilindrada
- anuncio novo: validar publicacao, fotos e presenca na busca
- review: validar bloqueio de autoavaliacao e duplicidade

## Como registrar bugs

Ao abrir bug, capture:

- perfil usado (`USER`, `OWNER`, `ADMIN`)
- rota/tela
- dados usados
- resultado esperado
- resultado obtido
- request/response relevante da API
- evidencias visuais

Classifique com este raciocinio:

- `P0`: bloqueia login, acesso, upload ou admin
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
- tickets sobre cobranca foram avaliados com o escopo atual em mente

## Resumo rapido para um QA novo

Se voce tiver 15 minutos para conhecer o Triluga, faca isto:

1. Rode o ambiente local e o seed.
2. Entre como usuario comum, navegue da home ate um anuncio e abra o chat.
3. Entre como `OWNER`, publique ou edite um anuncio.
4. Entre como `ADMIN`, veja usuarios e privacidade.
5. Revise cookies, storage e links temporarios de documento.

Com isso voce ja entende o coracao do produto e consegue seguir para regressao com contexto.
