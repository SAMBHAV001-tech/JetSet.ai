# Stage 1: Build the NestJS application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run the built application in a lean production container
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/rag/documents ./src/rag/documents

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=7860
EXPOSE 7860

CMD ["node", "dist/main.js"]
