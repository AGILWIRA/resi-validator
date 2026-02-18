# Build a minimal image that runs the backend in /app/server
FROM node:18-alpine

WORKDIR /app

# Copy only server package files, install deps
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server source
COPY server ./server

ENV PORT 4000
EXPOSE 4000

CMD ["node", "server/index.js"]
