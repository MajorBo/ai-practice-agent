export type ProjectInput = {
  name: string;
  practiceType: string;
  theme: string;
  location: string;
  startDate: string;
  endDate: string;
  teamSize: number;
  expectedOutcome: string;
  requirements?: string;
};

export type TopicCandidate = {
  title: string;
  researchQuestion: string;
  interviewTargets: string[];
  methods: string[];
  feasibilityScore: number;
  innovationScore: number;
  difficulty: "低" | "中" | "高";
  reason: string;
};

export type ResearchPlanPayload = {
  project: ProjectInput & { id: string };
  selectedTopic: TopicCandidate;
};

export type InterviewTargetType =
  | "基层干部"
  | "村干部/社区干部"
  | "驻村干部"
  | "普通群众"
  | "政府工作人员"
  | "专家学者"
  | "自定义对象";

export type InterviewOutlineForm = {
  targetType: InterviewTargetType;
  customTarget: string;
  durationMinutes: number;
  hasSensitiveTopics: boolean;
  focusQuestions: string;
};

export type InterviewOutline = {
  opening: string;
  basicQuestions: string[];
  coreQuestions: string[];
  followUps: string[];
  sensitiveAlternatives: string[];
  closing: string;
  noteTips: string[];
};

export type MaterialType = "访谈文本" | "政策文件" | "实践日志" | "新闻资料" | "其他";

export type MaterialItem = {
  id: string;
  title: string;
  type: MaterialType;
  source: string;
  content: string;
  tags: string[];
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type MaterialForm = {
  title: string;
  type: MaterialType;
  source: string;
  content: string;
  tags: string;
};

export type MaterialSummary = {
  contentSummary: string;
  keywords: string[];
  reportPoints: string[];
  relatedResearchQuestions: string[];
  gaps: string[];
};

export type InterviewNoteForm = {
  sourceMaterialId: string;
  rawText: string;
  intervieweeIdentity: string;
  interviewTime: string;
  interviewLocation: string;
  interviewTopic: string;
  isAnonymous: boolean;
};

export type InterviewNote = {
  id: string;
  form: InterviewNoteForm;
  markdown: string;
  createdAt: string;
  updatedAt: string;
};

export type InterviewNoteSummary = {
  basicInfo: string[];
  coreSummary: string;
  keyFacts: string[];
  importantViews: string[];
  cases: string[];
  quotes: string[];
  researchLinks: string[];
  followUpSuggestions: string[];
};

export type ReportOutline = {
  markdown: string;
  savedAt: string;
};

export type ProjectRecord = ProjectInput & {
  id: string;
  stage: string;
  topics: TopicCandidate[] | null;
  selectedTopic: TopicCandidate | null;
  researchPlan: string | null;
  createdAt: string;
  updatedAt: string;
};
