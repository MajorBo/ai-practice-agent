# AI实践调研Agent MVP

面向高校社会实践队的 AI 调研助手。当前已实现调研前准备与资料整理的基础 MVP：创建项目、生成选题、确认主选题、生成调研方案、生成访谈提纲、管理文本资料与生成 mock 摘要。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 风格组件
- Prisma
- PostgreSQL（可选）
- OpenAI API（可选）
- Markdown 编辑与展示

## 本地运行

1. 安装依赖

```bash
pnpm install
```

2. 配置环境变量（可选）

```bash
copy .env.example .env
```

当前 Vercel 内测版使用浏览器 `localStorage` 保存项目数据，不再在服务端写入 `work/projects-store.json`。

项目数据只保存在当前浏览器中。换设备、清除浏览器缓存、使用隐身模式或更换浏览器后，原数据可能不可见。

`OPENAI_API_KEY` 可以留空。留空时系统会返回 mock 选题和 mock 调研方案。

## 配置 AI API

当前 AI 服务统一封装在 `lib/ai/aiService.ts`，提示词集中在 `lib/ai/prompts.ts`。

默认支持 DeepSeek API，使用 OpenAI-compatible chat completions 调用方式：

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-chat
```

DeepSeek `baseURL` 为：

```text
https://api.deepseek.com
```

当前已接入真实 AI 的功能：

- 选题生成
- 访谈提纲生成

如果没有配置 `DEEPSEEK_API_KEY`，或者 API 调用失败、JSON 解析失败，系统会自动 fallback 到 mock 数据，页面不会崩溃。

不要把真实 API Key 写进代码，也不要提交 `.env` 或 `.env.local`。

3. 生成 Prisma Client

```bash
pnpm prisma generate
```

4. 如果使用 PostgreSQL，初始化数据库

```bash
pnpm prisma migrate dev --name init
```

5. 启动开发服务

```bash
pnpm dev
```

打开 http://localhost:3000

## 已实现功能

- `/` 产品首页，提供进入项目和新建项目入口。
- `/projects` 项目列表，展示项目名称、实践类型、实践地点、当前阶段、更新时间和进入按钮。
- `/projects/new` 新建项目表单，覆盖 Build Brief 要求的项目字段。
- `/projects/[id]` 项目工作台，包含左侧流程导航、中间模块内容、右侧 AI 助手占位。
- 选题设计模块：生成 5 个候选选题，展示研究问题、访谈对象、方法、可行性、创新性、难度和推荐理由。
- 主选题确认：可选择一个候选选题作为主选题，并推进到调研方案阶段。
- 调研方案模块：基于项目信息和主选题生成 Markdown 调研方案并保存到项目，支持编辑后再次保存。
- 访谈提纲模块：可选择访谈对象类型、填写访谈时长、敏感议题和重点问题，生成 mock 结构化访谈提纲，并支持编辑保存。
- 资料库模块：支持新增文本资料、列表展示、详情查看、编辑删除和 mock 摘要生成，资料保存到浏览器本地存储。
- 访谈纪要模块：支持从资料库选择访谈文本或手动粘贴原文，填写访谈对象信息，生成、编辑、保存和删除 mock 结构化访谈纪要。
- 报告大纲模块：基于项目基础信息、主选题、调研方案、资料摘要和访谈纪要生成 mock 结构化报告大纲，支持编辑、保存、重新生成和删除。
- 报告初稿模块：基于已保存报告大纲、项目资料和访谈纪要生成 mock 结构化报告初稿，支持编辑保存、重新生成、删除、mock 润色和 mock 材料支撑检查。
- `lib/aiService.ts`：统一封装 OpenAI 调用，包含 RateLimit 重试；没有 `OPENAI_API_KEY` 或 AI 调用失败时返回 mock 数据。
- 项目创建、项目列表、项目详情：当前内测版保存到浏览器 `localStorage`，避免 Vercel Serverless 只读文件系统写入失败。

## HTML 单文件版

仓库中包含 `index.html` 和 `ai-practice-agent-standalone.html`，可用于 GitHub Pages 或直接双击体验。

HTML 单文件版使用浏览器 `localStorage` 保存数据，不需要 Node.js、pnpm、数据库或 OpenAI API。

## 数据保存策略

- 项目信息、候选选题、主选题、调研方案：当前内测版保存到浏览器 `localStorage`。
- 访谈提纲：保存到浏览器 `localStorage`。
- 资料库文本资料：保存到浏览器 `localStorage`。
- 访谈纪要：保存到浏览器 `localStorage`。
- 报告大纲：保存到浏览器 `localStorage`。
- 报告初稿：保存到浏览器 `localStorage`。
- mock AI 结果：不调用真实 AI API。

## TODO

- 增加更完整的字段校验和错误提示。
- 为 API route、资料库和 AI mock 增加自动化测试。
- 接入更细致的 Markdown 编辑器体验。
- 后续再实现访谈纪要、资料整理增强、报告初稿等功能。

## Author

本项目由马俊博主导设计与开发，使用 AI-assisted development 工具辅助实现。

## Vercel 部署

在 Vercel 导入 GitHub 仓库后，建议使用默认 Next.js 部署配置：

- Framework Preset: `Next.js`
- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Output Directory: 保持默认

需要在 Vercel Project Settings -> Environment Variables 中配置：

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek API Key
```

不要把真实 API Key 写入代码、README、`.env` 或 `.env.local`。`DEEPSEEK_API_KEY` 只应作为服务端环境变量配置；不要使用 `NEXT_PUBLIC_` 前缀。

如果没有配置 `DEEPSEEK_API_KEY`，系统会自动使用 mock fallback，页面不会崩溃。

当前线上内测版的数据保存说明：

- 项目数据保存在浏览器 `localStorage`。
- 数据只存在于当前浏览器和当前设备。
- 换设备、清缓存、隐身模式可能导致数据不可见。
- 后续正式版计划接入 Supabase/PostgreSQL，实现云端持久化和多设备访问。
