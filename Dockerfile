# ---- 构建阶段：把前端和后端都打包成 dist/ ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- 运行阶段：只装生产依赖，跑打包好的服务 ----
FROM node:22-trixie-slim
WORKDIR /app
RUN sed -i \
      -e 's|deb.debian.org/debian|mirrors.cloud.tencent.com/debian|g' \
      -e 's|security.debian.org/debian-security|mirrors.cloud.tencent.com/debian-security|g' \
      /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
