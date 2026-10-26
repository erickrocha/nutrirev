use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "legal_acceptance")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub user_id: i32,
    pub legal_document_id: i32,
    pub accepted_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::legal_document_entity::Entity",
        from = "Column::LegalDocumentId",
        to = "super::legal_document_entity::Column::Id"
    )]
    LegalDocument,
}

impl Related<super::legal_document_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::LegalDocument.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
