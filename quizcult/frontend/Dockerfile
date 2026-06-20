FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application
COPY . .

# Build application
RUN npm run build

# Run application
CMD ["npm", "start"]
