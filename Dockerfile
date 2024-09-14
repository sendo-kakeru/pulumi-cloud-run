FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_HOME=/application/.cache/node/corepack

WORKDIR /application
RUN corepack enable

# 依存関係のインストールステージ
FROM base AS deps
# インストール
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

# ビルドステージ
FROM base AS builder
# ビルド
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build

# 実行ステージ
FROM base AS runner
ENV NODE_ENV=production
# 実行に必要なファイルをコピー
COPY package.json ./
COPY --from=builder /application/public ./public
COPY --from=builder /application/build/ ./build
COPY --from=deps /application/node_modules ./node_modules
# linuxのグループとユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 remix
# application配下のおーあーをremixユーザーに変更
RUN chown -R remix:nodejs /application
USER remix

EXPOSE 3000
ENV PORT=3000

CMD ["pnpm", "run", "start"]
