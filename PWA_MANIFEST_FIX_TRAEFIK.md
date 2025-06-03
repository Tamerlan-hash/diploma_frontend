# PWA Manifest Fix for Traefik in Docker Swarm

## Issue

The manifest.json file is not accessible at https://smart-parking.yourbandy.com/manifest.json, resulting in a 404 error. This prevents the Progressive Web App (PWA) from functioning correctly in production.

## Root Cause

When using Traefik as a reverse proxy in Docker Swarm, static files like manifest.json may not be properly routed to the application container. This can happen due to:

1. Missing path prefix configuration in Traefik
2. Incorrect routing rules for static files
3. Path normalization issues between the browser request and the container's file system

## Solution

Add specific Traefik configuration to ensure proper routing of static files, including the manifest.json file.

### 1. Update Your Frontend Application Stack

Modify your frontend application stack file to include additional Traefik labels for static file handling:

```yaml
version: '3.8'

services:
  frontend:
    image: your-frontend-image:latest
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.frontend.rule=Host(`smart-parking.yourbandy.com`)"
        - "traefik.http.routers.frontend.entrypoints=websecure"
        - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
        - "traefik.http.services.frontend.loadbalancer.server.port=3000"  # Replace with your app's port
        
        # Add specific rule for manifest.json
        - "traefik.http.routers.frontend-manifest.rule=Host(`smart-parking.yourbandy.com`) && Path(`/manifest.json`)"
        - "traefik.http.routers.frontend-manifest.entrypoints=websecure"
        - "traefik.http.routers.frontend-manifest.tls.certresolver=letsencrypt"
        - "traefik.http.routers.frontend-manifest.service=frontend"
        - "traefik.http.routers.frontend-manifest.priority=200"  # Higher priority than the main router
        
        # Add rule for all static files in public directory
        - "traefik.http.routers.frontend-static.rule=Host(`smart-parking.yourbandy.com`) && PathPrefix(`/icons/`, `/images/`, `/screenshots/`, `/`)"
        - "traefik.http.routers.frontend-static.entrypoints=websecure"
        - "traefik.http.routers.frontend-static.tls.certresolver=letsencrypt"
        - "traefik.http.routers.frontend-static.service=frontend"
        - "traefik.http.routers.frontend-static.priority=100"  # Higher than default, lower than manifest
    networks:
      - traefik-public
      - default

networks:
  traefik-public:
    external: true
  default:
```

### 2. Add a Middleware for Path Stripping (Optional)

If your application expects static files to be served from the root path but Traefik is adding a prefix, add a stripping middleware:

```yaml
# Add these labels to your frontend service
- "traefik.http.middlewares.strip-prefix.stripprefix.prefixes=/"
- "traefik.http.routers.frontend-static.middlewares=strip-prefix"
```

### 3. Verify File Permissions in the Container

Ensure the manifest.json file has the correct permissions in the container:

```bash
# Connect to the container
docker exec -it $(docker ps -q -f name=your-app_frontend) sh

# Check if the file exists and has correct permissions
ls -la /app/public/manifest.json
```

## Deployment

After updating your stack file, redeploy your application:

```bash
docker stack deploy -c your-app-stack.yml your-app
```

## Verification

After deployment, verify that:

1. The manifest.json file is accessible at https://smart-parking.yourbandy.com/manifest.json
2. The browser can successfully load the manifest (check in DevTools > Application > Manifest)
3. The PWA can be installed from the production environment
4. The service worker is registered correctly (check in DevTools > Application > Service Workers)

## Troubleshooting

If you still encounter issues:

1. Check Traefik logs for routing errors:
   ```bash
   docker service logs traefik_traefik
   ```

2. Verify that the request for manifest.json is reaching Traefik:
   ```bash
   # Add debug logging to Traefik
   # In traefik.yml:
   log:
     level: DEBUG
   ```

3. Test with curl to see the exact response:
   ```bash
   curl -v https://smart-parking.yourbandy.com/manifest.json
   ```

4. Check if the file is being served with the correct MIME type:
   ```bash
   # Add this label to ensure proper content type
   - "traefik.http.middlewares.json-header.headers.customresponseheaders.Content-Type=application/json"
   - "traefik.http.routers.frontend-manifest.middlewares=json-header"
   ```

## Additional Resources

- [Traefik Routers Documentation](https://doc.traefik.io/traefik/routing/routers/)
- [Traefik Middlewares Documentation](https://doc.traefik.io/traefik/middlewares/overview/)
- [Next.js Static File Serving](https://nextjs.org/docs/basic-features/static-file-serving)