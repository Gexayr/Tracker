ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm i

FROM ${BASE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${BASE_IMAGE} AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
