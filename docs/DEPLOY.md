# LDC Store 部署指南

本文档提供详细的部署步骤，帮助你快速将 LDC Store 部署到 Vercel。

## 📋 部署前准备

在开始部署之前，请确保你已经准备好以下内容：

### 1. PostgreSQL 数据库

推荐使用以下云数据库服务（都有免费额度）：

| 服务 | 免费额度 | 特点 |
|------|----------|------|
| [Neon](https://neon.tech) | 0.5 GB 存储，无限项目 | Serverless，冷启动快 |
| [Supabase](https://supabase.com) | 500 MB 存储 | 功能丰富，带管理界面 |
| [Railway](https://railway.app) | $5 免费额度/月 | 简单易用 |

**获取数据库连接字符串**：

以 Neon 为例：
1. 注册 Neon 账号并创建项目
2. 在 Dashboard 找到 Connection string
3. 复制完整连接字符串，格式类似：
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Linux DO Credit 支付凭证

1. 访问 [Linux DO Credit 控制台](https://credit.linux.do)
2. 创建新应用
3. 记录 `pid` (Client ID) 和 `key` (Secret)
4. **重要**：暂时不要配置回调地址，等部署完成后再填写

### 3. Linux DO OAuth2 凭证（必须）

用户需要使用 Linux DO 账号登录才能下单：

1. 访问 [Linux DO Connect](https://connect.linux.do)
2. 点击 **我的应用接入** → **申请新接入**
3. 填写应用信息
4. 记录 `Client ID` 和 `Client Secret`
5. **回调地址**暂时留空，等部署完成后填写

---

## 🚀 方式一：一键部署到 Vercel（推荐）

### 步骤 1：Fork 仓库

点击 GitHub 仓库右上角的 **Fork** 按钮，将项目 Fork 到你的账号下。

### 步骤 2：导入到 Vercel

1. 登录 [Vercel](https://vercel.com)
2. 点击 **Add New...** → **Project**
3. 选择你 Fork 的 `ldc-store` 仓库
4. 点击 **Import**

### 步骤 3：配置环境变量

在 Vercel 部署页面，展开 **Environment Variables** 部分，添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | `postgresql://user:pass@host/db?sslmode=require` |
| `AUTH_SECRET` | 加密密钥（运行 `openssl rand -base64 32` 生成） | `abc123...` |
| `AUTH_TRUST_HOST` | 信任主机 | `true` |
| `ADMIN_PASSWORD` | 管理员密码 | `your-password` |
| `LDC_CLIENT_ID` | Linux DO Credit Client ID | `12345` |
| `LDC_CLIENT_SECRET` | Linux DO Credit Client Secret | `abc123...` |

必填变量（OAuth2 登录）：

| 变量名 | 说明 |
|--------|------|
| `LINUXDO_CLIENT_ID` | Linux DO OAuth Client ID |
| `LINUXDO_CLIENT_SECRET` | Linux DO OAuth Client Secret |

可选变量（网站配置）：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_SITE_NAME` | 网站名称 | `LDC Store` |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | 网站描述 | - |
| `ORDER_EXPIRE_MINUTES` | 订单过期时间(分钟) | `10` |
| `STATS_TIMEZONE` | 统计口径时区（后台“今日销售额”等统计的日界线口径） | `Asia/Shanghai` |

### 步骤 4：部署

点击 **Deploy** 按钮，等待部署完成（约 2-3 分钟）。

### 步骤 5：初始化数据库

> 提示：本仓库默认 `vercel.json` 在 **Production** 构建阶段会自动执行 `pnpm db:push`（Preview 不会执行），如果部署成功且数据库已建表，可跳过本步骤；若自动推表失败，再按以下方式手动执行。

部署完成后，你需要初始化数据库表结构：

**方式 A：使用 Vercel CLI（推荐）**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 拉取环境变量
vercel env pull .env.local

# 推送数据库结构
pnpm db:push
```

**方式 B：本地运行迁移**

```bash
# 设置 DATABASE_URL 环境变量
export DATABASE_URL="你的数据库连接字符串"

# 推送数据库结构
pnpm db:push

# 可选：导入示例数据
pnpm db:seed
```

### 步骤 6：配置支付回调

部署成功后，获取你的域名（如 `your-project.vercel.app`），然后：

1. 回到 [Linux DO Credit 控制台](https://credit.linux.do)
2. 编辑你的应用，配置回调地址：
   - **异步通知 URL**: `https://your-project.vercel.app/api/payment/notify`
   - **同步跳转 URL**: `https://your-project.vercel.app/order/result`

3. 如果启用了 OAuth2 登录，回到 [Linux DO Connect](https://connect.linux.do)
4. 编辑你的应用，配置回调地址：
   - **回调 URL**: `https://your-project.vercel.app/api/auth/callback/linux-do`

### 步骤 7：验证部署

1. 访问 `https://your-project.vercel.app` 查看前台
2. 访问 `https://your-project.vercel.app/admin` 登录后台
3. 使用你设置的 `ADMIN_PASSWORD` 登录

🎉 **恭喜！部署完成！**

---

## 🖥️ 方式二：本地开发部署

### 步骤 1：克隆项目

```bash
git clone https://github.com/gptkong/ldc-store.git
cd ldc-store
```

### 步骤 2：安装依赖

```bash
pnpm install
```

### 步骤 3：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写所有必需的配置项。

### 步骤 4：初始化数据库

```bash
# 推送表结构到数据库
pnpm db:push

# 可选：导入示例数据
pnpm db:seed
```

### 步骤 5：启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 步骤 6：部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录并部署
vercel
```

按提示操作，选择项目名称和配置。

---

## 🔧 高级配置

### 自定义域名

1. 在 Vercel 项目设置中，点击 **Domains**
2. 添加你的域名
3. 按提示配置 DNS 记录
4. 更新支付和 OAuth2 回调地址为新域名

### 环境变量管理

- **开发环境**：使用 `.env` 文件
- **生产环境**：在 Vercel Dashboard → Settings → Environment Variables 中配置

### 数据库管理

```bash
# 查看数据库表结构
pnpm db:studio

# 生成迁移文件
pnpm db:generate

# 运行迁移
pnpm db:migrate

# 重置数据库（危险！）
pnpm db:reset
```

---

## ❓ 常见问题

### Q: 部署后访问报 500 错误

A: 检查以下项目：
1. 确认 `DATABASE_URL` 格式正确且数据库可访问
2. 确认 `AUTH_SECRET` 已设置
3. 查看 Vercel 的 Function Logs 获取详细错误信息

### Q: 支付回调失败

A: 检查以下项目：
1. 回调 URL 是否正确（注意 https）
2. `LDC_CLIENT_ID` 和 `LDC_CLIENT_SECRET` 是否正确
3. 确保网站可公网访问

### Q: OAuth2 登录失败

A: 检查以下项目：
1. 回调 URL 是否正确：`https://your-domain/api/auth/callback/linux-do`
2. `LINUXDO_CLIENT_ID` 和 `LINUXDO_CLIENT_SECRET` 是否正确

### Q: 数据库连接超时

A: 
1. 检查数据库服务是否运行
2. Neon 免费版数据库会在空闲时休眠，首次连接可能较慢
3. 确保连接字符串包含 `?sslmode=require`

### Q: 如何更新到新版本

```bash
# 拉取最新代码
git pull origin main

# 重新部署
vercel --prod
```

---

## 📞 获取帮助

如遇到问题，可以：

1. 查看 [GitHub Issues](https://github.com/gptkong/ldc-store/issues)
2. 在 [Linux DO 论坛](https://linux.do) 发帖求助
3. 查看 Vercel 的 [Function Logs](https://vercel.com/docs/functions/logs) 获取错误详情

---

## 📄 相关链接

- [Neon 数据库](https://neon.tech)
- [Supabase 数据库](https://supabase.com)
- [Vercel 文档](https://vercel.com/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [Drizzle ORM 文档](https://orm.drizzle.team/docs)
- [Linux DO Credit](https://credit.linux.do)
- [Linux DO Connect](https://connect.linux.do)
