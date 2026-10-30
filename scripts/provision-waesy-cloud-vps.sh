#!/bin/bash
# ==============================================================================
# PROVISIONAMENTO AUTOMATIZADO WAESY CLOUD SOBERANO (ORACLE CLOUD VPS)
# Instancia: waesy-cloud-vps (165.176.204.120)
# Topologia: PostgreSQL 17 + PostgREST + Redis + Waesy Gateway
# ==============================================================================

set -e

echo "=== [1/6] CONFIGURANDO SWAPFILE DE 4GB ==="
if [ ! -f /swapfile ]; then
  sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "Swapfile ativado com sucesso."
else
  echo "Swapfile ja existente."
fi

echo "=== [2/6] DESBLOQUEANDO FIREWALL IPTABLES NATIVO DA ORACLE CLOUD ==="
# Libera portas fundamentais para o ecossistema Waesy Cloud
for port in 22 80 443 3000 5432 6379 8000 8080; do
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null || \
  sudo iptables -A INPUT -p tcp --dport "$port" -j ACCEPT
done

echo "=== [3/6] INSTALANDO DOCKER ENGINE (Oracle Linux / Autonomous Linux, usuario opc) ==="
sudo dnf install -y dnf-utils curl net-tools
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin --allowerasing
sudo systemctl enable --now docker
sudo usermod -aG docker opc || true

# Libera portas no firewalld (se ativo)
if systemctl is-active --quiet firewalld; then
  for port in 22 80 443 3000 5432 6379 8000 8080; do
    sudo firewall-cmd --permanent --add-port="${port}/tcp" || true
  done
  sudo firewall-cmd --reload || true
fi

echo "=== [4/6] CRIANDO DIRETORIOS E STACK DOCKER-COMPOSE WAESY CLOUD ==="
mkdir -p /home/opc/waesy-cloud/data/postgres
mkdir -p /home/opc/waesy-cloud/data/redis

cat << 'COMPOSE_EOF' > /home/opc/waesy-cloud/docker-compose.yml
version: '3.8'

services:
  # ─── 1. POSTGRESQL 17 CORE SOBERANO ──────────────────────────────────────────
  waesy-db:
    image: postgres:17-alpine
    container_name: waesy-cloud-postgres
    restart: always
    environment:
      POSTGRES_DB: waesy_production
      POSTGRES_USER: waesy_admin
      POSTGRES_PASSWORD: SuaSenhaSuperSegura123_Waesy
    ports:
      - "5432:5432"
    volumes:
      - /home/opc/waesy-cloud/data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U waesy_admin -d waesy_production"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - waesy-cloud-net

  # ─── 2. REDIS 7 (CACHE & FILAS) ──────────────────────────────────────────────
  waesy-redis:
    image: redis:7-alpine
    container_name: waesy-cloud-redis
    restart: always
    command: redis-server --appendonly yes --requirepass RedisSenhaSegura123
    ports:
      - "6379:6379"
    volumes:
      - /home/opc/waesy-cloud/data/redis:/data
    networks:
      - waesy-cloud-net

  # ─── 3. POSTGREST REST ENGINE (API REST AUTOMATICA COM RLS) ──────────────────
  waesy-postgrest:
    image: postgrest/postgrest:v12.2.0
    container_name: waesy-cloud-postgrest
    restart: always
    depends_on:
      waesy-db:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      PGRST_DB_URI: postgresql://waesy_admin:SuaSenhaSuperSegura123_Waesy@waesy-db:5432/waesy_production
      PGRST_DB_SCHEMAS: public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: WaesyCloud_JwtSecret_2026_Sovereign_Master_Key_32Chars
      PGRST_SERVER_PORT: 3000
    networks:
      - waesy-cloud-net

networks:
  waesy-cloud-net:
    driver: bridge
COMPOSE_EOF

echo "=== [5/6] INICIANDO CONTÊINERES DOCKER ==="
cd /home/opc/waesy-cloud
sudo docker compose up -d

echo "=== [6/6] VERIFICANDO STATUS DOS SERVICOS ==="
sudo docker compose ps

echo "=== PROVISIONAMENTO CONCLUIDO COM SUCESSO NO WAESY CLOUD ==="
