# PWA with Docker Swarm and Traefik HTTPS Configuration

This document provides specific instructions for configuring HTTPS with Traefik in a Docker Swarm environment to ensure your Progressive Web App (PWA) works correctly in production.

## Overview

As explained in the general PWA_HTTPS_FIX.md document, PWAs require HTTPS to function properly in production environments. Since you're using Docker Swarm with Traefik, this guide will focus on that specific setup.

## Traefik Configuration for Docker Swarm

### 1. Create a Traefik Configuration File

First, create a `traefik.yml` configuration file:

```yaml
# traefik.yml
global:
  checkNewVersion: true
  sendAnonymousUsage: false

log:
  level: INFO

api:
  dashboard: true
  insecure: false  # Set to true only for testing

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com  # Replace with your email
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

### 2. Create a Docker Stack File for Traefik

Create a `traefik-stack.yml` file:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.9
    command:
      - "--configFile=/etc/traefik/traefik.yml"
      - "--providers.docker=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.exposedByDefault=false"
      - "--providers.docker.network=traefik-public"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard port (optional, secure in production)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - letsencrypt:/letsencrypt
    networks:
      - traefik-public
    deploy:
      placement:
        constraints:
          - node.role == manager
      labels:
        - "traefik.enable=true"
        # Dashboard
        - "traefik.http.routers.traefik.rule=Host(`traefik.yourdomain.com`)"  # Replace with your domain
        - "traefik.http.routers.traefik.service=api@internal"
        - "traefik.http.routers.traefik.entrypoints=websecure"
        - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
        # Basic auth for dashboard
        - "traefik.http.routers.traefik.middlewares=auth"
        - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$xxxxxxxx$$yyyyyyyyyyyyyyyyyyyyyyyy"  # Generate with htpasswd

networks:
  traefik-public:
    external: true

volumes:
  letsencrypt:
```

### 3. Update Your Frontend Application Stack

Modify your frontend application stack file to include Traefik labels:

```yaml
version: '3.8'

services:
  frontend:
    image: your-frontend-image:latest
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.frontend.rule=Host(`your-app-domain.com`)"  # Replace with your domain
        - "traefik.http.routers.frontend.entrypoints=websecure"
        - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
        - "traefik.http.services.frontend.loadbalancer.server.port=3000"  # Replace with your app's port
    networks:
      - traefik-public
      - default

networks:
  traefik-public:
    external: true
  default:
```

## Deployment Steps

### 1. Create the Traefik Network

```bash
docker network create --driver=overlay traefik-public
```

### 2. Deploy Traefik

```bash
docker stack deploy -c traefik-stack.yml traefik
```

### 3. Deploy Your Application

```bash
docker stack deploy -c your-app-stack.yml your-app
```

## SSL Certificate Configuration

Traefik will automatically obtain and renew Let's Encrypt certificates for your domains. Make sure:

1. Your domain's DNS is properly configured to point to your Docker Swarm cluster
2. Ports 80 and 443 are open on your firewall
3. You've replaced the email address in the Traefik configuration with your own

## Verification

After deployment, verify that:

1. Your application is accessible via HTTPS (https://your-app-domain.com)
2. The browser shows a secure connection (lock icon in the address bar)
3. The PWA can be installed from the production environment
4. The service worker is registered correctly (check in DevTools > Application > Service Workers)

## Troubleshooting

If you encounter issues:

1. Check Traefik logs:
   ```bash
   docker service logs traefik_traefik
   ```

2. Verify certificate status:
   ```bash
   docker exec $(docker ps -q -f name=traefik) cat /letsencrypt/acme.json
   ```

3. Ensure your domain is correctly pointing to your server's IP address

4. Check that your application is properly configured to use HTTPS

## Additional Configuration Options

### Custom Headers for PWA

You may want to add security headers for your PWA:

```yaml
- "traefik.http.routers.frontend.middlewares=securityheaders"
- "traefik.http.middlewares.securityheaders.headers.stsSeconds=31536000"
- "traefik.http.middlewares.securityheaders.headers.stsIncludeSubdomains=true"
- "traefik.http.middlewares.securityheaders.headers.stsPreload=true"
- "traefik.http.middlewares.securityheaders.headers.forceSTSHeader=true"
```

### Rate Limiting

To protect your application from abuse:

```yaml
- "traefik.http.routers.frontend.middlewares=ratelimit"
- "traefik.http.middlewares.ratelimit.ratelimit.average=100"
- "traefik.http.middlewares.ratelimit.ratelimit.burst=50"
```

## Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Docker Swarm Documentation](https://docs.docker.com/engine/swarm/)