# Stage 1: Build
FROM node:18-slim AS builder
WORKDIR /usr/src/app

COPY QualGent_Backend/job-server/package*.json ./
RUN npm install

COPY QualGent_Backend/job-server/ ./
COPY QualGent_Backend/job-server/tests ./tests
COPY QualGent_Backend/job-server/appwright.config.ts ./

RUN npm run build-config

# Stage 2: Production
FROM node:18-slim
WORKDIR /usr/src/app

COPY QualGent_Backend/job-server/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/*.js ./
COPY --from=builder /usr/src/app/*.json ./
COPY --from=builder /usr/src/app/tests ./tests
COPY --from=builder /usr/src/app/appwright.config.ts ./

# Copy appwright folder from context root
COPY appwright /home/node/appwright

EXPOSE 3000
CMD ["node", "index.js"]
