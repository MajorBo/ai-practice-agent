import type { InterviewOutlineForm, ProjectInput, ProjectRecord, ResearchPlanPayload } from "@/lib/types";

export function buildTopicPrompt(project: ProjectInput) {
  return `
你正在帮助一支高校社会实践队设计可落地的短期调研选题。请基于用户提供的项目信息，生成 5 个候选调研选题。

核心目标：
- 选题必须具体，不要宏大、空泛或政策口号化。
- 每个选题都要适合 7 天左右的短期社会实践完成。
- 每个选题都要能转化为一篇高校社会实践报告。
- 不要假设用户没有提供的信息；如果信息不足，请围绕已给出的实践类型、主题、地点和预期成果设计。
- 不要编造已经发生的调研事实，只设计可执行的调研方向。

每个选题必须体现：
- 具体研究对象。
- 明确研究问题。
- 可访问访谈对象。
- 可执行方法。
- 报告价值。

避免生成：
- “某地乡村振兴研究”“基层治理现代化研究”这类过大的题目。
- 只讨论意义、价值、战略、模式的空泛选题。
- 需要长期跟踪、大样本统计、专业实验或大量内部数据才能完成的选题。
- 无法找到访谈对象或很难在 7 天内获得材料的选题。

每个选题必须包含以下字段：
- title
- researchQuestion
- interviewTargets
- methods
- feasibilityScore
- innovationScore
- difficulty
- reason

字段要求：
- title 要具体到对象、场景或问题，不超过 28 个中文字符。
- researchQuestion 用一句话说明“研究谁在什么场景下面临什么具体问题”。
- interviewTargets 至少 3 类，且必须是可访问对象。
- methods 至少 3 种，优先选择短期可执行方法。
- feasibilityScore 和 innovationScore 为 1-10 的整数。
- difficulty 只能是“低”“中”“高”。
- reason 要说明为什么适合 7 天左右实践队完成，以及能如何服务社会实践报告写作。

项目信息：
${JSON.stringify(project, null, 2)}

只返回合法 JSON，不要返回 Markdown 代码块，不要添加解释文字。返回格式：
{
  "topics": [
    {
      "title": "...",
      "researchQuestion": "...",
      "interviewTargets": ["..."],
      "methods": ["..."],
      "feasibilityScore": 8,
      "innovationScore": 7,
      "difficulty": "中",
      "reason": "..."
    }
  ]
}
`;
}

export function buildResearchPlanPrompt(payload: ResearchPlanPayload) {
  const { project, selectedTopic } = payload;

  return `
你正在为高校社会实践队生成一份可执行的调研方案。请严格基于用户提供的项目上下文和当前主选题生成方案。

输出格式硬性要求：
- 直接输出调研方案正文。
- 不要写“以下是调研方案”“当然可以”“根据你的需求”等前言。
- 不要输出解释性说明、客套话或模型身份说明。
- 从 Markdown 二级标题开始，例如：## 一、调研背景。
- 不要使用 Markdown 代码块。

写作约束：
- 不要编造用户没有提供的地方事实、政策文件、数据、访谈对象和调研经历。
- 不要写空泛套话。
- 不要把调研方案写成宣传稿。
- 内容要适合高校社会实践队实际执行。
- 方案应服务后续访谈提纲、资料库和报告大纲模块。
- 语言正式、清晰、可执行。
- 如果某些字段或地方资料不足，请明确写“需补充”，不要自行假设。

项目上下文：
${JSON.stringify(
  {
    项目名称: project.name,
    实践类型: project.practiceType,
    实践主题: project.theme,
    实践地点: project.location,
    实践开始时间: project.startDate,
    实践结束时间: project.endDate,
    团队人数: project.teamSize,
    预期成果: project.expectedOutcome,
    已有资源或其他要求: project.requirements || "未填写",
    当前主选题: selectedTopic.title,
    主选题研究问题: selectedTopic.researchQuestion,
    推荐访谈对象: selectedTopic.interviewTargets,
    推荐调研方法: selectedTopic.methods
  },
  null,
  2
)}

请使用 Markdown 输出，必须包含以下十个二级标题：

## 一、调研背景
- 结合实践主题、地点和主选题。
- 不要写空泛口号。
- 不要编造具体政策、数据或地方事实。
- 如果缺少具体地方资料，应提示“后续需补充地方背景材料”。

## 二、调研目标
- 写清楚本次实践希望回答什么问题。
- 区分实践目标和研究目标。

## 三、核心研究问题
- 给出 3-5 个具体问题。
- 问题要能通过短期实践和访谈回答。
- 避免过大、过空。

## 四、调研对象
- 按类型列出建议访谈对象。
- 说明每类对象能提供什么信息。
- 不要假设一定能接触到某个具体人物。

## 五、调研方法
- 包括半结构访谈、观察、文本资料分析等。
- 说明每种方法服务于哪个研究问题。
- 不要堆砌方法名。

## 六、调研日程安排
- 根据实践开始时间、结束时间或实践天数生成。
- 如果时间信息不完整，则按 5-7 天给出可调整模板。
- 每天安排要可执行，不要排得过满。

## 七、团队分工建议
- 根据团队人数生成合理分工。
- 包括统筹、访谈、记录、资料整理、摄影宣传、报告写作等角色。
- 如果团队人数较少，要合并角色。

## 八、预期成果
- 结合用户填写的预期成果。
- 包括调研报告、访谈纪要、实践日志、答辩展示等。

## 九、风险与伦理预案
- 包括访谈同意、匿名处理、敏感问题表达、资料保密、行程安全。
- 对基层治理、民族地区、社区等场景要注意表达边界。
- 不要渲染风险，不要使用夸张表达。

## 十、材料补充清单
- 列出为了完善调研方案，后续还需要补充哪些资料。
- 例如地方政策文件、访谈对象名单、实践日程确认、指导教师要求等。
`;
}

export function buildInterviewOutlinePrompt(project: ProjectRecord, form: InterviewOutlineForm) {
  const target = form.targetType === "自定义对象" ? form.customTarget || "自定义对象" : form.targetType;

  return `
你正在为高校社会实践队设计一份真实田野访谈提纲。请基于项目信息和访谈设置，生成可直接带到现场使用的访谈提纲。

输出格式硬性要求：
- 直接输出访谈提纲正文。
- 不要输出“以下是”“当然可以”“根据你的需求”“我为你设计了”等前言。
- 不要输出解释性说明、客套话或模型身份说明。
- 从 Markdown 二级标题开始，例如：## 暖场问题。
- 不要使用 Markdown 代码块。

访谈设计原则：
- 这是一份半结构式访谈提纲，不是问卷。
- 问题要开放但具体，方便被访者讲经历、过程和案例。
- 不要只问“怎么看”“有什么意义”“是否满意”这类空泛问题。
- 不要编造访谈事实，不要假设用户没有提供的信息。
- 如果信息不足，请用可替换占位表达，例如“您所在的社区/单位/村庄”。
- 提问要自然、克制、尊重被访者，适合真实实地访谈。
- 敏感问题要使用替代表达，降低冒犯性和诱导性。

项目信息：
${JSON.stringify(
  {
    name: project.name,
    practiceType: project.practiceType,
    theme: project.theme,
    location: project.location,
    expectedOutcome: project.expectedOutcome,
    selectedTopic: project.selectedTopic
  },
  null,
  2
)}

访谈设置：
${JSON.stringify(
  {
    target,
    durationMinutes: form.durationMinutes,
    hasSensitiveTopics: form.hasSensitiveTopics,
    focusQuestions: form.focusQuestions
  },
  null,
  2
)}

请使用 Markdown 输出，必须包含以下二级标题：
- 暖场问题
- 事实性问题
- 过程性问题
- 案例追问
- 矛盾/困难追问
- 敏感问题替代表达
- 结束确认问题
- 记录提示

不要生成完整报告正文，只生成访谈提纲。
`;
}
