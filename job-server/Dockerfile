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
    ffmpeg \
    libsdl2-2.0-0 \
    libsdl2-dev \
    libavcodec-extra \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    libavdevice-dev \
    git \
    build-essential \
    cmake \
    pkg-config \
    meson \
    ninja-build \
    libusb-1.0-0 \
    libusb-1.0-0-dev \
    && mkdir -p /opt/android-sdk/platform-tools /opt/android-sdk/build-tools \
    && cd /tmp \
    && wget -q https://dl.google.com/android/repository/build-tools_r33-linux.zip \
    && unzip -q build-tools_r33-linux.zip \
    && mv android-13 /opt/android-sdk/build-tools/33.0.0 \
    && rm build-tools_r33-linux.zip \
    && ln -sf /usr/bin/adb /opt/android-sdk/platform-tools/adb \
    && wget -q https://github.com/Genymobile/scrcpy/releases/download/v2.4/scrcpy-server-v2.4 \
    && mkdir -p /usr/local/share/scrcpy \
    && mv scrcpy-server-v2.4 /usr/local/share/scrcpy/scrcpy-server \
    && git clone https://github.com/Genymobile/scrcpy \
    && cd scrcpy \
    && meson setup build --prefix=/usr/local --buildtype=release -Db_lto=true \
    && ninja -C build \
    && cp build/app/scrcpy /usr/local/bin/scrcpy \
    && chmod +x /usr/local/bin/scrcpy \
    && cd / && rm -rf /tmp/scrcpy \
    && apt-get remove -y \
    libsdl2-dev \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    libavdevice-dev \
    libusb-1.0-0-dev \
    build-essential \
    cmake \
    meson \
    ninja-build \
    && apt-get autoremove -y \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Environment variables
ENV ANDROID_HOME=/opt/android-sdk \
    JAVA_HOME=/usr/lib/jvm/default-java \
    ANDROID_EMULATOR_HOST=34.56.143.27:5555 \
    PATH=$PATH:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/33.0.0:/usr/local/bin \
    SCRCPY_SERVER_PATH=/usr/local/share/scrcpy/scrcpy-server

# Copy app dependencies from builder stage and install
COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --omit=dev

# Copy application files while preserving the fresh node_modules
COPY QualGent_Backend/job-server/*.js ./
COPY QualGent_Backend/job-server/tests ./tests
COPY QualGent_Backend/job-server/appwright.config.ts ./
COPY --from=builder /usr/src/app/dist ./dist
RUN echo '#!/bin/bash\n\
echo "=== Starting application - drivers will be loaded from package.json ==="\n\
exec "$@"' > /entrypoint.sh && chmod +x /entrypoint.sh \
    && echo '#!/bin/sh\n\
# Fake osascript for Linux - extracts package name from APK\n\
if echo "$@" | grep -q ".apk"; then\n\
    # Extract APK path from the command\n\
    APK_PATH=$(echo "$@" | sed -n "s/.*[\"'\'']\\([^\"'\'']*\\.apk\\)[\"'\''].*/\\1/p")\n\
    if [ -f "$APK_PATH" ]; then\n\
        # Use aapt to get the package name\n\
        PACKAGE=$(/opt/android-sdk/build-tools/33.0.0/aapt dump badging "$APK_PATH" 2>/dev/null | grep "package: name=" | sed "s/.*name='\''\\([^'\'']*\\)'\''.*/\\1/")\n\
        echo "${PACKAGE:-org.wikipedia}"\n\
    else\n\
        echo "org.wikipedia"\n\
    fi\n\
else\n\
    # For non-APK files, return a default\n\
    echo "com.example.app"\n\
fi' > /usr/local/bin/osascript \
    && chmod +x /usr/local/bin/osascript

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "index.js"]
