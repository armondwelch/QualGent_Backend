# Stage 1: Build
FROM node:18-slim AS builder
WORKDIR /usr/src/app
COPY QualGent_Backend/job-server/package*.json ./
COPY QualGent_Backend/job-server/tsconfig.json ./
RUN npm install
COPY QualGent_Backend/job-server/*.js ./
COPY QualGent_Backend/job-server/*.ts ./
COPY QualGent_Backend/job-server/tests ./tests
RUN npm run build-config

# Stage 2: Production
FROM node:18-slim
WORKDIR /usr/src/app

# Install required tools and setup Android SDK in one layer
RUN apt-get update && apt-get install -y \
    zip \
    unzip \
    wget \
    android-tools-adb \
    default-jdk \
    net-tools \
    lsof \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /opt/android-sdk/platform-tools /opt/android-sdk/build-tools \
    && cd /tmp \
    && wget -q https://dl.google.com/android/repository/build-tools_r33-linux.zip \
    && unzip -q build-tools_r33-linux.zip \
    && mv android-13 /opt/android-sdk/build-tools/33.0.0 \
    && rm build-tools_r33-linux.zip \
    && ln -sf /usr/bin/adb /opt/android-sdk/platform-tools/adb

# Environment variables
ENV ANDROID_HOME=/opt/android-sdk \
    JAVA_HOME=/usr/lib/jvm/default-java \
    ANDROID_EMULATOR_HOST=34.56.143.27:5555 \
    PATH=$PATH:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/33.0.0

# Copy app dependencies from builder stage and install, copy appwright and install in one layer
COPY --from=builder /usr/src/app/package*.json ./
COPY appwright /home/node/appwright
RUN npm install --omit=dev \
    && cd /home/node/appwright && npm install --omit=dev

# Copy application files while preserving the fresh node_modules
COPY QualGent_Backend/job-server/*.js ./
COPY QualGent_Backend/job-server/tests ./tests
COPY QualGent_Backend/job-server/appwright.config.ts ./
COPY --from=builder /usr/src/app/dist ./dist
RUN echo '#!/bin/bash\n\
echo "=== Starting application - drivers will be loaded from package.json ==="\n\
exec "$@"' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "index.js"]
