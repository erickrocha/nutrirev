# Local JWT verification key

Place the RS256 public key used to verify local access tokens at:

```text
infra/certs/jwt-public.pem
```

The application now acts as the token issuer for credential login. Supply the
matching private key at the path configured by `JWT_PRIVATE_KEY_PATH`. Never
commit that private key; inject it through the runtime secret store.
