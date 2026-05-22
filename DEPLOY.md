# Deploying to AWS EC2

## 1. Launch EC2 Instance

- AMI: **Ubuntu 22.04 LTS**
- Instance type: **t2.micro** (free tier) or t2.small
- Security group inbound rules:
  | Port | Source | Purpose |
  |------|--------|---------|
  | 22   | Your IP | SSH |
  | 3001 | 0.0.0.0/0 | Frontend |
  | 3003 | 0.0.0.0/0 | Backend API |

---

## 2. SSH into the instance

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

---

## 3. Install Docker + Docker Compose

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 4. Clone your repo (only for docker-compose.yml + .env)

```bash
git clone https://github.com/<your-username>/Backend-ledger.git
cd Backend-ledger
```

> Images are pulled from Docker Hub — no build step needed on EC2.

---

## 5. Create .env file

```bash
cp .env.example .env
nano .env   # fill in your values
```

Required values:
```
MONGO_URI=mongodb+srv://...      # your Atlas URI
JWT_SECRET=a-long-random-string
REDIS_HOST=redis                 # must be "redis" — matches docker-compose service name
REDIS_PORT=6379
EMAIL_USER=your@gmail.com
CLIENT_ID=...
CLIENT_SECRET=...
REFRESH_TOKEN=...
FRONTEND_URL=http://<EC2_PUBLIC_IP>:3001
PORT=3003
NODE_ENV=production
```

---

## 6. Pull images and run

```bash
docker compose pull        # pulls backend + frontend from Docker Hub
docker compose up -d       # starts all 3 containers (redis, backend, frontend)
```

---

## 7. Verify everything is running

```bash
# Check all containers are up
docker compose ps

# Check backend logs
docker compose logs backend

# Check frontend logs
docker compose logs frontend

# Test backend
curl http://localhost:3003/
# should return: Welcome to the Ledger API

# Test rate limiter
curl http://localhost:3003/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"x@x.com","password":"wrong"}'
```

---

## 8. Access the app

- Frontend: `http://<EC2_PUBLIC_IP>:3001`
- Backend: `http://<EC2_PUBLIC_IP>:3003`

---

## Updating after code changes

```bash
# On your local machine — rebuild and push
docker build -t naman161101/ledger-backend:latest .
docker push naman161101/ledger-backend:latest

docker build -t naman161101/ledger-frontend:latest ./frontend
docker push naman161101/ledger-frontend:latest

# On EC2 — pull new images and restart
docker compose pull
docker compose up -d
```

---

## Common commands

```bash
# Stop everything
docker compose down

# Restart a single service
docker compose restart backend

# View live logs
docker compose logs -f backend

# Pull latest images without downtime (rolling)
docker compose pull && docker compose up -d
```
