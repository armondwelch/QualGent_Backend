# Use Node 18 slim base image
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the CLI source code
COPY . .

# Set the CLI entrypoint
ENTRYPOINT ["node", "index.js"]

# Allow passing CLI arguments after image name
CMD []
