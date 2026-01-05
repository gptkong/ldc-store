# LDC Store - 自动发卡系统

基于 Next.js 16 的虚拟商品自动发卡平台，支持 Linux DO Credit 积分支付。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgptkong%2Fldc-store&env=DATABASE_URL,AUTH_SECRET,ADMIN_PASSWORD,LDC_CLIENT_ID,LDC_CLIENT_SECRET,LINUXDO_CLIENT_ID,LINUXDO_CLIENT_SECRET,STATS_TIMEZONE&envDescription=DATABASE_URL%3A%20PostgreSQL%20%7C%20AUTH_SECRET%3A%20openssl%20rand%20-base64%2032%20%7C%20ADMIN_PASSWORD%3A%20管理员密码%20%7C%20LDC_CLIENT_ID%2FLDC_CLIENT_SECRET%3A%20支付凭证%20%7C%20LINUXDO_CLIENT_ID%2FLINUXDO_CLIENT_SECRET%3A%20OAuth登录凭证%20%7C%20STATS_TIMEZONE%3A%20统计口径时区（默认%20Asia%2FShanghai）&envLink=https%3A%2F%2Fgithub.com%2Fgptkong%2Fldc-store%2Fblob%2Fmain%2Fdocs%2FDEPLOY.md&project-name=ldc-store&repository-name=ldc-store)

> 📚 **详细部署指南**: [docs/DEPLOY.md](./docs/DEPLOY.md)

## ✨ 特性

### 🛒 前台商店
- 商品列表展示、分类导航
- 商品详情页（支持 Markdown）、热门标签、折扣价格显示
- 库存实时展示、销量统计

### 🔐 登录与权限
- **用户下单** - 使用 Linux DO Connect OAuth2 登录，下单/查单与账号绑定
- **后台管理** - 管理员密码登录（`ADMIN_PASSWORD`），或配置 `ADMIN_USERNAMES` 允许指定 Linux DO 用户名以管理员身份登录后台

### 💳 自动发卡
- 支持 Linux DO Credit 积分支付
- 支付成功后自动发放卡密
- 订单超时自动释放锁定库存

### 🔄 退款功能
- 用户可申请退款，管理员审核
- **客户端模式**：通过浏览器表单提交绕过 CORS/CF 限制（无需代理）
- **代理模式**：通过服务端代理调用 LDC Credit 退款接口
- 退款成功后自动回收卡密

### 📦 库存管理
- 批量导入卡密（支持换行/逗号分隔）
- 自动去重检测（输入去重 + 数据库去重）
- 库存预警提醒

### 📊 后台管理
- **仪表盘** - 今日销售额、订单统计、库存预警、最近订单
- **商品管理** - 创建/编辑商品、设置价格、热门标记
- **分类管理** - 分类增删改、图标设置、排序
- **订单管理** - 订单列表、状态筛选、卡密查看
- **卡密管理** - 按商品查看库存、批量导入

### 🎨 现代 UI
- 基于 Shadcn/UI + Tailwind CSS v4
- 支持深色/浅色模式切换
- 响应式设计，移动端友好

## 🛠️ 技术栈

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Language:** TypeScript
- **Database:** PostgreSQL (推荐 Neon/Supabase)
- **ORM:** Drizzle ORM
- **UI:** Shadcn/UI + Tailwind CSS
- **Auth:** NextAuth.js v5
- **Payment:** Linux DO Credit

## 🚀 一键部署到 Vercel

1. 点击上方 "Deploy with Vercel" 按钮
2. 在 Vercel 中配置环境变量
3. 等待部署完成
4. 初始化数据库表结构（默认 Production 部署会自动执行 `pnpm db:push`，失败时再手动执行）

## 📦 本地开发

### 1. 克隆项目

```bash
git clone https://github.com/gptkong/ldc-store.git
cd ldc-store
pnpm install
```

### 2. 配置环境变量

复制环境变量样例文件并修改：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写实际配置值：

```env
# 数据库 (推荐 Neon: https://neon.tech)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# NextAuth 密钥 (生成: openssl rand -base64 32)
AUTH_SECRET="your-auth-secret"
AUTH_TRUST_HOST=true

# 管理员密码
ADMIN_PASSWORD="your-admin-password"

# 管理员用户名白名单（可选，逗号分隔；命中则授予 admin 权限）
ADMIN_USERNAMES="admin1,admin2"

# Linux DO Credit 支付
LDC_CLIENT_ID="your_client_id"
LDC_CLIENT_SECRET="your_client_secret"
LDC_GATEWAY="https://credit.linux.do/epay"

# Linux DO OAuth2 登录（用户下单/查单必须）
LINUXDO_CLIENT_ID="your_linuxdo_client_id"
LINUXDO_CLIENT_SECRET="your_linuxdo_client_secret"

# 网站名称（可选，显示在 Header 标题和页面标题中）
NEXT_PUBLIC_SITE_NAME="LDC Store"

# 网站描述（可选）
NEXT_PUBLIC_SITE_DESCRIPTION="基于 Linux DO Credit 的虚拟商品自动发卡平台"

# 订单过期时间（分钟）
ORDER_EXPIRE_MINUTES=10

# 统计口径时区（可选，默认 Asia/Shanghai / UTC+8）
# 用于后台仪表盘“今日销售额”等统计的日界线口径
STATS_TIMEZONE="Asia/Shanghai"
```

### 3. 初始化数据库

```bash
# 推送表结构到数据库
pnpm db:push

# 初始化示例数据（可选）
pnpm db:seed
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问:
- 前台商店: http://localhost:3000
- 后台管理: http://localhost:3000/admin

### 管理员登录

访问 `/admin`：
- 管理员密码登录：输入 `ADMIN_PASSWORD`
- Linux DO 登录（可选）：配置 `ADMIN_USERNAMES` 后，白名单用户可直接登录后台

## 🔧 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | ✅ | - | PostgreSQL 连接字符串 |
| `AUTH_SECRET` | ✅ | - | NextAuth 加密密钥（运行 `openssl rand -base64 32` 生成）|
| `AUTH_TRUST_HOST` | ✅ | `true` | 信任主机（Vercel 部署必须为 true）|
| `ADMIN_PASSWORD` | ✅ | - | 管理员登录密码 |
| `LDC_CLIENT_ID` | ✅ | - | Linux DO Credit Client ID |
| `LDC_CLIENT_SECRET` | ✅ | - | Linux DO Credit Client Secret |
| `LDC_GATEWAY` | ❌ | `https://credit.linux.do/epay` | 支付网关地址 |
| `LDC_REFUND_MODE` | ❌ | `client` | 退款模式：`client`（客户端）/ `proxy`（代理）/ `disabled`（禁用）|
| `LDC_PROXY_URL` | ❌ | - | LDC API 代理地址（代理模式时使用，绕过 Cloudflare）|
| `ADMIN_USERNAMES` | ❌ | - | Linux DO 管理员用户名白名单（逗号分隔），命中则授予 `admin` 角色 |
| `LINUXDO_CLIENT_ID` | ✅ | - | Linux DO OAuth2 Client ID（用户下单/查单必须）|
| `LINUXDO_CLIENT_SECRET` | ✅ | - | Linux DO OAuth2 Client Secret（用户下单/查单必须）|
| `LINUXDO_AUTHORIZATION_URL` | ❌ | - | 自定义 OAuth2 授权端点 |
| `LINUXDO_TOKEN_URL` | ❌ | - | 自定义 OAuth2 Token 端点 |
| `LINUXDO_USERINFO_URL` | ❌ | - | 自定义 OAuth2 用户信息端点 |
| `NEXT_PUBLIC_SITE_NAME` | ❌ | - | 网站名称（显示在 Header 和页面标题）|
| `NEXT_PUBLIC_SITE_DESCRIPTION` | ❌ | - | 网站描述（用于 SEO）|
| `ORDER_EXPIRE_MINUTES` | ❌ | `10` | 订单过期时间（分钟）|
| `STATS_TIMEZONE` | ❌ | `Asia/Shanghai` | 统计口径时区（用于“今日销售额”等报表口径，建议使用 IANA 时区名）|

### 🕒 时间与统计口径

- 数据库存储使用 `timestamp with time zone`（timestamptz），内部以 UTC 存储时间戳
- 前端展示时间按用户浏览器本地时区显示（例如订单列表时间）
- 后台“今日”类统计的日界线由 `STATS_TIMEZONE` 决定，默认中国时区（`Asia/Shanghai`）

## 📝 Linux DO Credit 配置

1. 访问 [Linux DO Credit 控制台](https://credit.linux.do)
2. 创建新应用，获取 `pid` 和 `key`
3. 配置回调地址:
   - **Notify URL:** `https://your-domain.com/api/payment/notify`
   - **Return URL:** `https://your-domain.com/order/result`

## 🔄 退款功能配置

由于 Linux DO Credit 的 API 接口受 Cloudflare 保护，从 Vercel 等服务器端直接调用会被拦截。本项目支持两种退款模式：

### 退款模式

| 模式 | 环境变量 | 说明 |
|------|---------|------|
| **客户端模式** | `LDC_REFUND_MODE=client`（默认） | 通过浏览器表单提交绕过 CORS/CF 限制，无需代理 |
| **代理模式** | `LDC_REFUND_MODE=proxy` + `LDC_PROXY_URL` | 通过服务端代理调用 LDC API |
| **禁用** | `LDC_REFUND_MODE=disabled` | 禁用退款功能 |

### 客户端模式（推荐）

默认启用，无需额外配置。工作原理：

1. 管理员点击"通过退款"后打开新窗口
2. 新窗口通过 HTML 表单 POST 提交到 LDC API（表单提交不受 CORS 限制）
3. 窗口内显示 LDC API 的响应结果
4. 管理员确认退款成功后，系统更新订单状态

> 💡 **提示**：如遇 Cloudflare 验证，管理员需先在浏览器中访问 `credit.linux.do` 完成验证，然后重试退款操作。

### 代理模式（可选）

如果客户端模式无法满足需求，可以配置代理服务：

1. 部署 [gin-flaresolverr-proxy](https://github.com/gptkong/gin-flaresolverr-proxy) 服务
2. 在环境变量中配置：

```env
LDC_REFUND_MODE=proxy
LDC_PROXY_URL="https://your-proxy-domain.com/api"
```

> ⚠️ **注意**：代理功能可能会随着 Linux DO Credit 官方接口变更而失效，请关注上游仓库更新。

## 🔑 Linux DO OAuth2 登录配置

用户下单/查单需要使用 Linux DO 账号登录（OAuth2）。

### 申请接入

1. 访问 [Linux DO Connect](https://connect.linux.do) 控制台
2. 点击 **我的应用接入** - **申请新接入**
3. 填写应用信息，**回调地址** 填写：`https://your-domain.com/api/auth/callback/linux-do`
4. 申请成功后获取 `Client ID` 和 `Client Secret`

### 环境变量配置

在 `.env` 中配置:

```env
LINUXDO_CLIENT_ID="your_client_id"
LINUXDO_CLIENT_SECRET="your_client_secret"
```

### 可获取的用户信息

| 字段 | 说明 |
|------|------|
| `id` | 用户唯一标识（不可变） |
| `username` | 论坛用户名 |
| `name` | 论坛用户昵称（可变） |
| `avatar_template` | 用户头像模板URL（支持多种尺寸） |
| `active` | 账号活跃状态 |
| `trust_level` | 信任等级（0-4） |
| `silenced` | 禁言状态 |

### OAuth2 端点（默认值，一般无需修改）

| 端点 | 地址 |
|------|------|
| 授权端点 | `https://connect.linux.do/oauth2/authorize` |
| Token 端点 | `https://connect.linux.do/oauth2/token` |
| 用户信息端点 | `https://connect.linux.do/api/user` |

如需自定义端点地址，可配置以下环境变量：
- `LINUXDO_AUTHORIZATION_URL`
- `LINUXDO_TOKEN_URL`
- `LINUXDO_USERINFO_URL`

## 📁 项目结构

```
ldc-store/
├── app/
│   ├── (store)/          # 前台商店
│   ├── (admin)/          # 后台管理
│   └── api/              # API 路由
├── components/
│   ├── ui/               # Shadcn UI
│   ├── store/            # 前台组件
│   └── admin/            # 后台组件
├── lib/
│   ├── db/               # 数据库配置
│   ├── actions/          # Server Actions
│   ├── payment/          # 支付集成
│   └── validations/      # Zod 验证
└── ...
```

## 🗃️ 数据库命令

```bash
# 生成迁移文件
pnpm db:generate

# 推送表结构（开发环境）
pnpm db:push

# 运行迁移（生产环境）
pnpm db:migrate

# 打开数据库可视化工具
pnpm db:studio

# 初始化种子数据
pnpm db:seed

# 重置数据库（危险！）
pnpm db:reset
```

## 📄 License

MIT
