# LDC Store - 自动发卡系统

基于 Next.js 16 的虚拟商品自动发卡平台，支持 Linux DO Credit 积分支付。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgptkong%2Fldc-store&env=DATABASE_URL,AUTH_SECRET,ADMIN_PASSWORD,LDC_CLIENT_ID,LDC_CLIENT_SECRET,LINUXDO_CLIENT_ID,LINUXDO_CLIENT_SECRET,STATS_TIMEZONE&envDescription=DATABASE_URL%3A%20PostgreSQL%20%7C%20AUTH_SECRET%3A%20openssl%20rand%20-base64%2032%20%7C%20ADMIN_PASSWORD%3A%20管理员密码%20%7C%20LDC_CLIENT_ID%2FLDC_CLIENT_SECRET%3A%20支付凭证%20%7C%20LINUXDO_CLIENT_ID%2FLINUXDO_CLIENT_SECRET%3A%20OAuth登录凭证%20%7C%20STATS_TIMEZONE%3A%20统计口径时区（默认%20Asia%2FShanghai）&envLink=https%3A%2F%2Fgithub.com%2Fgptkong%2Fldc-store%2Fblob%2Fmain%2Fdocs%2FDEPLOY.md&project-name=ldc-store&repository-name=ldc-store)

> 📚 **详细部署指南**: [docs/DEPLOY.md](./DEPLOY.md)

## ✨ 特性

### 🛒 前台商店
- **商品展示** - 网格布局商品列表、分类导航、客户端分类筛选（无需刷新页面）
- **商品详情** - 支持 Markdown 富文本、热门标签、折扣价格、详情图轮播
- **库存状态** - 实时库存数量显示、销量统计
- **公告系统** - 首页公告轮播横幅（支持 Markdown、定时上下线）
- **全文搜索** - Header 搜索入口 + 结果页筛选/多种排序/分页
- **催补货功能** - 缺货时用户可申请催补货，显示催补货人数和最近请求者头像
- **消费排行榜** - TOP 50 顾客消费排行榜（`/leaderboard`），展示累计消费金额和订单数
- **我的订单** - 查看个人历史订单、订单详情、卡密信息（`/order/my`）
- **支付凭证** - 生成可分享的支付成功凭证（`/order/receipt/:orderNo`），不含敏感信息
- **ISR 缓存** - 60 秒增量静态再生成，提升页面加载性能

### 🔐 登录与权限
- **用户下单** - 使用 Linux DO Connect OAuth2 登录，下单/查单与账号绑定
- **后台管理** - 管理员密码登录（`ADMIN_PASSWORD`），或配置 `ADMIN_USERNAMES` 允许指定 Linux DO 用户名以管理员身份登录后台
- **会话管理** - 基于 NextAuth v5 的 JWT 会话策略

### 💳 自动发卡
- 支持 Linux DO Credit 积分支付
- 支付成功后自动发放卡密
- 订单超时自动释放锁定库存（懒加载 + 节流策略）
- 支付回调幂等处理，防止重复投递
- 卡密锁定使用数据库事务 + `FOR UPDATE` 保证原子性

### 🔄 退款功能
- 用户可申请退款（需填写退款原因），管理员审核
- **客户端模式**（默认）：通过浏览器表单提交绕过 CORS/CF 限制（无需代理）
- **代理模式**：通过服务端代理调用 LDC Credit 退款接口
- **禁用模式**：可关闭退款功能
- 退款成功后自动回收卡密（状态恢复为 available）

### 📦 库存管理
- **批量导入** - 支持换行符/逗号分隔，自动去重（可选）
- **去重检测** - 输入去重 + 数据库去重，导入统计报告
- **库存预警** - 低于阈值的商品自动提醒（默认 < 10）
- **卡密编辑** - 修改卡密内容（仅限可用状态）
- **批量删除** - 删除未售出卡密
- **重置锁定** - 释放锁定状态的卡密
- **导出功能** - 按状态导出卡密列表（CSV）
- **清理重复** - 自动清理重复卡密（保留最早创建的）

### 📊 后台管理
- **仪表盘** - 今日销售额/订单数（环比增长）、待办事项、销售趋势图（7 天）、最近订单、库存预警
- **商品管理** - 创建/编辑/复制商品、批量上架/下架/删除、设置价格/原价、热门标记、购买数量限制、排序权重
- **分类管理** - 分类增删改、启用/停用、排序、商品数量统计
- **订单管理** - 订单列表、多维度筛选（状态/支付方式/搜索）、订单详情、手动完成订单、批量删除、CSV 导出（最多 5000 条）
- **退款审核** - 查看退款申请详情、通过/拒绝退款、管理员备注
- **卡密管理** - 按商品查看库存、批量导入/删除/导出、状态筛选
- **公告管理** - 公告增删改、Markdown 内容、生效时间段、启用/停用、排序
- **客户管理** - 客户列表、订单数/累计消费统计
- **系统配置** - 网站名称/描述/图标、订单过期时间、Telegram 通知配置

### 🔔 通知系统
- **Telegram 通知** - 催补货请求实时推送（商品名称、库存、请求用户、时间）
- **测试功能** - 后台可测试 Telegram 配置是否正确
- **异步发送** - 不阻塞主流程，静默失败不影响业务

### 🎨 现代 UI
- 基于 Shadcn/UI + Tailwind CSS v4
- 支持深色/浅色模式切换
- 响应式设计，移动端友好
- 30+ 通用 UI 组件

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
4. 初始化数据库表结构（默认 Production 部署会自动执行 `pnpm db:baseline && pnpm db:migrate`，失败时再手动执行）

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
ORDER_EXPIRE_MINUTES=5

# 统计口径时区（可选，默认 Asia/Shanghai / UTC+8）
# 用于后台仪表盘"今日销售额"等统计的日界线口径
STATS_TIMEZONE="Asia/Shanghai"
```

### 3. 初始化数据库

```bash
# 新库：执行迁移创建表结构
pnpm db:migrate

# 旧库：如果历史上用过 db:push（没有迁移记录），先 baseline 再 migrate
# pnpm db:baseline
# pnpm db:migrate

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

### 5. 测试（可选）

```bash
pnpm test
pnpm test:coverage
```

更多测试说明与覆盖率基线阈值：`docs/TESTING_PLAN.md`（CI 会上传 `coverage/` 产物，可直接打开 `coverage/index.html` 查看报告）

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
| `ORDER_EXPIRE_MINUTES` | ❌ | `5` | 订单过期时间（分钟）|
| `STATS_TIMEZONE` | ❌ | `Asia/Shanghai` | 统计口径时区（用于"今日销售额"等报表口径，建议使用 IANA 时区名）|

### 🕒 时间与统计口径

- 数据库存储使用 `timestamp with time zone`（timestamptz），内部以 UTC 存储时间戳
- 前端展示时间按用户浏览器本地时区显示（例如订单列表时间）
- 后台"今日"类统计的日界线由 `STATS_TIMEZONE` 决定，默认中国时区（`Asia/Shanghai`）

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

# 旧库基线化（历史用过 db:push / 没有迁移记录时使用）
pnpm db:baseline

# 推送表结构（不推荐；会绕过迁移记录，后续 migrate 可能会失败）
pnpm db:push

# 运行迁移（推荐：新库/生产环境都应使用）
pnpm db:migrate

# 打开数据库可视化工具
pnpm db:studio

# 初始化种子数据
pnpm db:seed

# 重置数据库（危险！）
pnpm db:reset
```

## 🖼️ 品牌图标与 favicon

仓库内置了一个生成脚本：输入一张 **正方形 PNG**，输出品牌图标与 `favicon.ico`：

- 输出：`public/ldc-mart.png`、`app/favicon.ico`
- 依赖：`sharp`（已在 devDependencies 中声明）

```bash
# 使用自定义输入图（正方形 PNG）
pnpm tsx scripts/generate-favicon.ts path/to/icon.png

# 不指定参数时会尝试使用仓库内置图片（如 public/ldc-mart.png）
pnpm tsx scripts/generate-favicon.ts
```

## 📄 License

MIT
