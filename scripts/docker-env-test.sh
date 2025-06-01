#!/bin/bash

# This script builds and runs a Docker container to test if NEXT_PUBLIC_BACKEND_URL is properly passed

# Set a test NEXT_PUBLIC_BACKEND_URL value
export NEXT_PUBLIC_BACKEND_URL="http://test-backend-url:5000"

echo "Building Docker image with NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL..."
docker build \
  --build-arg NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
  -t frontend-env-test \
  .

echo "Running container to check environment variables..."
docker run --rm -it \
  -e NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
  frontend-env-test \
  /bin/sh -c "echo 'NEXT_PUBLIC_BACKEND_URL inside container:' && echo \$NEXT_PUBLIC_BACKEND_URL && printenv | grep -i backend"

echo "Test complete!"
