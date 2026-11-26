FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_SENTRY_DSN is public (the SDK sends it to the browser). SENTRY_ORG/SENTRY_PROJECT are build metadata.
# The source-map auth token is mounted as a BuildKit secret, never an ARG/ENV, so it stays out of the image and
# build cache; the runtime image receives only dist/.
ARG VITE_SENTRY_DSN="https://4a7f107c50daa5bfd1f4c2081d121d2a@o4512487805812736.ingest.de.sentry.io/4512487825408080"
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    SENTRY_ORG=$SENTRY_ORG \
    SENTRY_PROJECT=$SENTRY_PROJECT
RUN --mount=type=secret,id=sentry_auth_token,required=false \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
    sh -c 'npm run lint && npm run build'

FROM nginxinc/nginx-unprivileged:1.31.7-alpine3.24 AS runtime
# Apply available Alpine security updates before shipping the runtime image.
USER root
RUN apk upgrade --no-cache
USER 101
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
