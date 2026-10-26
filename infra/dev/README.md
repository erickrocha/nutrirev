# Ambiente de desenvolvimento

```
docker compose up -d
```

Sobe MariaDB (`localhost:3306`), Mailpit (SMTP `localhost:1025`, caixa de entrada em http://localhost:8025) e LocalStack com S3 + SQS (`localhost:4566`). O bucket
`nutrirev-dev` e a fila `nutrirev-dev-upload` são criados na primeira subida.

Variáveis para o `backend/.env` (os valores AWS são falsos; o LocalStack aceita qualquer um):

```
DATABASE_URL=mysql://nutrirev-dev:nutrirev-dev@localhost:3306/nutrirev-dev
DATABASE_NAME=nutrirev-dev
AWS_ENDPOINT_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=nutrirev-dev
AWS_SQS_QUEUE_URL=http://localhost:4566/000000000000/nutrirev-dev-upload
IMAGE_STORAGE_MODE=s3
SMTP_HOST=localhost
SMTP_PORT=1025
ORDER_NOTIFY_EMAIL=voce@exemplo.com   # opcional: aviso interno de pedido novo
```

Para recomeçar do zero: `docker compose down -v`.
