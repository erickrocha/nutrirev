use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use std::env;

const DEFAULT_FROM: &str = "NutriRev <noreply@erochasolucoes.com.br>";

/// Texto do pedido que os e-mails precisam. Preço já formatado pelo chamador.
pub struct OrderMail {
    pub uuid: String,
    pub name: String,
    pub email: String,
    pub plan_name: String,
    pub price: String,
    pub english: bool,
}

fn transport() -> Option<AsyncSmtpTransport<Tokio1Executor>> {
    let host = env::var("SMTP_HOST").ok().filter(|h| !h.is_empty())?;
    let port = env::var("SMTP_PORT").ok().and_then(|p| p.parse::<u16>().ok()).unwrap_or(587);
    let builder = match (env::var("SMTP_USERNAME").ok(), env::var("SMTP_PASSWORD").ok()) {
        (Some(user), Some(password)) if !user.is_empty() => {
            // 465 é TLS direto; as demais portas autenticadas usam STARTTLS.
            let relay = if port == 465 {
                AsyncSmtpTransport::<Tokio1Executor>::relay(&host)
            } else {
                AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&host)
            };
            relay.ok()?.credentials(Credentials::new(user, password))
        }
        // Sem credenciais: servidor local de desenvolvimento (Mailpit), sem TLS.
        _ => AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&host),
    };
    Some(builder.port(port).build())
}

async fn send(to: &str, subject: String, body: String) {
    let Some(transport) = transport() else {
        log::warn!("[mailer] SMTP_HOST is not set; skipping email to {}", to);
        return;
    };
    let from = env::var("SMTP_FROM").unwrap_or_else(|_| DEFAULT_FROM.to_string());
    let message = from
        .parse::<Mailbox>()
        .and_then(|from| to.parse::<Mailbox>().map(|to| (from, to)))
        .map_err(|e| e.to_string())
        .and_then(|(from, to)| {
            Message::builder().from(from).to(to).subject(subject).body(body).map_err(|e| e.to_string())
        });
    match message {
        Ok(message) => {
            if let Err(error) = transport.send(message).await {
                log::error!("[mailer] failed to send email to {}: {}", to, error);
            }
        }
        Err(error) => log::error!("[mailer] could not build email to {}: {}", to, error),
    }
}

/// Confirmação ao cliente e aviso interno (se `ORDER_NOTIFY_EMAIL` estiver definido).
/// Roda em segundo plano: falha de e-mail nunca derruba o pedido já salvo.
pub fn notify_order_created(order: OrderMail) {
    tokio::spawn(async move {
        let (subject, body) = if order.english {
            (
                "We received your order — NutriRev".to_string(),
                format!(
                    "Hello {},\n\nWe received your order for the {} plan ({}).\nOur team will contact you shortly to finalize the agreement.\n\nOrder: {}\n\nNutriRev — a brand of Erocha Soluções em TI",
                    order.name, order.plan_name, order.price, order.uuid
                ),
            )
        } else {
            (
                "Recebemos seu pedido — NutriRev".to_string(),
                format!(
                    "Olá, {}!\n\nRecebemos seu pedido do plano {} ({}).\nEm breve nossa equipe entrará em contato para formalizar a contratação.\n\nPedido: {}\n\nNutriRev — uma marca da Erocha Soluções em TI",
                    order.name, order.plan_name, order.price, order.uuid
                ),
            )
        };
        send(&order.email, subject, body).await;

        if let Some(internal) = env::var("ORDER_NOTIFY_EMAIL").ok().filter(|v| !v.is_empty()) {
            send(
                &internal,
                format!("Novo pedido: {} — {}", order.plan_name, order.name),
                format!(
                    "Novo pedido de contratação.\n\nCliente: {} <{}>\nPlano: {} ({})\nPedido: {}",
                    order.name, order.email, order.plan_name, order.price, order.uuid
                ),
            )
            .await;
        }
    });
}
