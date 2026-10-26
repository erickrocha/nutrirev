# Deploy on GCP always-free (e2-micro) + Hostinger MySQL

1. **VM**: Compute Engine → e2-micro, region us-west1/us-central1/us-east1, 30 GB standard disk, Debian 12, allow HTTP+HTTPS. Reserve the external IP as static (free while attached).
2. **Swap + Docker** (1 GB RAM):
   ```
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER
   ```
3. **DNS**: A records `DOMAIN` and `api.DOMAIN` → VM static IP.
4. **Hostinger**: hPanel → Databases → Remote MySQL → add the VM's static IP. Use the host shown there as `DATABASE_URL` host.
5. **Images**: merge to `main` runs `.github/workflows/gcp-images.yml` and pushes to GHCR. Set repo variable `VITE_API_URL=https://api.DOMAIN` first. Make the packages public, or `docker login ghcr.io` on the VM with a PAT (`read:packages`).
6. **On the VM**: copy this folder, `cp .env.example .env` and fill it, `docker login ghcr.io`, then `docker compose pull && docker compose up -d` (repeat after each merge). Migrations run on backend startup.
