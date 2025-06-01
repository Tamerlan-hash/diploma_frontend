# NEXT_PUBLIC_BACKEND_URL Analysis

This document provides an analysis of how the `NEXT_PUBLIC_BACKEND_URL` environment variable is configured and used in the frontend application.

## Configuration

The `NEXT_PUBLIC_BACKEND_URL` is configured in several places:

1. **`.env` file**: The variable is set to `http://localhost:1234`
2. **`next.config.ts`**: The variable is properly exposed to the frontend through:
   - `publicRuntimeConfig.NEXT_PUBLIC_BACKEND_URL`
   - `env.NEXT_PUBLIC_BACKEND_URL`
3. **`Dockerfile`**: The variable is properly passed as a build argument and set as an environment variable

## Usage in Code

The `NEXT_PUBLIC_BACKEND_URL` is used in the following places:

1. **`AuthContext.tsx`**: The variable is accessed with a fallback value:
   ```javascript
   // In Docker environments, we should use the container name or service name instead of localhost
   // This allows proper communication between containers in a Docker network
   const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000';
   ```

2. Other components use the `authFetch` function from `AuthContext.tsx`, which indirectly uses the `NEXT_PUBLIC_BACKEND_URL`.

## Testing Tools

We've created several tools to test the `NEXT_PUBLIC_BACKEND_URL`:

1. **Client-side component** (`BackendUrlTest.tsx`): Displays the `NEXT_PUBLIC_BACKEND_URL` and other environment variables on the client side
2. **Test page** (`/test-env`): Displays both client-side and server-side environment variables
3. **API route** (`/api/test-env`): Returns the `NEXT_PUBLIC_BACKEND_URL` and other environment variables from the server side
4. **Node.js script** (`scripts/check-env.js`): Logs the `NEXT_PUBLIC_BACKEND_URL` and other environment variables during build
5. **Docker test scripts** (`scripts/docker-env-test.sh` and `scripts/docker-env-test.bat`): Test if the `NEXT_PUBLIC_BACKEND_URL` is properly passed to the Docker container

## Conclusion

Based on our analysis, the `NEXT_PUBLIC_BACKEND_URL` is properly configured and should be accessible to the frontend. The frontend can see the `NEXT_PUBLIC_BACKEND_URL` in the following ways:

1. **Server-side**: The `NEXT_PUBLIC_BACKEND_URL` is accessible through `process.env.NEXT_PUBLIC_BACKEND_URL`
2. **Client-side**: The `NEXT_PUBLIC_BACKEND_URL` is accessible through `process.env.NEXT_PUBLIC_BACKEND_URL` because it's prefixed with `NEXT_PUBLIC_`, which ensures it's automatically included in the client-side bundle

If there are issues with the frontend not seeing the `NEXT_PUBLIC_BACKEND_URL`, it could be due to one of the following:

1. The `.env` file is not being loaded properly
2. The `next.config.ts` file is not being used properly
3. The Docker build process is not passing the environment variable correctly

We've updated the fallback value in `AuthContext.tsx` from 'http://localhost:8000' to 'http://backend:8000' to ensure proper communication between containers when running in a Docker environment. This change addresses the issue where the frontend was defaulting to 'localhost:8000' when the environment variable wasn't properly passed or loaded in Docker.

## Recommendations

To ensure the frontend can see the `NEXT_PUBLIC_BACKEND_URL`:

1. **Verify the environment variable**: Use the `/test-env` page to check if the `NEXT_PUBLIC_BACKEND_URL` is accessible on both client and server sides
2. **Check Docker build**: Run the Docker test script to verify that the `NEXT_PUBLIC_BACKEND_URL` is properly passed to the container
3. **Ensure the prefix is used consistently**: Make sure all references to the backend URL use the `NEXT_PUBLIC_` prefix to ensure client-side accessibility
4. **Docker environments**: When running in Docker, ensure that the fallback URL uses the service name (e.g., 'http://backend:8000') instead of 'localhost' to enable proper communication between containers

## Next Steps

1. Run the tests to verify that the `NEXT_PUBLIC_BACKEND_URL` is accessible
2. If issues persist, check for any remaining references to the old `BACKEND_URL` variable
