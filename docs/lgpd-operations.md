# Operação LGPD da Triluga

Versão: `2026-03-27`

## 1. Papéis mínimos

- produto/engenharia: manter controles técnicos, logs e expurgo
- atendimento/operação: receber e acompanhar solicitações do titular
- jurídico/encarregado: validar bases legais, retenção, incidentes e respostas formais
- admin autorizado: revisar documentos e pedidos LGPD dentro do painel administrativo

## 2. Fluxo sugerido para solicitações do titular

1. Receber solicitação pela central de privacidade ou canal oficial.
2. Validar identidade do solicitante.
3. Classificar o pedido: acesso, correção, exclusão, portabilidade, restrição, oposição, revogação.
4. Registrar o pedido e o prazo interno de resposta.
5. Executar a ação técnica ou justificar eventual limitação legal/contratual.
6. Responder ao titular e encerrar o pedido com trilha documental.

## 3. Fluxo sugerido para documentos e CNH

1. Usuário envia arquivo pela área autenticada.
2. Arquivo vai para bucket privado.
3. Admin autorizado acessa somente por link temporário.
4. Documento é aprovado, recusado ou substituído.
5. Arquivo anterior é removido.
6. Aplicar retenção e descarte conforme [data-retention.md](./data-retention.md).

## 4. Fluxo sugerido para incidente

1. Identificar incidente ou suspeita.
2. Conter acesso e preservar evidências.
3. Levantar impacto, categorias de dados e titulares afetados.
4. Acionar engenharia, operação e jurídico/encarregado.
5. Avaliar necessidade de comunicação à ANPD e aos titulares.
6. Executar correção e registrar plano de prevenção.

## 5. Checklist recorrente

- revisar acessos administrativos
- revisar buckets, permissões e segredos
- revisar pedidos LGPD pendentes
- revisar retenção e descarte
- revisar fornecedores com acesso a dados
- revisar tracking e consentimento no frontend
