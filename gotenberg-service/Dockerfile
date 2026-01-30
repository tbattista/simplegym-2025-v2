# Use the official Gotenberg image
# Pinned to 8.10.0 to avoid tiling bug #1065 (introduced in 8.11)
FROM gotenberg/gotenberg:8.10.0

# Gotenberg runs on port 3000 by default, but Railway expects $PORT
EXPOSE 3000

# Configure Gotenberg to use Railway's PORT environment variable
CMD ["gotenberg", "--api-port-from-env=PORT"]
