import type { InterviewOutlineForm, ProjectInput, ProjectRecord } from "@/lib/types";

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
- 具体研究对象：例如某类居民、某类学生、基层工作人员、社区服务对象、产业从业者等。
- 明确研究问题：聚焦一个可观察、可访谈、可分析的问题。
- 可访问访谈对象：访谈对象要适合实践队在实地或线上联系到。
- 可执行方法：访谈、观察、问卷、二手资料整理等方法要匹配短期实践。
- 报告价值：能支撑现状、问题、原因、建议的社会实践报告结构。

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

各部分要求：
- 暖场问题：帮助建立信任，询问身份、经历或日常工作/生活背景。
- 事实性问题：询问可核实的时间、对象、流程、参与情况、资源来源等。
- 过程性问题：追问事情如何发生、如何推进、谁参与、遇到哪些节点。
- 案例追问：引导被访者讲一个具体人、具体事、具体场景。
- 矛盾/困难追问：询问执行中的阻力、资源不足、沟通问题、认知差异等，但措辞要中性。
- 敏感问题替代表达：如果涉及敏感议题，请给出更委婉的问法；如果不涉及，也提供通用替代表达。
- 结束确认问题：请被访者补充、核对关键信息，并询问是否可以后续联系。
- 记录提示：提醒记录访谈对象背景、原话、场景细节、可引用材料和待核实信息。

不要生成完整报告正文，只生成访谈提纲。
`;
}
