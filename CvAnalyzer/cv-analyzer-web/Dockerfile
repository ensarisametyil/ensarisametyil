# Production image for cv-analyzer-web (CVora AI frontend) — builds the static Vite bundle and
# serves it with nginx.
#
# VITE_API_BASE_URL is a Vite BUILD-TIME variable (baked into the JS bundle, not read at
# container start) — it must point at the backend's real, publicly reachable URL and be passed as
# a build arg:
#
#   docker build -f cv-analyzer-web/Dockerfile \
#     --build-arg VITE_API_BASE_URL=https://api.yourdomain.com \
#     -t cvora-ai-frontend .
#
#   docker run -p 8080:8080 cvora-ai-frontend

FROM node:20-alpine AS build
WORKDIR /src

COPY cv-analyzer-web/package.json cv-analyzer-web/package-lock.json* ./
RUN npm ci

COPY cv-analyzer-web/ .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# nginx-unprivileged: the official image's non-root variant — runs as an unprivileged user and
# listens on 8080 by default, matching the backend Dockerfile's own non-root/8080 convention.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY cv-analyzer-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 8080
