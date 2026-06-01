import { generateResearchPlanWithAI, generateTopicCandidatesWithAI } from "@/lib/ai/aiService";
import type { ProjectInput, ResearchPlanPayload, TopicCandidate } from "./types";

export async function generateTopicCandidates(project: ProjectInput): Promise<TopicCandidate[]> {
  try {
    const aiTopics = await generateTopicCandidatesWithAI(project);
    if (aiTopics?.length) return aiTopics;
  } catch (error) {
    console.error("Falling back to mock topics:", error);
  }

  return mockTopics(project);
}

export async function generateResearchPlan(payload: ResearchPlanPayload): Promise<string> {
  try {
    const aiPlan = await generateResearchPlanWithAI(payload);
    if (aiPlan) return aiPlan;
  } catch (error) {
    console.error("Falling back to mock plan:", error);
  }

  return mockPlan(payload);
}

export function mockTopics(project: ProjectInput): TopicCandidate[] {
  const location = project.location || "实践地";
  const theme = project.theme || "实践主题";

  return [
    {
      title: `${location}居民参与${theme}现状调研`,
      researchQuestion: `${location}居民在${theme}相关事务中的参与方式、真实需求和主要障碍是什么？`,
      interviewTargets: ["社区居民", "基层干部", "志愿服务组织负责人"],
      methods: ["半结构访谈", "现场观察", "文本资料整理"],
      feasibilityScore: 9,
      innovationScore: 7,
      difficulty: "中",
      reason: "对象较容易触达，能在短期内形成访谈、观察和资料整理材料，适合支撑社会实践报告。"
    },
    {
      title: `${location}${theme}服务供给调研`,
      researchQuestion: `${location}${theme}相关服务是否匹配实际需求，哪些环节存在体验落差？`,
      interviewTargets: ["服务对象", "一线工作人员", "主管部门或社区工作人员"],
      methods: ["访谈", "服务流程观察", "案例分析"],
      feasibilityScore: 8,
      innovationScore: 8,
      difficulty: "中",
      reason: "能直接连接实践观察和改进建议，适合形成现状、问题、建议结构。"
    },
    {
      title: `${location}青年参与${theme}路径研究`,
      researchQuestion: `青年群体在${location}${theme}实践中承担哪些角色，如何提升持续参与能力？`,
      interviewTargets: ["高校学生", "青年志愿者", "项目组织者"],
      methods: ["焦点小组", "深度访谈", "资料分析"],
      feasibilityScore: 8,
      innovationScore: 8,
      difficulty: "低",
      reason: "与高校实践队身份契合，便于形成可复制的参与机制总结。"
    },
    {
      title: `${location}${theme}典型案例调研`,
      researchQuestion: `${location}${theme}相关典型案例呈现了哪些做法、问题和可改进环节？`,
      interviewTargets: ["案例负责人", "参与群众", "指导教师或熟悉情况的工作人员"],
      methods: ["案例研究", "访谈", "资料核验"],
      feasibilityScore: 7,
      innovationScore: 8,
      difficulty: "高",
      reason: "研究深度较强，但对案例材料完整度要求更高，适合已有明确案例线索时开展。"
    },
    {
      title: `${location}${theme}信息传播调研`,
      researchQuestion: `${theme}相关信息如何触达公众，反馈如何影响后续行动？`,
      interviewTargets: ["宣传负责人", "居民代表", "新媒体运营人员"],
      methods: ["内容分析", "访谈", "问卷调查"],
      feasibilityScore: 8,
      innovationScore: 7,
      difficulty: "中",
      reason: "适合结合线上资料和线下访谈，能产出传播改进建议。"
    }
  ];
}

export function mockPlan({ project, selectedTopic }: ResearchPlanPayload): string {
  const targets = selectedTopic.interviewTargets.length ? selectedTopic.interviewTargets : ["基层工作人员", "服务对象", "相关居民"];
  const methods = selectedTopic.methods.length ? selectedTopic.methods : ["半结构访谈", "现场观察", "文本资料分析"];
  const days = buildScheduleDays(project.startDate, project.endDate);
  const teamSize = Number(project.teamSize) || 5;
  const smallTeam = teamSize <= 4;

  return `## 一、调研背景
本次实践围绕“${project.theme}”展开，实践地点为${project.location}，主选题为“${selectedTopic.title}”。该选题关注的问题是：${selectedTopic.researchQuestion}

当前方案仅基于用户已填写的项目信息和主选题生成，不编造具体政策、数据或地方事实。后续需补充地方背景材料，例如当地公开政策文件、社区/村庄基础情况、既有工作材料等。

## 二、调研目标
实践目标：在${project.startDate}至${project.endDate}期间，通过访谈、观察和资料整理，形成可支撑“${project.expectedOutcome}”的实践材料。

研究目标：围绕主选题回答${project.location}在“${project.theme}”中的具体对象、实际过程、主要困难和改进方向，为后续访谈提纲、资料库整理和报告大纲提供依据。

## 三、核心研究问题
1. ${selectedTopic.researchQuestion}
2. ${project.location}相关对象在实际参与或接受服务过程中遇到哪些具体困难？
3. 不同访谈对象对“${project.theme}”的感受和期待是否存在差异？
4. 现有工作流程中哪些环节比较顺畅，哪些环节仍需优化？
5. 短期实践队能够提出哪些可执行、不过度延展的改进建议？

## 四、调研对象
${targets.map((target) => `- ${target}：可提供与主选题相关的一线经历、实际需求、流程反馈或改进建议。`).join("\n")}

以上对象为建议类型，不假设一定能接触到某个具体人物；后续需补充访谈对象名单和联系方式确认情况。

## 五、调研方法
- 半结构访谈：围绕核心研究问题访问${targets.slice(0, 3).join("、")}，重点获取事实、过程、案例和困难。
- 现场观察：观察${project.location}与“${project.theme}”相关的服务场景、空间动线、互动过程或宣传材料。
- 文本资料分析：整理地方公开资料、实践日志、新闻资料和政策文本，用于补充背景和核验访谈信息。
${methods.filter((method) => !["半结构访谈", "访谈", "现场观察", "文本资料分析"].includes(method)).map((method) => `- ${method}：作为补充方法，用于交叉验证访谈和观察材料。`).join("\n")}

## 六、调研日程安排
${days.map((day, index) => {
  const tasks = [
    "项目启动、资料预读、访谈对象联系和提纲微调。",
    "开展第一轮访谈和现场观察，记录关键场景与问题线索。",
    "开展第二轮访谈，补充不同类型对象的反馈。",
    "整理访谈纪要和资料库材料，初步归纳核心发现。",
    "围绕缺口补访或补充资料，核对关键事实。",
    "形成调研方案归档、报告大纲素材和展示材料初稿。",
    "团队复盘，完善风险记录、材料清单和后续写作分工。"
  ];
  return `- ${day}：${tasks[Math.min(index, tasks.length - 1)]}`;
}).join("\n")}

## 七、团队分工建议
- 统筹协调：1 人，负责进度安排、外部沟通和质量把关。
- 访谈执行：${smallTeam ? "由统筹和记录成员兼任" : "2 人"}，负责联系对象、开展访谈和追问。
- 记录整理：${smallTeam ? "1 人兼资料整理" : "1-2 人"}，负责访谈纪要、观察记录和资料库录入。
- 资料整理：${smallTeam ? "与记录角色合并" : "1 人"}，负责政策、新闻、日志等文本资料整理。
- 摄影宣传：${smallTeam ? "由团队成员轮流承担" : "1 人"}，负责合规拍摄和实践日志素材。
- 报告写作：${smallTeam ? "由全组共同完成，指定 1 人统稿" : "1-2 人"}，负责报告大纲、初稿和展示材料。

## 八、预期成果
结合用户填写的预期成果，本项目应形成：${project.expectedOutcome}。

建议同步沉淀访谈纪要、实践日志、资料库摘要、调研照片说明、答辩展示素材和后续报告大纲。

## 九、风险与伦理预案
- 访谈同意：访谈前说明团队身份、调研目的、使用范围和预计时长。
- 匿名处理：涉及个人经历、基层治理、民族地区、社区事务等内容时，避免记录可识别个人隐私的信息。
- 敏感表达：对争议、困难或不满意内容使用中性问法，例如“推进过程中有哪些需要协调的地方”。
- 资料保密：内部材料、未公开信息和个人联系方式不得直接进入公开报告。
- 行程安全：每日确认路线、集合时间和应急联系人，避免单人前往陌生地点。

## 十、材料补充清单
- 地方政策文件或公开工作材料。
- 访谈对象类型、名单和联系确认情况。
- 实践日程、交通和场地安排确认。
- 指导教师对报告结构、材料规范和伦理边界的要求。
- 可用于报告的照片、日志、访谈纪要和资料来源记录。`;
}

function buildScheduleDays(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return ["第1天", "第2天", "第3天", "第4天", "第5天", "第6天"];
  }

  const days: string[] = [];
  const current = new Date(start);
  while (current <= end && days.length < 7) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return days.length ? days : ["第1天", "第2天", "第3天", "第4天", "第5天", "第6天"];
}
