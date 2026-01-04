/**
 * Linux DO Credit 支付集成
 * 基于 EasyPay 兼容协议
 */

import crypto from "crypto";

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
 */
export async function queryPaymentOrder(
  tradeNo: string
): Promise<OrderQueryResult> {
  const gateway = process.env.LDC_GATEWAY || "https://credit.linux.do/epay";
  const pid = process.env.LDC_CLIENT_ID;
  const secret = process.env.LDC_CLIENT_SECRET;

  if (!pid || !secret) {
    throw new Error("支付配置未设置");
  }

  const params = new URLSearchParams({
    act: "order",
    pid,
    key: secret,
    trade_no: tradeNo,
  });

  const response = await fetch(`${gateway}/api.php?${params}`);
  const result = await response.json();

  if (result.code !== 1) {
    throw new Error(result.msg || "查询订单失败");
  }

  return result;
}

/**
 * 退款
 * 使用 GET 请求调用退款接口
 */
export async function refundOrder(
  tradeNo: string,
  money: string
): Promise<{ code: number; msg: string }> {
  let gateway = process.env.LDC_GATEWAY || "https://credit.linux.do/epay";
  const pid = process.env.LDC_CLIENT_ID;
  const secret = process.env.LDC_CLIENT_SECRET;

  if (!pid || !secret) {
    throw new Error("支付配置未设置");
  }

  // 确保网关地址格式正确
  gateway = gateway.replace(/\/+$/, ""); // 移除末尾斜杠
  if (!gateway.includes("/epay")) {
    gateway = gateway + "/epay";
  }

  const params = new URLSearchParams({
    act: "refund",
    pid,
    key: secret,
    trade_no: tradeNo,
    money,
  });

  const url = `${gateway}/api.php?${params}`;
  
  if (process.env.NODE_ENV === "development") {
    console.log("LDC 退款请求:", url);
  }

  const response = await fetch(url);
  
  // 检查响应内容类型
  const contentType = response.headers.get("content-type");
  const text = await response.text();
  
  if (process.env.NODE_ENV === "development") {
    console.log("LDC 退款响应:", text);
  }
  
  // 如果不是 JSON 响应，抛出友好错误
  if (!contentType?.includes("application/json")) {
    console.error("退款接口返回非 JSON 响应:", text.substring(0, 200));
    throw new Error("支付平台返回格式异常，请检查退款接口配置");
  }
  
  try {
    return JSON.parse(text);
  } catch {
    console.error("退款接口 JSON 解析失败:", text.substring(0, 200));
    throw new Error("支付平台响应解析失败");
  }
}

export type { PaymentParams, NotifyParams, OrderQueryResult };
