# Matriz de Retenção de Dados

Versão: `2026-03-27`

## Princípios

- reter apenas o necessário para operação, segurança, defesa e cumprimento regulatório
- revisar periodicamente bases legais e necessidade
- aplicar descarte seguro para dados e arquivos

## Prazos sugeridos

- conta ativa: enquanto a conta estiver em uso
- perfil básico: enquanto a conta estiver ativa
- reservas e pagamentos: conforme prazo contratual, fiscal, contábil e de defesa aplicável
- notificações: até `12 meses`, salvo necessidade operacional maior
- favoritos e alertas: enquanto a conta estiver ativa ou até exclusão pelo usuário
- pedidos LGPD: até `5 anos` para trilha de atendimento e evidência de resposta
- logs técnicos sem payload sensível: `90 a 180 dias`, conforme capacidade e criticidade
- analytics não essencial: somente com consentimento; retenção recomendada de `12 meses`
- documento e CNH rejeitados ou substituídos: exclusão recomendada em até `30 dias`
- documento e CNH de conta encerrada: exclusão recomendada após o prazo regulatório/defensivo definido pelo jurídico

## Eventos que devem disparar revisão de descarte

- encerramento da conta
- documento rejeitado
- envio de novo documento substituindo o anterior
- fim de obrigação regulatória ou contratual
- solicitação válida de eliminação ou anonimização

## Itens que precisam de automação no produto

- job de expurgo para arquivos privados expirados
- exclusão de documento anterior ao receber um novo upload
- marcação e tratamento de pedidos LGPD concluídos
- relatório periódico de dados retidos além do prazo esperado
