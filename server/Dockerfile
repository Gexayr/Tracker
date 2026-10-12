ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE} AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${BASE_IMAGE} AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM ${BASE_IMAGE} AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
