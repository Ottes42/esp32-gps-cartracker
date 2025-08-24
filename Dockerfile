FROM node:20-alpine

# Arbeitsverzeichnis
WORKDIR /app

# Package.json & lock installieren
COPY package.json ./
RUN npm install --omit=dev

# Rest des Codes
COPY . .

# Daten-Verzeichnis für DB & Uploads
VOLUME ["/data"]

EXPOSE 8080

# Dockerfile
CMD ["node", "index.js"]
