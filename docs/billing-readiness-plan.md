# Plano de mitigação técnica — pré-requisitos de cobrança

Três frentes independentes que precisam existir antes de cobrar por assinatura
base + usuário ativo. Ordem sugerida: 1 → 2 → 3. O item 1 é isolado e paga na
próxima fatura; o item 2 destrava a cobrança por consumo; o item 3 é o mais
tranquilo, porque o fallback mantém tudo compatível.

Contexto comercial e números de custo: análise de precificação de 01/09/2026.

---

## 1. NAT Gateway → NAT instance

Só Terraform, nenhuma mudança de aplicação. Arquivo: `infra/terraform/modules/vpc/main.tf`.

- Remover `aws_nat_gateway.main`. **Manter `aws_eip.nat`** — o IP de saída não muda,
  então `db_allowed_cidr_blocks`, a security group do RDS e o VPC Connector ficam intactos.
- Adicionar `data "aws_ami" "fck_nat"` (owner `568608671756`, `fck-nat-amzn2-*-arm64-ebs`)
  e `aws_instance.nat` em `aws_subnet.public[0]`, `t4g.nano`, `source_dest_check = false`,
  mais `aws_eip_association` reaproveitando o EIP existente.
- Security group nova para a instância: ingress do `var.vpc_cidr`, egress tudo.
- Em `aws_route_table.private`, trocar `nat_gateway_id` por
  `network_interface_id = aws_instance.nat.primary_network_interface_id`.
- Adicionar `aws_vpc_endpoint` gateway de S3 associado à route table privada. Upload e
  download de foto param de atravessar a NAT — tira a maior parte do tráfego da instância
  e não custa nada.

Custo: US$ 36,50 → US$ 6,70/mês (nano US$ 3,07 + IPv4 US$ 3,65, já pago hoje no EIP).

**O preço disso:** a nano é ponto único de falha para toda a saída da VPC — se ela
reiniciar, as análises de IA falham até voltar. Deixar comentário `ponytail:` no recurso
apontando ASG min=max=1 com o userdata do fck-nat como upgrade, se o uptime justificar.

**Verificação:** uma análise de refeição real em produção depois do apply. Se o job
completa, a rota de saída está de pé.

---

## 2. Quota de IA no banco

O `QuotaManager` atual é um `HashMap` em memória, por instância do App Runner, com limite
global via `MEAL_ANALYSIS_DAILY_QUOTA`. Com `max_size = 10` o usuário tem dez vezes a cota,
e ela zera a cada deploy. Não serve como base de cobrança.

### Migration 49

- Tabela `ai_usage_daily`: `tenant_id`, `user_id`, `usage_date`, `used`, com
  `UNIQUE(user_id, usage_date)` e `updated_at DEFAULT CURRENT_TIMESTAMP ON UPDATE
  CURRENT_TIMESTAMP`. Sem colunas de auditoria: é contador, não entidade de domínio.
- `ALTER TABLE tenant_plan ADD daily_ai_quota INT NOT NULL DEFAULT 4`, com check `> 0`.
  O default é 4 porque quatro refeições diárias com uma análise cada é o piso de uso do
  plano de entrada — abaixo disso o paciente deixa refeição sem registrar.

### `quota_manager.rs`

Some o `Arc<RwLock<HashMap>>`. A assinatura vira
`async fn check_and_increment(&self, db, user_id)`:

1. Resolve o limite: `daily_ai_quota` do `tenant_plan` ativo do tenant do chamador
   (via `entity::audit::tenant_scope()`). Sem plano ou `Unrestricted` → fallback no env atual.
2. Garante a linha do dia com um `insert` da entidade `ai_usage_daily`. Duas requisições
   simultâneas podem tentar ao mesmo tempo; a chave única `(user_id, usage_date)` deixa só
   uma passar e o erro da outra significa que a linha já existe.
3. Incrementa dentro de uma transação, lendo o contador com `lock_exclusive()` — o mesmo
   padrão de `card_payment_gateway` e `tenant_plan_gateway`. O lock de linha é o que faz N
   chamadas concorrentes enxergarem o contador uma de cada vez; sem ele todas leem o mesmo
   valor e a quota deixa de valer.

**Não use `rows_affected` como sinal de rejeição.** A primeira versão fazia
`INSERT ... ON DUPLICATE KEY UPDATE used = IF(used < limite, used + 1, used)` e tratava
`rows_affected == 0` como quota estourada. O contador até parava no limite, mas *todas* as
chamadas eram aceitas: o sqlx conecta com `CLIENT_FOUND_ROWS`, então um UPDATE que não muda
nada ainda reporta linha afetada. O teste de concorrência abaixo é o que expõe isso — 8 de 8
chamadas passavam com limite 5.

### Chamadores

- `backend/business/src/use_cases/meal_analysis_use_case.rs:54` — já tem `db` e já é
  async; só passa e `.await`.
- `backend/business/src/use_cases/body_analysis_use_case.rs:48` — `prepare()` é síncrona e
  não recebe `db`; vira async com `&DatabaseConnection`, e o `body_analysis_controller.rs`
  acompanha.

### Teste

`backend/business/tests/ai_quota_mariadb.rs`, mesmo padrão `#[ignore]` + env var do
`card_payment_mariadb.rs`: N+3 chamadas concorrentes com limite N, exatamente N passam.
É a race que o código original perde. Rodar com um banco isolado e migrado:

```bash
PAYMENT_TEST_DATABASE_URL="mysql://nutrirev:brutal@localhost:3306/quota_test" cargo test -p business --test ai_quota_mariadb -- --ignored
``` O `test_quota_manager_enforces_quota` em
`ai_meal_analysis_tests.rs` não sobrevive como está — vira teste puro da resolução do
limite (plano vs. env).

### Observação

`ai_usage_daily` é o razão de quota, não a base de faturamento. O "usuário ativo" cobrado
continua saindo de `meal_log` — quem registrou refeição, com ou sem IA.

---

## 3. Faixas escalonadas de preço por usuário

Hoje `tenant_plan.price_per_user_in_cents` é valor único; os cenários comerciais B e C
usam faixas.

### Migration 50

Tabela `tenant_plan_tier`: `tenant_plan_id` FK cascade, `up_to_users INT NULL`
(NULL = última faixa, sem teto), `price_per_user_in_cents`,
`UNIQUE(tenant_plan_id, up_to_users)`, check de preço `>= 0`.

### Cálculo

Uma função pura, marginal (faixas como imposto de renda: cada faixa cobra só a fatia
dela), substituindo a multiplicação plana em
`backend/business/src/use_cases/sysadmin_dashboard_use_case.rs`:

```rust
fn users_price_in_cents(tiers: &[TenantPlanTier], flat: i64, available_users: i32, actual_users: i32) -> i128
```

Duas formas de cobrança convivem: **sem faixas** o plano é por assento contratado e cobra
`available_users` inteiros, esteja em uso ou não — comportamento atual, **zero migração de
dados**; **com faixas** o plano é por uso, `available_users` são os inclusos e só o
excedente é cobrado. Por isso o dashboard precisa da contagem real de usuários por tenant,
não de `available_users` nos dois papéis.

As faixas têm de chegar ordenadas com a sem teto por último. `ORDER BY up_to_users ASC` no
MariaDB devolve **NULL primeiro**, então a ordem é imposta em `domain::tenant_plan::sort_tiers`
depois da leitura, nunca no SQL.

### Gateway e API

- `TenantPlanGateway::save` grava as faixas dentro da transação que já existe (apaga e
  reinsere; são três linhas por plano). `find_by_*` carregam junto.
- Validação no use case: ordenadas, sem `up_to_users` duplicado, exatamente um NULL e ele
  por último, primeira faixa acima de `available_users`.
- `tiers` opcional no JSON do `tenant_plan_controller`; ausente = comportamento de hoje.
- Tela de admin: uma linha repetível (até N usuários / preço).

### Teste

O cenário comercial B como asserção:

```
base 24.900 · inclusos 15 · faixas: ≤50 → 900, ≤150 → 700, NULL → 500
40 usuários  →  24.900 + 25 × 900 = 47.400  (R$ 474,00)
```
