import OpenAI, { RateLimitError } from "openai";
import type { ProjectInput, ResearchPlanPayload, TopicCandidate } from "./types";

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

function hasApiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function callOpenAIWithRetry<T>(prompt: string, maxRetries = 5): Promise<T> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是高校社会实践调研方法专家。只返回合法 JSON，不要添加 Markdown 代码块。"
          },
          { role: "user", content: prompt }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned empty content.");
      }
      return JSON.parse(content) as T;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      if (error instanceof RateLimitError && !isLastAttempt) {
        const waitMs = ((2 ** attempt) + 0.5) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }

  throw new Error("OpenAI retry exhausted.");
}

export async function generateTopicCandidates(project: ProjectInput): Promise<TopicCandidate[]> {
  if (!hasApiKey()) {
    return mockTopics(project);
  }

  try {
    const result = await callOpenAIWithRetry<{ topics: TopicCandidate[] }>(`
请基于以下社会实践项目信息，生成 5 个候选调研选题。
每个选题必须包含 title、researchQuestion、interviewTargets、methods、feasibilityScore、innovationScore、difficulty、reason。
feasibilityScore 和 innovationScore 为 1-10 的整数，difficulty 只能是“低”“中”“高”。

项目信息：
${JSON.stringify(project, null, 2)}

返回 JSON 格式：
{"topics":[...]}
`);
    return result.topics;
  } catch (error) {
    console.error("Falling back to mock topics:", error);
    return mockTopics(project);
  }
}

export async function generateResearchPlan(payload: ResearchPlanPayload): Promise<string> {
  if (!hasApiKey()) {
    return mockPlan(payload);
  }

  try {
    const result = await callOpenAIWithRetry<{ markdown: string }>(`
请基于项目信息和主选题，生成一份适合高校社会实践队执行的调研方案。
方案必须使用 Markdown，包含以下一级或二级标题：调研背景、调研目的、核心问题、调研对象、调研方法、日程安排、成员分工、预期成果、风险预案。

项目信息：
${JSON.stringify(payload.project, null, 2)}

主选题：
${JSON.stringify(payload.selectedTopic, null, 2)}

返回 JSON 格式：
{"markdown":"..."}
`);
    return result.markdown;
  } catch (error) {
    console.error("Falling back to mock plan:", error);
    return mockPlan(payload);
  }
}

function mockTopics(project: ProjectInput): TopicCandidate[] {
  const location = project.location || "实践地";
  const theme = project.theme || "实践主题";

  return [
    {
      title: `${location}居民对${theme}的认知与参与机制研究`,
      researchQuestion: `当地居民如何理解并参与${theme}相关实践，影响参与意愿的关键因素是什么？`,
      interviewTargets: ["社区居民", "基层干部", "志愿服务组织负责人"],
      methods: ["半结构访谈", "问卷调查", "现场观察"],
      feasibilityScore: 9,
      innovationScore: 7,
      difficulty: "中",
      reason: "对象易触达，能形成定量与定性结合的材料，适合第一阶段实践队快速落地。"
    },
    {
      title: `${location}${theme}服务供给现状与改进路径研究`,
      researchQuestion: `现有服务供给是否匹配当地真实需求，哪些环节存在体验落差？`,
      interviewTargets: ["服务对象", "一线工作人员", "主管部门代表"],
      methods: ["访谈", "服务流程走查", "案例分析"],
      feasibilityScore: 8,
      innovationScore: 8,
      difficulty: "中",
      reason: "能够直接连接实践观察和政策建议，成果转化空间较清晰。"
    },
    {
      title: `青年力量参与${location}${theme}建设的模式研究`,
      researchQuestion: `青年群体在当地实践中承担了哪些角色，如何提升持续参与能力？`,
      interviewTargets: ["高校学生", "青年志愿者", "项目组织者"],
      methods: ["焦点小组", "深度访谈", "资料分析"],
      feasibilityScore: 8,
      innovationScore: 8,
      difficulty: "低",
      reason: "与高校实践队身份高度契合，便于形成可复制的参与机制总结。"
    },
    {
      title: `${location}${theme}典型案例的成效评估研究`,
      researchQuestion: `当地典型案例产生了哪些实际效果，评价指标应如何建立？`,
      interviewTargets: ["案例负责人", "受益群众", "专家或指导老师"],
      methods: ["案例研究", "指标评估", "访谈"],
      feasibilityScore: 7,
      innovationScore: 9,
      difficulty: "高",
      reason: "研究深度较强，但对资料完整度和评价框架要求更高。"
    },
    {
      title: `${location}${theme}传播效果与公众反馈研究`,
      researchQuestion: `相关实践信息如何被传播，公众反馈如何影响后续行动？`,
      interviewTargets: ["宣传负责人", "居民代表", "新媒体运营人员"],
      methods: ["内容分析", "访谈", "问卷调查"],
      feasibilityScore: 8,
      innovationScore: 7,
      difficulty: "中",
      reason: "适合结合线上资料和线下访谈，能产出可视化传播建议。"
    }
  ];
}

function mockPlan({ project, selectedTopic }: ResearchPlanPayload): string {
  return `# ${selectedTopic.title}调研方案

## 调研背景
本项目围绕“${project.theme}”展开，实践地点为${project.location}。团队计划在${project.startDate}至${project.endDate}期间，通过实地走访、访谈和资料整理，理解当地实践现状与真实需求。

## 调研目的
1. 梳理${project.location}在${project.theme}方面的现状、经验与问题。
2. 回答核心研究问题：${selectedTopic.researchQuestion}
3. 形成可执行、可展示的社会实践成果，为后续报告撰写奠定材料基础。

## 核心问题
- 当地相关主体的真实需求和痛点是什么？
- 现有实践机制有哪些优势与不足？
- 高校实践队可以提出哪些改进建议或行动方案？

## 调研对象
${selectedTopic.interviewTargets.map((target) => `- ${target}`).join("\n")}

## 调研方法
${selectedTopic.methods.map((method) => `- ${method}`).join("\n")}

## 日程安排
- 前期准备：明确访谈对象，设计问卷与访谈提纲，完成分工。
- 实地调研：开展访谈、问卷发放、现场观察和资料收集。
- 资料整理：编码访谈材料，汇总问卷数据，提炼关键发现。
- 成果形成：完成调研方案归档，并为后续报告初稿准备素材。

## 成员分工
- 项目负责人：统筹进度、对接外部单位、把控成果质量。
- 访谈小组：联系并访谈重点对象，整理访谈纪要。
- 问卷小组：设计、发放和回收问卷，完成基础统计。
- 资料小组：收集政策、新闻、案例等二手资料。
- 成果小组：维护 Markdown 方案，沉淀图表、结论和建议。

## 预期成果
${project.expectedOutcome}

## 风险预案
- 访谈对象临时无法参与：提前准备备选对象和线上访谈方案。
- 数据样本不足：扩大问卷渠道，并补充现场观察与二手资料。
- 时间安排紧张：每日复盘进度，优先保障核心对象访谈和关键材料收集。
- 主题发散：围绕主选题持续校准问题边界，避免超出第一阶段目标。`;
}
