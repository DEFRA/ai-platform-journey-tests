ARG FRONTEND_IMAGE=latest
FROM defradigital/ai-platform-frontend:${FRONTEND_IMAGE}

USER root
RUN npm ci --include=dev
USER node
