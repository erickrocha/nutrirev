use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "customer")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub date_of_birth: Date,
    pub gender: String,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub locality: Option<String>,
    pub administrative_area: Option<String>,
    pub postal_code: Option<String>,
    pub country_code: Option<String>,
    pub clinical_plan_id: Option<i32>,
    pub prepare_meal_id: Option<i32>,
    pub mobile_enabled: bool,
    pub photo: Option<String>,
    #[sea_orm(column_type = "Blob", nullable)]
    pub photo_base64: Option<Vec<u8>>,
    pub user_id: Option<i32>,
    /// CPF/CNPJ, digits only. Required by the payment provider to create the
    /// payer, so it is collected at checkout rather than at registration.
    pub tax_id: Option<String>,
    /// This customer's id at the payment provider, created on first payment and
    /// reused after. One clinic is one provider account, and a patient at two
    /// clinics is two customer rows, so a single column is the whole mapping.
    pub provider_customer_id: Option<String>,
    pub created_at: DateTimeUtc,
    pub created_by: Option<String>,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

crate::impl_tenant_auditable_before_save!(ActiveModel);
