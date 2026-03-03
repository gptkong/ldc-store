# Docker Compose 部署指南

本文档介绍如何使用 Docker Compose 快速部署 LDC Store。

## 🚀 快速开始

三步完成部署：

```bash
# 1. 复制并编辑环境变量
cp .env.docker.example .env.docker
# 编辑 .env.docker，填写实际值

# 2. 启动服务
docker compose up -d

# 3. 验证部署
curl -fsS http://localhost:3000/api/health
```

成功返回 `{"status":"ok"}` 即表示部署完成。

---

## 📋 前置要求

### 服务器配置

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 1 核 | 2 核+ |
| 内存 | 1 GB | 2 GB+ |
| 磁盘 | 10 GB | 20 GB+ |

### Docker 环境

- Docker Engine 20.10+
- Docker Compose v2.0+（或 docker-compose v1.29+）

检查版本：

```bash
docker --version
docker compose version
```

---

## 🐳 使用 Docker Compose 部署

### 步骤 1：获取项目

```bash
git clone https://github.com/gptkong/ldc-store.git
cd ldc-store
```

### 步骤 2：配置环境变量

```bash
cp .env.docker.example .env.docker
```

编辑 `.env.docker` 文件，填写必填项：

```bash
# ============================================
# PostgreSQL 配置
# ============================================
POSTGRES_DB=ldc_store
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-postgres-password

# 数据库连接 URL（指向 Docker 内部 db 主机）
DATABASE_URL=postgresql://postgres:your-secure-postgres-password@db:5432/ldc_store

# ============================================
# 认证配置（必填）
# ============================================
# NextAuth 加密密钥（生成命令: openssl rand -base64 32）
AUTH_SECRET=your-auth-secret-key-here

# 管理员登录密码
ADMIN_PASSWORD=your-secure-admin-password

# ============================================
# Linux DO Credit 支付配置（必填）
# ============================================
# 在 https://credit.linux.do 创建应用后获取
LDC_CLIENT_ID=your-ldc-client-id
LDC_CLIENT_SECRET=your-ldc-client-secret

# ============================================
# Linux DO OAuth2 登录配置（必填）
# ============================================
# 在 https://connect.linux.do 申请应用后获取
LINUXDO_CLIENT_ID=your-linuxdo-client-id
LINUXDO_CLIENT_SECRET=your-linuxdo-client-secret
```

> ⚠️ **安全提示**：`.env.docker` 包含敏感信息，请勿提交到 Git 仓库。

### 步骤 3：启动服务

```bash
docker compose up -d
```

首次启动会自动构建镜像，耗时约 3-5 分钟。

### 步骤 4：验证部署

```bash
# 检查应用健康状态
curl -fsS http://localhost:3000/api/health

# 检查数据库表结构
docker compose exec -T db psql -U postgres -d ldc_store -c "\dt"
```

验证成功后，访问：

- 前台商店：`http://localhost:3000`
- 后台管理：`http://localhost:3000/admin`

---

## ⚙️ 环境变量配置说明

### 必填变量

| 变量 | 说明 |
|------|------|
| `POSTGRES_DB` | PostgreSQL 数据库名 |
| `POSTGRES_USER` | PostgreSQL 用户名 |
| `POSTGRES_PASSWORD` | PostgreSQL 密码 |
| `DATABASE_URL` | 应用数据库连接字符串（主机名用 `db`） |
| `AUTH_SECRET` | NextAuth 加密密钥 |
| `ADMIN_PASSWORD` | 管理员登录密码 |
| `LDC_CLIENT_ID` | Linux DO Credit Client ID |
| `LDC_CLIENT_SECRET` | Linux DO Credit Client Secret |
| `LINUXDO_CLIENT_ID` | Linux DO OAuth Client ID |
| `LINUXDO_CLIENT_SECRET` | Linux DO OAuth Client Secret |

### 可选变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `APP_PORT` | `3000` | 宿主机暴露端口 |
| `AUTH_TRUST_HOST` | `true` | 信任主机（Docker 部署建议 true） |
| `ADMIN_USERNAMES` | - | Linux DO 管理员用户名白名单（逗号分隔） |
| `NEXT_PUBLIC_SITE_NAME` | `LDC Store` | 网站名称 |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | - | 网站描述 |
| `ORDER_EXPIRE_MINUTES` | `5` | 订单过期时间（分钟） |
| `STATS_TIMEZONE` | `Asia/Shanghai` | 统计口径时区 |
| `LDC_REFUND_MODE` | `client` | 退款模式：`client`/`proxy`/`disabled` |

### 密钥生成

生成 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

---

## 📦 从 ghcr.io 拉取预构建镜像

如果不想本地构建，可以直接使用 GitHub Container Registry 的预构建镜像。

### 方式 A：修改 docker-compose.yml

将 `app` 服务的 `build: .` 替换为 `image`：

```yaml
app:
  # build: .                              # 注释掉本地构建
  image: ghcr.io/gptkong/ldc-store:latest # 使用预构建镜像
  restart: unless-stopped
  # ... 其他配置不变
```

然后启动：

```bash
docker compose up -d
```

### 方式 B：直接拉取镜像

```bash
docker pull ghcr.io/gptkong/ldc-store:latest
```

---

## 🔒 数据库安全说明

默认配置下，PostgreSQL 数据库**不对外暴露端口**，仅通过 Docker 内部网络与应用通信。这是推荐的安全配置。

如需外部访问数据库（调试用），可在 `docker-compose.yml` 中添加端口映射：

```yaml
db:
  image: postgres:16-alpine
  ports:
    - "5432:5432"  # 仅调试时启用
  # ...
```

> ⚠️ 生产环境请勿暴露数据库端口。

---

## 🌐 反向代理配置

生产环境建议在前面加一层反向代理（Nginx、Caddy、Traefik 等），用于：

- HTTPS 证书管理
- 域名绑定
- 请求限流
- 访问日志

配置示例请参考各反向代理的官方文档：

- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Caddy Reverse Proxy](https://caddyserver.com/docs/quick-starts/reverse-proxy)
- [Traefik Docker Provider](https://doc.traefik.io/traefik/providers/docker/)

---

## 🔄 自动迁移说明

容器启动时会**自动执行数据库迁移**：

1. 等待数据库就绪（最多 60 秒）
2. 检测数据库状态（新库/旧库/已迁移）
3. 自动执行 baseline（如需要）和 migrate
4. 迁移成功后启动应用

如果迁移失败，容器会立即退出并输出错误信息。可通过以下命令查看日志：

```bash
docker compose logs app
```

---

## ❓ 常见问题

### Q: 容器启动后无法访问

检查项：

1. 确认端口未被占用：`lsof -i :3000`
2. 查看容器日志：`docker compose logs app`
3. 检查健康状态：`docker compose ps`

### Q: 数据库连接失败

检查项：

1. `.env.docker` 中 `DATABASE_URL` 的主机名是否为 `db`（不是 `localhost`）
2. `POSTGRES_PASSWORD` 与 `DATABASE_URL` 中的密码是否一致
3. 数据库容器是否健康：`docker compose ps db`

### Q: 迁移失败

查看详细错误：

```bash
docker compose logs app | grep -i "migration\|error"
```

常见原因：

- 数据库连接超时：增大等待时间或检查网络
- 表结构冲突：检查是否有手动修改过表结构

### Q: 如何查看数据库内容

```bash
docker compose exec -T db psql -U postgres -d ldc_store -c "\dt"
```

### Q: 如何重置数据库

```bash
# 停止服务
docker compose down

# 删除数据卷（危险！会丢失所有数据）
docker volume rm ldc-store_postgres_data

# 重新启动
docker compose up -d
```

---

## 📈 升级指南

### 升级到新版本

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动（迁移会自动执行）
docker compose up -d --build
```

### 仅更新镜像（使用预构建镜像时）

```bash
docker compose pull
docker compose up -d
```

### 回滚到之前版本

```bash
# 切换到指定版本
git checkout v1.0.0

# 重新构建
docker compose up -d --build
```

---

## 📞 获取帮助

遇到问题可以：

1. 查看 [GitHub Issues](https://github.com/gptkong/ldc-store/issues)
2. 在 [Linux DO 论坛](https://linux.do) 发帖求助
3. 查看容器日志获取详细错误信息

---

## 📄 相关链接

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [PostgreSQL Docker 镜像](https://hub.docker.com/_/postgres)
- [Vercel 部署指南](./DEPLOY.md)
