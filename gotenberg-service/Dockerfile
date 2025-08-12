# Use the official Gotenberg image
FROM gotenberg/gotenberg:8

# Gotenberg runs on port 3000 by default, but Railway expects $PORT
EXPOSE 3000

# Configure Gotenberg to use Railway's PORT environment variable
CMD ["gotenberg", "--api-port-from-env=PORT"]
