#!/usr/bin/env bash
# ==============================================================================
# WAESY — Runbook & Provisionamento Automatizado do Gateway WhatsApp (Oracle VPS)
# Objetivo:
#   1. Substituir o túnel efêmero (trycloudflare.com em processo manual) por
#      Cloudflare Named Tunnel persistente gerenciado via systemd.
#   2. Restringir a porta 8080 da Evolution API apenas a loopback (127.0.0.1),
#      eliminando exposição HTTP pública direta.
#   3. Configurar healthcheck local e reinício automático em caso de queda.
# ==============================================================================
set -euo pipefail

TUNNEL_UUID="${CLOUDFLARE_TUNNEL_UUID:-}"
TUNNEL_HOSTNAME="${CLOUDFLARE_TUNNEL_HOSTNAME:-evolution-gw.waesy.com.br}"
CREDENTIALS_FILE="/etc/cloudflared/${TUNNEL_UUID}.json"

if [[ -z "${TUNNEL_UUID}" ]]; then
  echo "[ERRO] Defina CLOUDFLARE_TUNNEL_UUID antes de executar este script."
  echo "Exemplo: sudo CLOUDFLARE_TUNNEL_UUID=<uuid> CLOUDFLARE_TUNNEL_HOSTNAME=evolution-gw.waesy.com.br bash $0"
  exit 1
fi

if [[ ! -f "${CREDENTIALS_FILE}" ]]; then
  echo "[ERRO] Arquivo de credenciais do túnel não encontrado em ${CREDENTIALS_FILE}."
  exit 1
fi

echo "[1/4] Gravando configuração persistente em /etc/cloudflared/config.yml..."
mkdir -p /etc/cloudflared
cat > /etc/cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_UUID}
credentials-file: ${CREDENTIALS_FILE}
protocol: quic

ingress:
  - hostname: ${TUNNEL_HOSTNAME}
    service: http://127.0.0.1:8080
    originRequest:
      connectTimeout: 10s
      noTLSVerify: true
      keepAliveTimeout: 90s
      keepAliveConnections: 100
  - service: http_status:404
EOF
chmod 600 /etc/cloudflared/config.yml

echo "[2/4] Instalando unidade systemd /etc/systemd/system/cloudflared-waesy.service..."
cat > /etc/systemd/system/cloudflared-waesy.service <<'EOF'
[Unit]
Description=Waesy Persistent Cloudflare Tunnel for Evolution API
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run
Restart=always
RestartSec=5s
TimeoutStartSec=0
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

echo "[3/4] Aplicando regra de firewall para restringir porta 8080 ao loopback..."
if command -v iptables >/dev/null 2>&1; then
  iptables -C INPUT -p tcp -s 127.0.0.1 --dport 8080 -j ACCEPT 2>/dev/null || \
    iptables -I INPUT 1 -p tcp -s 127.0.0.1 --dport 8080 -j ACCEPT
  iptables -C INPUT -p tcp --dport 8080 -j DROP 2>/dev/null || \
    iptables -A INPUT -p tcp --dport 8080 -j DROP
fi

echo "[4/4] Recarregando systemd e ativando serviço cloudflared-waesy..."
systemctl daemon-reload
systemctl enable cloudflared-waesy.service
systemctl restart cloudflared-waesy.service

echo "[OK] Status do serviço cloudflared-waesy:"
systemctl status cloudflared-waesy.service --no-pager -l
echo "[OK] Healthcheck local da Evolution API:"
curl -fsS --max-time 5 http://127.0.0.1:8080/ | head -c 300
echo ""
