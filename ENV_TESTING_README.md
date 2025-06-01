# Environment Variables Testing Tools

This repository includes several tools to test if environment variables, particularly `NEXT_PUBLIC_BACKEND_URL`, are properly configured and accessible to the frontend.

## Available Testing Tools

### 1. Test Page

Visit `/test-env` in your browser to see both client-side and server-side environment variables.

This page displays:
- Client-side environment variables (what the browser can see)
- Server-side environment variables (what the server can see)

### 2. API Route

Make a GET request to `/api/test-env` to see the environment variables available on the server side.

Example:
```bash
curl http://localhost:3000/api/test-env
```

### 3. Node.js Script

Run the following command to check environment variables during build:

```bash
npm run check-env
# or
yarn check-env
```

### 4. Docker Test

Run the following command to test if the `NEXT_PUBLIC_BACKEND_URL` is properly passed to the Docker container:

```bash
npm run test:docker-env
# or
yarn test:docker-env
```

### 5. Docker .env File Test

Run the following command to test if the `.env` file is properly created and used inside the Docker container:

```bash
npm run test:docker-env-file
# or
yarn test:docker-env-file
```

This test verifies that:
1. The `.env` file is created during the Docker build process
2. The `.env` file contains the correct environment variables
3. The `.env` file is properly copied to the production image

## Troubleshooting

If the frontend cannot see the `NEXT_PUBLIC_BACKEND_URL`, try the following:

1. Make sure the `.env` file contains the `NEXT_PUBLIC_BACKEND_URL` variable
2. Check if the `next.config.ts` file properly exposes the environment variable
3. Ensure the variable is consistently prefixed with `NEXT_PUBLIC_` throughout the codebase

For more detailed analysis, see the [NEXT_PUBLIC_BACKEND_URL Analysis](./BACKEND_URL_ANALYSIS.md) file.

## Adding a New Environment Variable

To add a new environment variable that should be accessible to the frontend:

1. Add it to the `.env` file
2. Add it to the `publicRuntimeConfig` and `env` objects in `next.config.ts`
3. If using Docker:
   - Add it as a build argument and environment variable in the `Dockerfile`
   - Add it to the `.env` file creation commands in the Dockerfile:
     ```dockerfile
     # In the builder stage
     RUN echo "NEW_ENV_VAR=$NEW_ENV_VAR" >> .env

     # In the runner stage
     RUN echo "NEW_ENV_VAR=$NEW_ENV_VAR" >> .env
     ```
