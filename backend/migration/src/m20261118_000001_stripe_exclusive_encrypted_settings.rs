use sea_orm_migration::prelude::*;

/// Exclusividade de pagamento via Stripe com credenciais criptografadas por tenant no banco.
///
/// 1. Adiciona colunas para armazenamento de credenciais criptografadas (AES-256-GCM) em `payment_merchant`:
///    - `credentials` (BLOB): JSON encriptado contendo as chaves do tenant.
///    - `key_version` (VARCHAR): versão da chave mestra do chaveiro usada para encriptar.
///    - `publishable_key` (VARCHAR): chave publicável (`pk_...`) para tokenização no cliente.
/// 2. Torna `credentials_secret_ref` opcional (NULL), já que agora as credenciais ficam no banco.
/// 3. Restringe os provedores exclusivamente para `'stripe'`.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        // 1. Adicionar colunas de credenciais criptografadas na tabela payment_merchant
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant \
             ADD COLUMN credentials BLOB NULL, \
             ADD COLUMN key_version VARCHAR(100) NULL, \
             ADD COLUMN publishable_key VARCHAR(255) NULL, \
             MODIFY COLUMN credentials_secret_ref VARCHAR(255) NULL DEFAULT ''",
        )
        .await?;

        // 2. Atualizar constraint de provedores permitidos em payment_merchant para apenas 'stripe'
        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_provider \
             CHECK (provider IN ('stripe'))",
        )
        .await?;

        // 3. Atualizar constraint de capabilities em payment_merchant
        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_capabilities")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_capabilities \
             CHECK (provider = 'stripe')",
        )
        .await?;

        // 4. Atualizar constraint de provedor do token em payment_token para apenas 'stripe'
        conn.execute_unprepared("ALTER TABLE payment_token DROP CONSTRAINT ck_pt_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_token ADD CONSTRAINT ck_pt_provider \
             CHECK (provider IN ('stripe'))",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("ALTER TABLE payment_token DROP CONSTRAINT ck_pt_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_token ADD CONSTRAINT ck_pt_provider \
             CHECK (provider IN ('rede', 'asaas', 'stripe'))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_capabilities")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_capabilities \
             CHECK (provider IN ('asaas', 'stripe') OR (pix_enabled = 0 AND recurring_enabled = 0))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_provider \
             CHECK (provider IN ('rede', 'asaas', 'stripe'))",
        )
        .await?;

        conn.execute_unprepared(
            "ALTER TABLE payment_merchant \
             DROP COLUMN publishable_key, \
             DROP COLUMN key_version, \
             DROP COLUMN credentials",
        )
        .await?;

        Ok(())
    }
}
