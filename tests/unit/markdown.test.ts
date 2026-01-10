import { describe, expect, it, vi } from "vitest";

import { marked } from "marked";

import { renderMarkdownToSafeHtml } from "@/lib/markdown";

describe("markdown", () => {
  it("空内容应返回空字符串", () => {
    // 为什么这样测：覆盖空输入分支，避免调用 markdown 解析器造成不必要开销。
    expect(renderMarkdownToSafeHtml("")).toBe("");
  });

  it("当 marked.parse 返回非字符串时应安全回退", () => {
    // 为什么这样测：marked.parse 在 async 或异常配置下可能返回非 string；这里确保我们不会把未知对象当 HTML 注入到页面。
    const spy = vi.spyOn(marked, "parse").mockReturnValue({} as any);
    try {
      expect(renderMarkdownToSafeHtml("# hi")).toBe("");
    } finally {
      spy.mockRestore();
    }
  });

  it("应渲染标题与链接，并强制 a 标签安全属性", () => {
    const html = renderMarkdownToSafeHtml("# 标题\n\n[Link](https://example.com)");

    expect(html).toContain("<h1");
    expect(html).toContain("标题");
    expect(html).toContain('href="https://example.com"');

    // 为什么要断言 rel/target：避免钓鱼页面通过 window.opener 反制、并减少 SEO 垃圾链接风险
    expect(html).toContain('rel="nofollow noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("应保留代码块结构（pre/code）", () => {
    const html = renderMarkdownToSafeHtml("```js\nconsole.log(1)\n```");

    expect(html).toContain("<pre");
    expect(html).toContain("<code");
    expect(html).toContain("console.log(1)");
  });

  it("应移除危险标签（script）", () => {
    const html = renderMarkdownToSafeHtml('hello<script>alert("x")</script>');

    expect(html).not.toContain("<script");
    // sanitize-html 的 discard 模式会移除标签但可能保留文本内容；此处重点验证“不会形成可执行脚本”
  });

  it("应拒绝 javascript: scheme 的链接（移除 href）", () => {
    const html = renderMarkdownToSafeHtml("[x](javascript:alert(1))");

    expect(html).toContain(">x</a>");
    expect(html).not.toContain('href="javascript:');
  });

  it("img 仅允许 http/https，其他 scheme 应被移除", () => {
    const html = renderMarkdownToSafeHtml('<img src="data:text/plain,evil" alt="x" />');

    expect(html).toContain("<img");
    expect(html).not.toContain("data:text/plain");
  });
});

