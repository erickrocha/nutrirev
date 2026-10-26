use crate::domain::business_error::BusinessError;
use crate::domain::enums::Role;
use crate::domain::user::User;

pub struct SecurityContextUseCase {}

impl SecurityContextUseCase {
    pub fn is_system_admin(logged_user: User) -> Result<(), BusinessError> {
        let sys_admin = Role::SysAdmin;

        if !sys_admin.eq(&logged_user.role) {
            return Err(BusinessError::new("Not Authorized".to_string()));
        }
        Ok(())
    }
}
