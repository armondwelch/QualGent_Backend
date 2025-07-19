FROM node:18-slim
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Install CLI globally so "qgjob" command works
RUN npm install -g .

ENTRYPOINT ["qgjob"]

CMD []
