/**
 * Linux DO Credit 支付集成
 * 基于 EasyPay 兼容协议
 */

import crypto from "crypto";

/**
 * 退款模式
 * - 'proxy': 使用服务端代理（需配置 LDC_PROXY_URL）
 * - 'client': 客户端直接调用（通过浏览器绕过 CF）
 * - 'disabled': 禁用退款
 */
export type RefundMode = 'proxy' | 'client' | 'disabled';

/**
 * 获取退款模式
 * 优先使用代理模式，如果没有代理则启用客户端模式
 * 可通过 LDC_REFUND_MODE 环境变量强制指定模式：proxy / client / disabled
 */
export function getRefundMode(): RefundMode {
  const envMode = process.env.LDC_REFUND_MODE?.toLowerCase();
  
  if (envMode === 'disabled') {
    return 'disabled';
  }
  
  if (envMode === 'client') {
    return 'client';
  }
  
  if (process.env.LDC_PROXY_URL) {
    return 'proxy';
  }
  
  // 默认启用客户端模式（无需代理）
  return 'client';
}

/**
 * 检查是否启用退款功能
 * 兼容旧版本逻辑
 */
export function isRefundEnabled(): boolean {
  return getRefundMode() !== 'disabled';
}

/**
 * 获取 API 端点 URL
 * 如果设置了 LDC_PROXY_URL 环境变量，则使用代理地址
 * 否则使用官方的 /api.php 接口
 */
function getApiUrl(): string {
  const proxyUrl = process.env.LDC_PROXY_URL;
  if (proxyUrl) {
    // 使用代理地址
    return proxyUrl.replace(/\/+$/, ""); // 移除末尾斜杠
  }
  
  // 使用官方接口
  let gateway = process.env.LDC_GATEWAY || "https://credit.linux.do/epay";
  gateway = gateway.replace(/\/+$/, "");
  if (!gateway.includes("/epay")) {
    gateway = gateway + "/epay";
  }
  return `${gateway}/api.php`;
}

interface PaymentParams {
  pid: string;
  type: string;
  out_trade_no: string;
  name: string;
  money: string;
  notify_url?: string;
  return_url?: string;
  device?: string;
}

interface NotifyParams {
  pid: string;
  trade_no: string;
  out_trade_no: string;
  type: string;
  name: string;
  money: string;
  trade_status: string;
  sign_type: string;
  sign: string;
}

interface OrderQueryResult {
  code: number;
  msg: string;
  trade_no: string;
  out_trade_no: string;
  type: string;
  pid: string;
  addtime: string;
  endtime: string;
  name: string;
  money: string;
  status: number;
}

/**
 * 生成签名
 * 1. 取所有非空字段（排除 sign、sign_type）
 * 2. 按 ASCII 升序排列
 * 3. 拼接成 k1=v1&k2=v2 格式
 * 4. 末尾追加密钥后 MD5
 */
export function generateSign(
  params: Record<string, string | undefined>,
  secret: string
): string {
  // 过滤空值，排除 sign 和 sign_type
  const filteredParams = Object.entries(params)
    .filter(
      ([key, value]) =>
        value !== undefined &&
        value !== "" &&
        key !== "sign" &&
        key !== "sign_type"
    )
    .sort(([a], [b]) => a.localeCompare(b));

  // 拼接成 k1=v1&k2=v2 格式
  const queryString = filteredParams
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // 追加密钥并 MD5
  const signStr = queryString + secret;
  return crypto.createHash("md5").update(signStr).digest("hex");
}

/**
 * 验证回调签名
 */
export function verifySign(params: NotifyParams, secret: string): boolean {
  const { sign, sign_type, ...rest } = params;

  // 过滤空值并排序
  const sortedParams = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  // 拼接字符串
  const queryString = sortedParams
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // 计算签名
  const expectedSign = crypto
    .createHash("md5")
    .update(queryString + secret)
    .digest("hex");

  return sign === expectedSign;
}

export interface PaymentFormData {
  actionUrl: string;
  params: Record<string, string>;
}

/**
 * 创建支付订单
 * 返回表单数据，由前端创建表单并 POST 提交（绕过 Cloudflare）
 * @param orderId 订单号
 * @param amount 金额
 * @param productName 商品名称
 * @param siteUrl 网站地址（用于回调）
 */
export function createPayment(
  orderId: string,
  amount: number,
  productName: string,
  siteUrl: string
): PaymentFormData {
  let gateway = process.env.LDC_GATEWAY || "https://credit.linux.do/epay";
  const pid = process.env.LDC_CLIENT_ID;
  const secret = process.env.LDC_CLIENT_SECRET;

  if (!pid || !secret) {
    throw new Error("支付配置未设置：请在 .env 文件中配置 LDC_CLIENT_ID 和 LDC_CLIENT_SECRET");
  }

  // 确保网关地址格式正确
  gateway = gateway.replace(/\/+$/, ""); // 移除末尾斜杠
  if (!gateway.includes("/epay")) {
    gateway = gateway + "/epay";
  }

  const params: PaymentParams = {
    pid,
    type: "epay",
    out_trade_no: orderId,
    name: productName.slice(0, 64), // 最多 64 字符
    money: amount.toFixed(2),
    notify_url: `${siteUrl}/api/payment/notify`,
    return_url: `${siteUrl}/order/result?out_trade_no=${orderId}`,
  };

  const sign = generateSign(params as unknown as Record<string, string>, secret);

  const formParams = {
    ...params,
    sign,
    sign_type: "MD5",
  } as Record<string, string>;

  if (process.env.NODE_ENV === "development") {
    console.log("LDC 支付表单数据:", {
      actionUrl: `${gateway}/pay/submit.php`,
      params: formParams,
    });
  }

  return {
    actionUrl: `${gateway}/pay/submit.php`,
    params: formParams,
  };
}

/**
 * 查询订单状态
 * 支持通过 LDC_PROXY_URL 代理请求
 */
export async function queryPaymentOrder(
  tradeNo: string
): Promise<OrderQueryResult> {
  const pid = process.env.LDC_CLIENT_ID;
  const secret = process.env.LDC_CLIENT_SECRET;

  if (!pid || !secret) {
    throw new Error("支付配置未设置");
  }

  const apiUrl = getApiUrl();
  const params = new URLSearchParams({
    act: "order",
    pid,
    key: secret,
    trade_no: tradeNo,
  });

  const url = `${apiUrl}?${params}`;
  console.log("LDC 订单查询请求:", url.replace(secret, "***"));

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  
  const text = await response.text();
  
  try {
    const result = JSON.parse(text);
    if (result.code !== 1) {
      throw new Error(result.msg || "查询订单失败");
    }
    return result;
  } catch (e) {
    console.error("订单查询响应解析失败:", text.substring(0, 200));
    throw e;
  }
}

/**
 * 退款
 * 使用 POST 请求调用退款接口
 * 支持通过 LDC_PROXY_URL 代理请求
 * 文档: POST /api.php, 支持 application/x-www-form-urlencoded 或 application/json
 */
export async function refundOrder(
  tradeNo: string,
  money: string
): Promise<{ code: number; msg: string }> {
  const pid = process.env.LDC_CLIENT_ID;
  const secret = process.env.LDC_CLIENT_SECRET;

  if (!pid || !secret) {
    throw new Error("支付配置未设置");
  }

  const apiUrl = getApiUrl();
  const body = new URLSearchParams({
    pid,
    key: secret,
    trade_no: tradeNo,
    money,
  });

  console.log("LDC 退款请求:", apiUrl, "参数:", { pid, trade_no: tradeNo, money });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: body.toString(),
  });

  // 检查响应内容类型
  const contentType = response.headers.get("content-type");
  const text = await response.text();

  console.log("LDC 退款响应状态:", response.status, "类型:", contentType);
  console.log("LDC 退款响应内容:", text.substring(0, 500));

  // 如果不是 JSON 响应，抛出友好错误
  if (!contentType?.includes("application/json")) {
    console.error("退款接口返回非 JSON 响应:", text.substring(0, 500));
    
    // 检查是否是 Cloudflare 拦截
    if (text.includes("Just a moment") || text.includes("cloudflare")) {
      throw new Error("支付平台被 Cloudflare 拦截，请配置 LDC_PROXY_URL 环境变量使用代理");
    }
    
    throw new Error("支付平台返回格式异常，请检查退款接口配置");
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error("退款接口 JSON 解析失败:", text.substring(0, 500));
    throw new Error("支付平台响应解析失败");
  }
}

/**
 * 客户端退款所需的参数
 */
export interface ClientRefundParams {
  apiUrl: string;
  pid: string;
  key: string;
  trade_no: string;
  money: string;
}

/**
 * 生成客户端退款所需的参数
 * 这些参数将传递给前端，由浏览器直接调用 LDC API（可通过 CF 挑战）
 */
export function getClientRefundParams(
  tradeNo: string,
  money: string
): ClientRefundParams {
  const pid = process.env.LDC_CLIENT_ID;
  const secret = process.env.LDC_CLIENT_SECRET;

  if (!pid || !secret) {
    throw new Error("支付配置未设置：请在 .env 文件中配置 LDC_CLIENT_ID 和 LDC_CLIENT_SECRET");
  }

  let gateway = process.env.LDC_GATEWAY || "https://credit.linux.do/epay";
  gateway = gateway.replace(/\/+$/, "");
  if (!gateway.includes("/epay")) {
    gateway = gateway + "/epay";
  }

  return {
    apiUrl: `${gateway}/api.php`,
    pid,
    key: secret,
    trade_no: tradeNo,
    money,
  };
}

export type { PaymentParams, NotifyParams, OrderQueryResult };
