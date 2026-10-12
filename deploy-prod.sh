#!/usr/bin/env bash
# Switch Tracker from the dev stack to the production stack.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p /root/backups
docker-compose exec -T db pg_dump -U postgres tracker | gzip > "/root/backups/tracker-$(date +%F-%H%M).sql.gz"

docker-compose down
docker-compose -f docker-compose.prod.yml up -d --build

sed -i 's#http://localhost:8181#http://127.0.0.1:8181#' /etc/nginx/sites-available/tracking.conf
sed -i 's#http://localhost:3003#http://127.0.0.1:3003#' /etc/nginx/sites-available/back-tracking.conf
nginx -t
systemctl reload nginx

docker-compose -f docker-compose.prod.yml ps
