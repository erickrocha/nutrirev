use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "legal_document")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    /// `privacy_policy` ou `terms_of_use`.
    pub kind: String,
    pub version: String,
    pub content: String,
    pub locale: String,
    pub active: bool,
    pub published_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::legal_acceptance_entity::Entity")]
    LegalAcceptance,
}

impl Related<super::legal_acceptance_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::LegalAcceptance.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
