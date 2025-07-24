#!/bin/bash

# Configuration
SERVER_USER="pendle"
SERVER_IP="34.70.113.19"
SSH_KEY_PATH="~/.ssh/pendle" 
SERVER_PATH="/home/pendle/app"
DOCKER_COMPOSE_PROFILE="production"

echo "🚀 Starting deployment..."

# Sync files to server
echo "📤 Syncing files to server..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY_PATH" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'logs' \
  --exclude '*.log' \
  --exclude '*.turbo' \
  --exclude '*.next' \
  --exclude '*.DS_Store' \
  --exclude 'dist/' \
  -- exclude 'deploy.sh' \
  ./ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

# SSH into server and restart services
echo "🔄 Restarting services on server..."
ssh -i $SSH_KEY_PATH $SERVER_USER@$SERVER_IP << EOF
cd $SERVER_PATH
echo "Stopping existing containers..."
docker compose --profile $DOCKER_COMPOSE_PROFILE down

echo "Starting containers with build..."
docker compose --profile $DOCKER_COMPOSE_PROFILE up --build -d

echo "Checking container status..."
docker compose ps
EOF

echo "✅ Deployment complete!"
echo "🌐 Your application should be running at: http://$SERVER_IP"
