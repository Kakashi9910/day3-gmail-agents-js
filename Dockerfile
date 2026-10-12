FROM node:22-slim

WORKDIR /app

# Install dependencies first so Docker can cache this layer
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# Default demo; override with: docker compose run --rm app npm run <script>
CMD ["npm", "run", "memory"]
