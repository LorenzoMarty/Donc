#!/usr/bin/env bash
# Preparo unico de um VPS Ubuntu/Debian novo (como root): firewall 22/80/443, swap de 2 GB e Docker.
set -euo pipefail

apt-get update -y
apt-get install -y ufw curl git ca-certificates

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
echo "pronto. Proximo: clonar o repo em /opt/donc, criar .env.production e rodar ./deploy/deploy.sh"
