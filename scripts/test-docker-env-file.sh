#!/bin/bash

# This script builds and runs a Docker container to test if the .env file is properly created and used

# Set a test NEXT_PUBLIC_BACKEND_URL value
export NEXT_PUBLIC_BACKEND_URL="http://test-backend-url:5000"

echo "Building Docker image with NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL..."
docker build \
  --build-arg NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
  -t frontend-env-test \
  .

echo "Running container to check .env file..."
docker run --rm -it \
  -e NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
  frontend-env-test \
  /bin/sh -c "echo 'Contents of .env file:' && cat .env && echo 'Environment variables:' && printenv | grep -i backend"

echo "Test complete!"