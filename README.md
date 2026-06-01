# AI实践调研Agent MVP

面向高校社会实践队的 AI 调研助手。当前只实现第一阶段 MVP：创建项目 → 生成选题 → 确认主选题 → 生成调研方案 → 保存方案。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 风格组件
- Prisma
- PostgreSQL
- OpenAI API
- Markdown 编辑与展示

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

修改 `.env` 中的 `DATABASE_URL`，指向本地 PostgreSQL 数据库。

`OPENAI_API_KEY` 可以留空。留空时系统会返回 mock 选题和 mock 调研方案，方便本地演示。

3. 初始化数据库

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4. 启动开发服务

```bash
npm run dev
```

打开 http://localhost:3000

## 第一阶段已实现功能

- `/` 产品首页，提供进入项目和新建项目入口。
- `/projects` 项目列表，展示项目名称、实践类型、实践地点、当前阶段、更新时间和进入按钮。
- `/projects/new` 新建项目表单，覆盖 Build Brief 要求的项目字段。
- `/projects/[id]` 项目工作台，包含左侧流程导航、中间模块内容、右侧 AI 助手占位。
- 选题设计模块：生成 5 个候选选题，展示研究问题、访谈对象、方法、可行性、创新性、难度和推荐理由。
- 主选题确认：可选择一个候选选题作为主选题，并推进到调研方案阶段。
- 调研方案模块：基于项目信息和主选题生成 Markdown 调研方案并保存到项目，支持编辑后再次保存。
- 访谈提纲模块：可选择访谈对象类型、填写访谈时长、敏感议题和重点问题，生成 mock 结构化访谈提纲，并支持编辑保存。正式 Next 页面暂存到浏览器本地存储，当前预览服务保存到 `work/preview-db.json`。
- `lib/aiService.ts`：统一封装 OpenAI 调用，包含 RateLimit 重试；没有 `OPENAI_API_KEY` 或 AI 调用失败时返回 mock 数据。

## TODO

- 增加更完整的字段校验和错误提示。
- 为 API route 和 AI mock 增加自动化测试。
- 接入更细致的 Markdown 编辑器体验。
- 第二阶段再实现访谈纪要、资料整理、报告初稿等非本阶段功能。
