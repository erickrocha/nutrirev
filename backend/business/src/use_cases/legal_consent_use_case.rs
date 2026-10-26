use crate::domain::business_error::BusinessError;
use chrono::Utc;
use entity::{legal_acceptance_entity, legal_document_entity};
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};

/// Tipos de documento que o produto exige aceitar. São dois porque cumprem
/// papéis diferentes: o termo de uso rege a relação contratual, a política de
/// privacidade é o que satisfaz o dever de informação da LGPD (art. 9º) e
/// ampara o consentimento específico para dado sensível (art. 11, I).
pub const KIND_TERMS_OF_USE: &str = "terms_of_use";
pub const KIND_PRIVACY_POLICY: &str = "privacy_policy";

const KINDS: &[&str] = &[KIND_TERMS_OF_USE, KIND_PRIVACY_POLICY];

pub struct LegalConsentUseCase;

impl LegalConsentUseCase {
    /// Publica uma nova versão e aposenta a anterior do mesmo tipo e idioma.
    ///
    /// Publicar **não** apaga a versão antiga: os aceites já registrados apontam
    /// para ela, e é isso que permite provar depois com o que cada pessoa
    /// concordou na época.
    pub async fn publish(
        db: &DbConn,
        kind: &str,
        version: &str,
        locale: &str,
        content: &str,
    ) -> Result<legal_document_entity::Model, BusinessError> {
        if !KINDS.contains(&kind) {
            return Err(BusinessError::new(format!(
                "Unknown legal document kind '{}'",
                kind
            )));
        }
        if version.trim().is_empty() || content.trim().is_empty() {
            return Err(BusinessError::new(
                "Version and content are required".to_string(),
            ));
        }

        let txn = db
            .begin()
            .await
            .map_err(|e| BusinessError::new(format!("Failed to start transaction: {}", e)))?;

        legal_document_entity::Entity::update_many()
            .col_expr(legal_document_entity::Column::Active, Expr::value(false))
            .filter(legal_document_entity::Column::Kind.eq(kind))
            .filter(legal_document_entity::Column::Locale.eq(locale))
            .filter(legal_document_entity::Column::Active.eq(true))
            .exec(&txn)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to retire previous version: {}", e)))?;

        let published = legal_document_entity::ActiveModel {
            uuid: Set(uuid::Uuid::new_v4().as_bytes().to_vec()),
            kind: Set(kind.to_string()),
            version: Set(version.trim().to_string()),
            content: Set(content.to_string()),
            locale: Set(locale.to_string()),
            active: Set(true),
            published_at: Set(Utc::now()),
            ..Default::default()
        }
        .insert(&txn)
        .await
        .map_err(|e| BusinessError::new(format!("Failed to publish document: {}", e)))?;

        txn.commit()
            .await
            .map_err(|e| BusinessError::new(format!("Failed to commit publication: {}", e)))?;

        log::info!("[LegalConsentUseCase::publish] Published {} version {}", kind, version);
        Ok(published)
    }

    /// Documentos em vigor. Rota pública: as lojas exigem que a política possa
    /// ser lida antes de instalar o app e sem ter conta.
    pub async fn active_documents(
        db: &DbConn,
        locale: Option<&str>,
    ) -> Result<Vec<legal_document_entity::Model>, BusinessError> {
        let mut query = legal_document_entity::Entity::find()
            .filter(legal_document_entity::Column::Active.eq(true));
        if let Some(locale) = locale {
            query = query.filter(legal_document_entity::Column::Locale.eq(locale));
        }
        query
            .order_by_asc(legal_document_entity::Column::Kind)
            .all(db)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to load documents: {}", e)))
    }

    /// O que este usuário ainda não aceitou. Lista vazia significa que o app
    /// pode seguir; qualquer item significa que precisa pedir o aceite antes de
    /// tratar dado de saúde.
    pub async fn pending_for(
        db: &DbConn,
        user_id: i32,
        locale: Option<&str>,
    ) -> Result<Vec<legal_document_entity::Model>, BusinessError> {
        let active = Self::active_documents(db, locale).await?;
        if active.is_empty() {
            return Ok(Vec::new());
        }

        let accepted: Vec<i32> = legal_acceptance_entity::Entity::find()
            .filter(legal_acceptance_entity::Column::UserId.eq(user_id))
            .filter(
                legal_acceptance_entity::Column::LegalDocumentId
                    .is_in(active.iter().map(|doc| doc.id).collect::<Vec<_>>()),
            )
            .all(db)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to load acceptances: {}", e)))?
            .into_iter()
            .map(|row| row.legal_document_id)
            .collect();

        Ok(active
            .into_iter()
            .filter(|doc| !accepted.contains(&doc.id))
            .collect())
    }

    /// Registra o aceite das versões informadas.
    ///
    /// Só aceita documento em vigor: aceitar uma versão já aposentada não
    /// serviria de prova para o tratamento que acontece hoje. Idempotente —
    /// tocar duas vezes no botão não gera dois registros nem erro.
    pub async fn accept(
        db: &DbConn,
        user_id: i32,
        document_ids: &[i32],
    ) -> Result<usize, BusinessError> {
        if document_ids.is_empty() {
            return Err(BusinessError::new(
                "At least one document must be accepted".to_string(),
            ));
        }

        let valid: Vec<i32> = legal_document_entity::Entity::find()
            .filter(legal_document_entity::Column::Id.is_in(document_ids.to_vec()))
            .filter(legal_document_entity::Column::Active.eq(true))
            .all(db)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to validate documents: {}", e)))?
            .into_iter()
            .map(|doc| doc.id)
            .collect();

        if valid.len() != document_ids.len() {
            return Err(BusinessError::new(
                "One or more documents are unknown or no longer in force".to_string(),
            ));
        }

        // Idempotência sem `ON CONFLICT`: o construtor do SeaORM emite SQL que o
        // MariaDB recusa aqui, e o índice único (user_id, legal_document_id) já é
        // a garantia real. Filtrar antes cobre o caso normal — dois cliques no
        // mesmo botão — e a colisão concorrente cai no índice, que é onde deve cair.
        let already: Vec<i32> = legal_acceptance_entity::Entity::find()
            .filter(legal_acceptance_entity::Column::UserId.eq(user_id))
            .filter(legal_acceptance_entity::Column::LegalDocumentId.is_in(valid.clone()))
            .all(db)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to load acceptances: {}", e)))?
            .into_iter()
            .map(|row| row.legal_document_id)
            .collect();

        let missing: Vec<i32> = valid
            .iter()
            .copied()
            .filter(|id| !already.contains(id))
            .collect();

        if missing.is_empty() {
            return Ok(valid.len());
        }

        let now = Utc::now();
        let rows: Vec<legal_acceptance_entity::ActiveModel> = missing
            .iter()
            .map(|id| legal_acceptance_entity::ActiveModel {
                user_id: Set(user_id),
                legal_document_id: Set(*id),
                accepted_at: Set(now),
                ..Default::default()
            })
            .collect();

        legal_acceptance_entity::Entity::insert_many(rows)
            .exec(db)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to record acceptance: {}", e)))?;

        log::info!("[LegalConsentUseCase::accept] User {} accepted {} document(s)", user_id, valid.len());
        Ok(valid.len())
    }
}
