# Guia do revisor jurídico

As minutas em `politica-de-privacidade-v1.0-minuta.md` e `termo-de-uso-v1.0-minuta.md`
foram redigidas a partir do comportamento real do sistema, não de modelo genérico.
Este guia existe para o revisor conferir duas coisas: se as afirmações técnicas
conferem, e quais decisões dependem de escolha jurídica.

## Parte 1 — Afirmações técnicas verificáveis no código

Cada declaração das minutas tem lastro. Se alguma for alterada na revisão, o
código correspondente precisa mudar junto — ou a declaração vira falsa.

| Declaração | Onde se verifica |
|---|---|
| Senha guardada só como hash bcrypt | `user_use_case.rs`, `customer_use_case.rs` |
| Convite de primeiro acesso é de uso único e expira em 7 dias | `account_invite_use_case.rs` |
| Imagens vão para provedor de IA no exterior | `ai/claude_provider.rs`, `ai/gemini_provider.rs` |
| Exclusão encerra sessões na hora | `authentication_use_case.rs` (`load_enabled_user`) |
| Exclusão apaga credenciais, fotos e uso de IA | `customer_use_case.rs` (`delete_account`) |
| Registro nutricional sobrevive à exclusão | idem, e o teste `account_deletion_mariadb.rs` |
| Solicitação de exclusão fica registrada com prazo | tabela `account_deletion` |
| Fotos de refeição expiram automaticamente | `infra/terraform/modules/s3` — hoje **365 dias** |
| Todo acesso a dado clínico é registrado | `authentication_middleware.rs`, tabela `data_access_log` |
| Criptografia em repouso no banco e no armazenamento | `modules/rds` e `modules/s3` |
| Isolamento entre clínicas | `entity/src/audit.rs` (`tenant_scope`) |
| Dado completo de cartão não é armazenado | `docs/payments/card-first-plan.md` |
| Aceite fica amarrado à versão exata do documento | `legal_consent_use_case.rs`, tabelas `legal_document` e `legal_acceptance` |

**Ainda não implementado, mas declarado ou implícito nas minutas:**

- **Portabilidade e exportação de dados** (art. 18, V). A minuta promete o direito;
  hoje o atendimento seria manual. Aceitável no volume atual, não escala.
- **Fluxo diferenciado para menores.** A minuta atribui à clínica a obtenção do
  consentimento do responsável, mas o sistema não ramifica por idade nem registra
  esse consentimento. Se o revisor mantiver a cláusula, é preciso implementar.
- **Expurgo automático ao fim do prazo de guarda.** Não existe job; a data está
  gravada em `account_deletion.retention_until` aguardando o expurgo.
- **Retenção do próprio log de acesso.** A tabela cresce sem limite hoje.

## Parte 2 — Decisões que dependem de você

### 1. Papéis de controlador e operador
As minutas colocam a clínica como controladora do dado de saúde e a empresa como
operadora, sendo a empresa controladora apenas da conta, dos logs e do produto.
Confirmar o enquadramento e refletí-lo no contrato de operador com cada clínica —
sem esse contrato, o art. 42 aponta para responsabilidade solidária.

### 2. Base legal do dado de saúde
A minuta invoca **duas** bases ao mesmo tempo: tutela da saúde por profissional
(art. 11, II, "f") e consentimento específico (art. 11, I). Precisa escolher qual
é a principal. A diferença é prática: consentimento pode ser revogado a qualquer
tempo e derruba o tratamento; tutela da saúde, não. Manter as duas sem hierarquia
pode ser lido como consentimento simulado.

### 3. Transferência internacional das imagens
É o ponto de maior exposição. As imagens de refeição e corporais saem do país para
Anthropic e Google. A minuta fundamenta no art. 33 e no consentimento. Verificar
se a hipótese adequada é consentimento específico (art. 33, VIII), cláusulas-padrão
contratuais aprovadas pela ANPD (Resolução CD/ANPD nº 19/2024) ou outra. Pode ser
necessário formalizar as cláusulas com cada provedor.

### 4. Os provedores de IA treinam com os dados?
O item 6 do termo afirma que não usamos o conteúdo para treinar modelos, com uma
marcação pedindo confirmação. É preciso ler os termos comerciais vigentes de
Anthropic e Google e confirmar que o mesmo vale para eles. Se algum treinar com o
conteúdo enviado, a afirmação precisa mudar — e provavelmente o provedor também.

### 5. Prazo de guarda do registro nutricional
Adotei **20 anos do último registro**, por analogia à Lei 13.787/2018, que trata
de prontuário de paciente. Confirmar se o registro de acompanhamento nutricional
se enquadra como prontuário e se as normas do CFN fixam prazo diverso. O número
está em uma única constante do código (`CLINICAL_RECORD_RETENTION_YEARS`) e é
trivial de ajustar.

### 6. Prazo de expiração das fotos
Escolhi 365 dias por ser um ciclo de acompanhamento completo. É uma decisão de
negócio com efeito jurídico — quanto menor, menor a exposição. Confirmar se
alguma norma exige guardar a imagem como parte do prontuário; se exigir, a regra
de ciclo de vida do S3 precisa mudar.

### 7. O paciente é consumidor perante a empresa?
O paciente não paga a plataforma; quem paga é a clínica. Isso afeta a aplicação do
Código de Defesa do Consumidor, os limites de responsabilidade do item 11 e a
cláusula de foro do item 13 do termo.

### 8. Relatório de Impacto (RIPD)
Dado sensível, em escala, com decisão automatizada sobre saúde. Avaliar se o art.
38 recomenda elaborar o RIPD antes de crescer a base.

### 9. Consentimento de menores
Consultório de nutrição atende criança e adolescente com frequência. Definir quem
colhe o consentimento do responsável, como se registra e se a plataforma precisa
suportar isso tecnicamente.

### 10. Registrar IP e user-agent no aceite?
Hoje o aceite grava usuário identificado, versão do documento e data. Não grava IP.
É proposital: o usuário já está autenticado e a PII espalhada é um risco por si.
Se a prova precisar ser mais robusta, é uma coluna a mais.

### 11. Revisão de decisão automatizada
O art. 20 dá direito à revisão. A minuta afirma que o profissional da clínica
revisa as estimativas. Confirmar se isso satisfaz o dispositivo ou se é preciso um
canal formal de contestação.

## Parte 3 — Como publicar depois de aprovado

1. Remover o bloco de comentário do topo e preencher todos os `[COLCHETES]`.
2. Publicar cada documento com uma chamada autenticada como SysAdmin:

```
POST /legal/documents
{ "kind": "privacy_policy", "version": "1.0", "locale": "pt-BR", "content": "<texto>" }
```

`kind` aceita `privacy_policy` e `terms_of_use`. Publicar uma versão nova aposenta
a anterior automaticamente e devolve todos os usuários à pendência de aceite — a
versão antiga permanece no banco, porque é ela que prova com o que cada pessoa
concordou na época.
