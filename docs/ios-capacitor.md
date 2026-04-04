# Triluga no iOS com Capacitor

O frontend do Triluga agora esta preparado para ser empacotado como app iOS via Capacitor.

## O que ja ficou pronto

- dependencias `@capacitor/core`, `@capacitor/cli` e `@capacitor/ios` instaladas no `frontend`
- configuracao base do Capacitor em `frontend/capacitor.config.ts`
- projeto nativo iOS gerado em `frontend/ios`
- scripts de build e sync no `package.json`
- permissoes de camera e biblioteca ajustadas no `Info.plist`
- liberacao de carregamento HTTP dentro do WebView para desenvolvimento local

## Scripts disponiveis

Na raiz do repositorio:

```bash
npm run ios:prepare
npm run ios:open
```

Ou direto no frontend:

```bash
cd frontend
npm run ios:prepare
npm run cap:open:ios
```

## Fluxo recomendado para abrir no Xcode

1. No Mac, entre em `frontend`.
2. Gere o build web:

```bash
npm run build:capacitor
```

3. Sincronize o iOS:

```bash
npm run cap:sync:ios
```

4. Abra o projeto:

```bash
npm run cap:open:ios
```

5. No Xcode, selecione um simulador ou iPhone conectado e rode o app.

## Backend no iPhone real

Dentro do app iOS, `localhost` nao aponta para o seu computador. Se o Triluga estiver chamando:

- `http://localhost:3002/api/v1`
- `http://localhost:3002`

o app vai abrir, mas nao vai conseguir conversar com o backend.

Para testar em iPhone real na mesma rede, gere o frontend com a URL da sua maquina na LAN:

```bash
FRONTEND_API_BASE_URL=http://192.168.0.10:3002/api/v1 \
FRONTEND_WS_BASE_URL=http://192.168.0.10:3002 \
npm run ios:prepare
```

Troque `192.168.0.10` pelo IP real da sua maquina.

## Observacoes importantes

- `NSAllowsArbitraryLoadsInWebContent` foi ativado no `Info.plist` para facilitar desenvolvimento com backend HTTP na rede local.
- Para distribuicao em TestFlight/App Store, prefira backend em `HTTPS`.
- O bundle identifier atual esta como `com.triluga.app`. Ajuste para o identificador oficial da sua conta Apple antes de publicar.
- O projeto foi preparado em ambiente Linux, entao a abertura final no Xcode precisa ser feita em um Mac.

## Arquivos principais

- `frontend/capacitor.config.ts`
- `frontend/ios/App/App/Info.plist`
- `frontend/package.json`
