# 使用官方的 Bun 镜像
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# 安装依赖项到临时目录
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# 安装生产依赖项（不包括 devDependencies）
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# 从临时目录复制 node_modules
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# 运行构建（需要 devDependencies）
ENV NODE_ENV=production
RUN bun run codegen
RUN bun run build

# 复制生产依赖项和构建后的代码到最终镜像
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/build ./build
COPY --from=prerelease /usr/src/app/package.json .
COPY subgraph.yaml ./subgraph.yaml

# 设置默认命令为依次运行 create 和 deploy
USER bun
ENTRYPOINT ["sh", "-c", "bun x graph create graphprotocol/pns --node http://$GRAPH_NODE_HOST:$GRAPH_NODE_PORT && bun x graph deploy graphprotocol/pns --ipfs http://$IPFS_HOST:$IPFS_PORT --node http://$GRAPH_NODE_HOST:$GRAPH_NODE_PORT --version-label $VERSION_LABEL"]
