//! Gerenciamento de chaves mestras e criptografia AES-256-GCM para credenciais de pagamento por tenant.
//! Inspirado no padrão comprovado do Novgorod.

use aes_gcm::{
    aead::{Aead, Payload},
    Aes256Gcm, KeyInit, Nonce,
};
use business::domain::business_error::BusinessError;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use utoipa::ToSchema;

#[derive(Clone, Default, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct StripeTenantCredentials {
    #[schema(write_only)]
    pub secret_key: String,
    pub publishable_key: String,
    #[schema(write_only)]
    pub webhook_secret: String,
}

impl std::fmt::Debug for StripeTenantCredentials {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("StripeTenantCredentials([REDACTED])")
    }
}

impl StripeTenantCredentials {
    pub fn validate(&self) -> Result<(), BusinessError> {
        let sk = self.secret_key.trim();
        let pk = self.publishable_key.trim();
        let wh = self.webhook_secret.trim();

        if sk.is_empty() {
            return Err(BusinessError::new("Chave secreta da Stripe é obrigatória".to_owned()));
        }
        if pk.is_empty() {
            return Err(BusinessError::new("Chave publicável da Stripe é obrigatória".to_owned()));
        }
        if wh.is_empty() {
            return Err(BusinessError::new("Segredo do webhook da Stripe é obrigatório".to_owned()));
        }

        let sk_is_test = sk.contains("_test_");
        let pk_is_test = pk.contains("_test_");

        if sk_is_test != pk_is_test {
            return Err(BusinessError::new(
                "Chaves da Stripe de modos diferentes (uma é teste e a outra é produção)".to_owned(),
            ));
        }

        Ok(())
    }

    /// Detecta o ambiente ('sandbox' ou 'production') a partir da chave secreta
    pub fn environment(&self) -> &'static str {
        if self.secret_key.contains("_test_") {
            "sandbox"
        } else {
            "production"
        }
    }
}

#[derive(Clone, Default)]
pub struct PaymentKeyRing {
    active: String,
    keys: BTreeMap<String, [u8; 32]>,
}

impl PaymentKeyRing {
    pub fn from_env() -> Result<Self, &'static str> {
        let raw = match std::env::var("PAYMENT_ENCRYPTION_KEYS") {
            Ok(v) => v,
            Err(std::env::VarError::NotPresent) => return Ok(Self::default()),
            Err(_) => return Err("Configuração inválida de PAYMENT_ENCRYPTION_KEYS"),
        };
        let values: BTreeMap<String, String> =
            serde_json::from_str(&raw).map_err(|_| "Formato JSON inválido para PAYMENT_ENCRYPTION_KEYS")?;
        let active = std::env::var("PAYMENT_ACTIVE_KEY_VERSION")
            .map_err(|_| "PAYMENT_ACTIVE_KEY_VERSION é obrigatória quando PAYMENT_ENCRYPTION_KEYS está configurada")?;
        let mut keys = BTreeMap::new();
        for (version, value) in values {
            if version.is_empty() || version.len() > 100 || value.len() != 64 {
                return Err("Chave de criptografia inválida: versão ou tamanho incorretos (esperado 64 hex chars)");
            }
            let mut key = [0_u8; 32];
            let bytes = value.as_bytes();
            for i in 0..32 {
                let chunk = std::str::from_utf8(&bytes[i * 2..i * 2 + 2])
                    .map_err(|_| "Chave não é hexadecimal válida")?;
                key[i] = u8::from_str_radix(chunk, 16)
                    .map_err(|_| "Chave não é hexadecimal válida")?;
            }
            keys.insert(version, key);
        }
        if !keys.contains_key(&active) {
            return Err("A versão ativa (PAYMENT_ACTIVE_KEY_VERSION) não existe em PAYMENT_ENCRYPTION_KEYS");
        }
        Ok(Self { active, keys })
    }

    fn cipher(&self, version: &str) -> Result<Aes256Gcm, BusinessError> {
        let key = self
            .keys
            .get(version)
            .ok_or_else(|| BusinessError::new(format!("Chave de criptografia versão '{version}' não encontrada")))?;
        Aes256Gcm::new_from_slice(key)
            .map_err(|_| BusinessError::new("Falha ao inicializar cifra AES-256-GCM".to_owned()))
    }

    fn aad(tenant_id: i32, version: &str) -> String {
        format!("nutrirev:payment:{tenant_id}:{version}")
    }

    pub fn encrypt(
        &self,
        tenant_id: i32,
        credentials: &StripeTenantCredentials,
    ) -> Result<(String, Vec<u8>), BusinessError> {
        let cipher = self.cipher(&self.active)?;
        use rand::RngCore;
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from(nonce_bytes);
        let plaintext = serde_json::to_vec(credentials)
            .map_err(|_| BusinessError::new("Falha ao serializar credenciais".to_owned()))?;
        let aad = Self::aad(tenant_id, &self.active);
        let encrypted = cipher
            .encrypt(
                &nonce,
                Payload {
                    msg: &plaintext,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| BusinessError::new("Falha ao criptografar credenciais".to_owned()))?;
        let mut bytes = nonce.to_vec();
        bytes.extend(encrypted);
        Ok((self.active.clone(), bytes))
    }

    pub fn decrypt(
        &self,
        tenant_id: i32,
        version: &str,
        bytes: &[u8],
    ) -> Result<StripeTenantCredentials, BusinessError> {
        if bytes.len() < 28 {
            return Err(BusinessError::new("Criptograma de credenciais inválido ou truncado".to_owned()));
        }
        let cipher = self.cipher(version)?;
        let aad = Self::aad(tenant_id, version);
        let nonce: [u8; 12] = bytes[..12]
            .try_into()
            .map_err(|_| BusinessError::new("Nonce inválido no criptograma".to_owned()))?;
        let plaintext = cipher
            .decrypt(
                &Nonce::from(nonce),
                Payload {
                    msg: &bytes[12..],
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| BusinessError::new("Falha ao descriptografar credenciais (dados ou chave incorretos)".to_owned()))?;
        serde_json::from_slice(&plaintext)
            .map_err(|_| BusinessError::new("Falha ao deserializar credenciais descriptografadas".to_owned()))
    }
}
