"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { BookOpen, Bot, CheckCircle2, FileText, Lightbulb, Loader2, MessagesSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  InterviewOutline,
  InterviewOutlineForm,
  InterviewTargetType,
  MaterialForm,
  MaterialItem,
  MaterialSummary,
  MaterialType,
  ProjectRecord,
  TopicCandidate
} from "@/lib/types";

const targetTypes: InterviewTargetType[] = ["基层干部", "村干部/社区干部", "驻村干部", "普通群众", "政府工作人员", "专家学者", "自定义对象"];
const materialTypes: MaterialType[] = ["访谈文本", "政策文件", "实践日志", "新闻资料", "其他"];

type ModuleKey = "topics" | "plan" | "interview" | "materials";

const defaultInterviewForm: InterviewOutlineForm = {
  targetType: "基层干部",
  customTarget: "",
  durationMinutes: 45,
  hasSensitiveTopics: false,
  focusQuestions: ""
};

const emptyMaterialForm: MaterialForm = {
  title: "",
  type: "访谈文本",
  source: "",
  content: "",
  tags: ""
};

export default function ProjectWorkspacePage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>("topics");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [planDraft, setPlanDraft] = useState("");
  const [interviewForm, setInterviewForm] = useState<InterviewOutlineForm>(defaultInterviewForm);
  const [interviewDraft, setInterviewDraft] = useState("");
  const [interviewSavedAt, setInterviewSavedAt] = useState("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [materialForm, setMaterialForm] = useState<MaterialForm>(emptyMaterialForm);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  const interviewStorageKey = `interview-outline:${params.id}`;
  const materialsStorageKey = `materials-library:${params.id}`;

  async function loadProject() {
    setError("");
    const response = await fetch(`/api/projects/${params.id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "项目加载失败");
    }

    setProject(data);
    setPlanDraft(data.researchPlan || "");
    if (data.selectedTopic) setActiveModule("plan");
  }

  useEffect(() => {
    loadProject()
      .catch((err) => setError(err instanceof Error ? err.message : "项目加载失败"))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    const saved = window.localStorage.getItem(interviewStorageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { form?: InterviewOutlineForm; markdown?: string; savedAt?: string };
      if (parsed.form) setInterviewForm(parsed.form);
      if (parsed.markdown) setInterviewDraft(parsed.markdown);
      if (parsed.savedAt) setInterviewSavedAt(parsed.savedAt);
    } catch {
      window.localStorage.removeItem(interviewStorageKey);
    }
  }, [interviewStorageKey]);

  useEffect(() => {
    const saved = window.localStorage.getItem(materialsStorageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as MaterialItem[];
      setMaterials(parsed);
      setSelectedMaterialId(parsed[0]?.id || null);
    } catch {
      window.localStorage.removeItem(materialsStorageKey);
    }
  }, [materialsStorageKey]);

  const projectInput = useMemo(() => {
    if (!project) return [];
    return [
      ["实践类型", project.practiceType],
      ["实践主题", project.theme],
      ["实践地点", project.location],
      ["实践时间", `${project.startDate.slice(0, 10)} 至 ${project.endDate.slice(0, 10)}`],
      ["团队人数", `${project.teamSize} 人`],
      ["预期成果", project.expectedOutcome]
    ];
  }, [project]);

  const selectedMaterial = materials.find((item) => item.id === selectedMaterialId) || null;

  function saveMaterials(nextMaterials: MaterialItem[], nextSelectedId = selectedMaterialId) {
    setMaterials(nextMaterials);
    window.localStorage.setItem(materialsStorageKey, JSON.stringify(nextMaterials));
    if (nextSelectedId !== selectedMaterialId) setSelectedMaterialId(nextSelectedId);
  }

  async function runAction(endpoint: string, loadingLabel: string, body?: unknown) {
    setActionLoading(loadingLabel);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "操作失败");
      }

      setProject(data);
      setPlanDraft(data.researchPlan || "");
      if (data.selectedTopic) setActiveModule("plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading("");
    }
  }

  function generateTopics() {
    runAction(`/api/projects/${params.id}/topics`, "topics");
  }

  function selectTopic(topic: TopicCandidate) {
    runAction(`/api/projects/${params.id}/select-topic`, "select-topic", { topic });
  }

  function generatePlan() {
    runAction(`/api/projects/${params.id}/plan`, "plan");
  }

  async function savePlan() {
    setActionLoading("save-plan");
    setError("");

    try {
      const response = await fetch(`/api/projects/${params.id}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: planDraft })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "方案保存失败");
      }

      setProject(data);
      setPlanDraft(data.researchPlan || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案保存失败");
    } finally {
      setActionLoading("");
    }
  }

  function generateInterviewOutline() {
    if (!project) return;
    setActionLoading("interview");
    const outline = mockInterviewOutline(project, interviewForm);
    const markdown = interviewOutlineToMarkdown(outline);
    setInterviewDraft(markdown);
    saveInterviewOutline(markdown, interviewForm);
    setActionLoading("");
  }

  function saveInterviewOutline(markdown = interviewDraft, form = interviewForm) {
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(interviewStorageKey, JSON.stringify({ form, markdown, savedAt }));
    setInterviewSavedAt(savedAt);
  }

  function submitMaterial() {
    if (!materialForm.title.trim() || !materialForm.content.trim()) {
      setError("请填写资料标题和资料正文");
      return;
    }

    const now = new Date().toISOString();
    const tags = materialForm.tags
      .split(/[，,]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (editingMaterialId) {
      const nextMaterials = materials.map((item) =>
        item.id === editingMaterialId
          ? {
              ...item,
              title: materialForm.title.trim(),
              type: materialForm.type,
              source: materialForm.source.trim(),
              content: materialForm.content.trim(),
              tags,
              updatedAt: now
            }
          : item
      );
      saveMaterials(nextMaterials, editingMaterialId);
    } else {
      const material: MaterialItem = {
        id: crypto.randomUUID(),
        title: materialForm.title.trim(),
        type: materialForm.type,
        source: materialForm.source.trim(),
        content: materialForm.content.trim(),
        tags,
        summary: "",
        createdAt: now,
        updatedAt: now
      };
      saveMaterials([material, ...materials], material.id);
    }

    setMaterialForm(emptyMaterialForm);
    setEditingMaterialId(null);
    setError("");
  }

  function editMaterial(material: MaterialItem) {
    setEditingMaterialId(material.id);
    setSelectedMaterialId(material.id);
    setMaterialForm({
      title: material.title,
      type: material.type,
      source: material.source,
      content: material.content,
      tags: material.tags.join("，")
    });
  }

  function deleteMaterial(id: string) {
    const nextMaterials = materials.filter((item) => item.id !== id);
    const nextSelectedId = selectedMaterialId === id ? nextMaterials[0]?.id || null : selectedMaterialId;
    saveMaterials(nextMaterials, nextSelectedId);
    if (editingMaterialId === id) {
      setEditingMaterialId(null);
      setMaterialForm(emptyMaterialForm);
    }
  }

  function generateMaterialSummary(material: MaterialItem) {
    if (!project) return;
    const summary = materialSummaryToMarkdown(mockMaterialSummary(project, material));
    const nextMaterials = materials.map((item) => (item.id === material.id ? { ...item, summary, updatedAt: new Date().toISOString() } : item));
    saveMaterials(nextMaterials, material.id);
  }

  if (loading) {
    return <main className="p-8 text-muted-foreground">正在加载工作台...</main>;
  }

  if (!project) {
    return (
      <main className="p-8">
        <p className="text-destructive">{error || "项目不存在"}</p>
        <Link className="mt-4 inline-block text-primary hover:underline" href="/projects">
          返回项目列表
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6">
      <div className="mx-auto mb-5 flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <Link className="text-sm text-primary hover:underline" href="/projects">
            返回项目列表
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">当前阶段：{project.stage}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[220px_1fr_280px]">
        <aside className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>流程导航</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <NavButton active={activeModule === "topics"} onClick={() => setActiveModule("topics")}>
                <Lightbulb className="h-4 w-4" /> 选题设计
              </NavButton>
              <NavButton active={activeModule === "plan"} onClick={() => setActiveModule("plan")}>
                <FileText className="h-4 w-4" /> 调研方案
              </NavButton>
              <NavButton active={activeModule === "interview"} onClick={() => setActiveModule("interview")}>
                <MessagesSquare className="h-4 w-4" /> 访谈提纲
              </NavButton>
              <NavButton active={activeModule === "materials"} onClick={() => setActiveModule("materials")}>
                <BookOpen className="h-4 w-4" /> 资料库
              </NavButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>项目信息</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {projectInput.map(([label, value]) => (
                <div key={label}>
                  <p className="text-muted-foreground">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="min-w-0">
          {error ? <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          {activeModule === "topics" ? <TopicModule loading={actionLoading} onGenerate={generateTopics} onSelect={selectTopic} project={project} /> : null}
          {activeModule === "plan" ? <PlanModule loading={actionLoading} onGenerate={generatePlan} onSave={savePlan} planDraft={planDraft} project={project} setPlanDraft={setPlanDraft} /> : null}
          {activeModule === "interview" ? (
            <InterviewModule form={interviewForm} loading={actionLoading} onFormChange={setInterviewForm} onGenerate={generateInterviewOutline} onSave={() => saveInterviewOutline()} outlineDraft={interviewDraft} savedAt={interviewSavedAt} setOutlineDraft={setInterviewDraft} />
          ) : null}
          {activeModule === "materials" ? (
            <MaterialsModule
              editingMaterialId={editingMaterialId}
              form={materialForm}
              materials={materials}
              onCancelEdit={() => {
                setEditingMaterialId(null);
                setMaterialForm(emptyMaterialForm);
              }}
              onDelete={deleteMaterial}
              onEdit={editMaterial}
              onFormChange={setMaterialForm}
              onGenerateSummary={generateMaterialSummary}
              onSelect={setSelectedMaterialId}
              onSubmit={submitMaterial}
              selectedMaterial={selectedMaterial}
              selectedMaterialId={selectedMaterialId}
            />
          ) : null}
        </section>

        <aside>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" /> AI助手
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>当前支持：生成候选选题、调研方案、访谈提纲和资料 mock 摘要。</p>
              <p>资料库暂时只管理文本资料，保存在浏览器本地存储。</p>
              <p>未配置 OPENAI_API_KEY 时，选题和方案会自动使用 mock 数据。</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function NavButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function TopicModule({ loading, onGenerate, onSelect, project }: { loading: string; onGenerate: () => void; onSelect: (topic: TopicCandidate) => void; project: ProjectRecord }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>选题设计</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">生成 5 个候选选题，并选择一个作为主选题。</p>
        </div>
        <Button disabled={Boolean(loading)} onClick={onGenerate}>{loading === "topics" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}生成5个候选选题</Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {project.topics?.map((topic) => {
          const selected = project.selectedTopic?.title === topic.title;
          return (
            <div className="rounded-lg border bg-background p-4" key={topic.title}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{topic.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{topic.researchQuestion}</p>
                </div>
                <Button disabled={Boolean(loading) || selected} onClick={() => onSelect(topic)} variant={selected ? "default" : "outline"}>{selected ? <><CheckCircle2 className="mr-2 h-4 w-4" /> 已选为主选题</> : "选择为主选题"}</Button>
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <p><span className="font-medium">访谈对象：</span>{topic.interviewTargets.join("、")}</p>
                <p><span className="font-medium">方法：</span>{topic.methods.join("、")}</p>
                <p><span className="font-medium">可行性：</span>{topic.feasibilityScore}/10</p>
                <p><span className="font-medium">创新性：</span>{topic.innovationScore}/10</p>
                <p><span className="font-medium">难度：</span>{topic.difficulty}</p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{topic.reason}</p>
            </div>
          );
        })}
        {!project.topics?.length ? <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">点击按钮生成候选选题，系统会优先调用 AI，没有 key 时返回 mock 数据。</div> : null}
      </CardContent>
    </Card>
  );
}

function PlanModule({ loading, onGenerate, onSave, planDraft, project, setPlanDraft }: { loading: string; onGenerate: () => void; onSave: () => void; planDraft: string; project: ProjectRecord; setPlanDraft: (value: string) => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div><CardTitle>调研方案</CardTitle><p className="mt-2 text-sm text-muted-foreground">基于主选题生成 Markdown 方案，并在右侧预览。</p></div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={Boolean(loading) || !project.selectedTopic || !planDraft} onClick={onSave} variant="outline">{loading === "save-plan" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}保存编辑</Button>
          <Button disabled={Boolean(loading) || !project.selectedTopic} onClick={onGenerate}>{loading === "plan" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}生成并保存方案</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        {!project.selectedTopic ? <div className="xl:col-span-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">请先在“选题设计”中选择一个主选题。</div> : <><div><p className="mb-2 text-sm font-medium">Markdown 编辑</p><Textarea className="min-h-[520px] font-mono" onChange={(event) => setPlanDraft(event.target.value)} value={planDraft} /></div><div><p className="mb-2 text-sm font-medium">方案预览</p><div className="markdown-preview min-h-[520px] rounded-md border bg-background p-4 text-sm">{planDraft ? <ReactMarkdown>{planDraft}</ReactMarkdown> : <p className="text-muted-foreground">生成后将在这里预览。</p>}</div></div></>}
      </CardContent>
    </Card>
  );
}

function InterviewModule({ form, loading, onFormChange, onGenerate, onSave, outlineDraft, savedAt, setOutlineDraft }: { form: InterviewOutlineForm; loading: string; onFormChange: (form: InterviewOutlineForm) => void; onGenerate: () => void; onSave: () => void; outlineDraft: string; savedAt: string; setOutlineDraft: (value: string) => void }) {
  function updateForm<K extends keyof InterviewOutlineForm>(key: K, value: InterviewOutlineForm[K]) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div><CardTitle>访谈提纲</CardTitle><p className="mt-2 text-sm text-muted-foreground">选择访谈对象并填写约束，生成可编辑的结构化访谈提纲。</p></div>
        <div className="flex flex-wrap gap-2"><Button disabled={Boolean(loading) || !outlineDraft} onClick={onSave} variant="outline">保存提纲</Button><Button disabled={Boolean(loading)} onClick={onGenerate}>{loading === "interview" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}生成访谈提纲</Button></div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>访谈对象类型</Label><select className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" onChange={(event) => updateForm("targetType", event.target.value as InterviewTargetType)} value={form.targetType}>{targetTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
          <div className="grid gap-2"><Label>访谈时长（分钟）</Label><input className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" min={10} onChange={(event) => updateForm("durationMinutes", Number(event.target.value))} type="number" value={form.durationMinutes} /></div>
          {form.targetType === "自定义对象" ? <div className="grid gap-2 md:col-span-2"><Label>自定义对象</Label><input className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" onChange={(event) => updateForm("customTarget", event.target.value)} placeholder="如：返乡创业青年、非遗传承人、合作社负责人" value={form.customTarget} /></div> : null}
          <label className="flex items-center gap-2 text-sm font-medium"><input checked={form.hasSensitiveTopics} className="h-4 w-4" onChange={(event) => updateForm("hasSensitiveTopics", event.target.checked)} type="checkbox" />涉及敏感议题</label>
          <div className="grid gap-2 md:col-span-2"><Label>希望重点了解的问题</Label><Textarea onChange={(event) => updateForm("focusQuestions", event.target.value)} placeholder="例如：政策落地难点、群众真实感受、项目可持续性、资源协同机制等" value={form.focusQuestions} /></div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2"><div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">提纲编辑</p>{savedAt ? <p className="text-xs text-muted-foreground">已保存：{new Date(savedAt).toLocaleString("zh-CN")}</p> : null}</div><Textarea className="min-h-[520px] font-mono" onChange={(event) => setOutlineDraft(event.target.value)} value={outlineDraft} /></div><div><p className="mb-2 text-sm font-medium">提纲预览</p><div className="markdown-preview min-h-[520px] rounded-md border bg-background p-4 text-sm">{outlineDraft ? <ReactMarkdown>{outlineDraft}</ReactMarkdown> : <p className="text-muted-foreground">生成后将在这里预览。</p>}</div></div></div>
      </CardContent>
    </Card>
  );
}

function MaterialsModule({ editingMaterialId, form, materials, onCancelEdit, onDelete, onEdit, onFormChange, onGenerateSummary, onSelect, onSubmit, selectedMaterial, selectedMaterialId }: { editingMaterialId: string | null; form: MaterialForm; materials: MaterialItem[]; onCancelEdit: () => void; onDelete: (id: string) => void; onEdit: (material: MaterialItem) => void; onFormChange: (form: MaterialForm) => void; onGenerateSummary: (material: MaterialItem) => void; onSelect: (id: string) => void; onSubmit: () => void; selectedMaterial: MaterialItem | null; selectedMaterialId: string | null }) {
  function updateForm<K extends keyof MaterialForm>(key: K, value: MaterialForm[K]) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>资料库</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">用文本表单管理资料，暂不做文件上传、解析和真实 AI 摘要。</p>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>资料标题</Label><input className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" onChange={(event) => updateForm("title", event.target.value)} value={form.title} /></div>
          <div className="grid gap-2"><Label>资料类型</Label><select className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" onChange={(event) => updateForm("type", event.target.value as MaterialType)} value={form.type}>{materialTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
          <div className="grid gap-2"><Label>资料来源</Label><input className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" onChange={(event) => updateForm("source", event.target.value)} placeholder="如：访谈对象、官网链接、新闻来源" value={form.source} /></div>
          <div className="grid gap-2"><Label>标签</Label><input className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" onChange={(event) => updateForm("tags", event.target.value)} placeholder="用逗号分隔，如：政策，基层治理" value={form.tags} /></div>
          <div className="grid gap-2 md:col-span-2"><Label>资料正文</Label><Textarea className="min-h-[180px]" onChange={(event) => updateForm("content", event.target.value)} value={form.content} /></div>
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2"><Button onClick={onSubmit}>{editingMaterialId ? "保存修改" : "新增资料"}</Button>{editingMaterialId ? <Button onClick={onCancelEdit} variant="outline">取消编辑</Button> : null}</div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border bg-background p-4">
            <h3 className="mb-3 text-base font-semibold">资料列表</h3>
            <div className="grid gap-3">
              {materials.map((material) => (
                <button className={`rounded-md border p-3 text-left text-sm ${selectedMaterialId === material.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"}`} key={material.id} onClick={() => onSelect(material.id)} type="button">
                  <div className="flex items-start justify-between gap-3"><p className="font-semibold">{material.title}</p><span className="text-xs text-muted-foreground">{material.type}</span></div>
                  <p className="mt-2 text-xs text-muted-foreground">{material.tags.length ? material.tags.join("、") : "暂无标签"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">创建：{new Date(material.createdAt).toLocaleString("zh-CN")}</p>
                </button>
              ))}
              {!materials.length ? <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">还没有资料，先新增一份文本资料。</div> : null}
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h3 className="mb-3 text-base font-semibold">资料详情</h3>
            {selectedMaterial ? (
              <div className="grid gap-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-lg font-semibold">{selectedMaterial.title}</h4><p className="text-muted-foreground">{selectedMaterial.type} ｜ 来源：{selectedMaterial.source || "未填写"}</p></div><div className="flex gap-2"><Button onClick={() => onEdit(selectedMaterial)} variant="outline">编辑</Button><Button onClick={() => onDelete(selectedMaterial.id)} variant="outline"><Trash2 className="mr-2 h-4 w-4" />删除</Button></div></div>
                <p><span className="font-medium">标签：</span>{selectedMaterial.tags.length ? selectedMaterial.tags.join("、") : "暂无标签"}</p>
                <div><p className="mb-2 font-medium">正文</p><div className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-card p-3 leading-6">{selectedMaterial.content}</div></div>
                <div className="flex justify-end"><Button onClick={() => onGenerateSummary(selectedMaterial)}>生成摘要</Button></div>
                <div><p className="mb-2 font-medium">mock 摘要</p><div className="markdown-preview min-h-56 rounded-md border bg-card p-3">{selectedMaterial.summary ? <ReactMarkdown>{selectedMaterial.summary}</ReactMarkdown> : <p className="text-muted-foreground">点击“生成摘要”后显示结构化 mock 摘要。</p>}</div></div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">选择左侧资料后查看详情。</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function mockInterviewOutline(project: ProjectRecord, form: InterviewOutlineForm): InterviewOutline {
  const target = form.targetType === "自定义对象" ? form.customTarget || "自定义对象" : form.targetType;
  const focus = form.focusQuestions || `围绕${project.theme}了解实际情况、主要困难和改进建议。`;
  return {
    opening: `您好，我们是“${project.name}”社会实践团队，正在${project.location}围绕“${project.theme}”开展调研。本次访谈预计约 ${form.durationMinutes} 分钟，内容仅用于实践研究分析，我们会尊重您的真实表达并做好信息保护。`,
    basicQuestions: [`请您简单介绍一下自己的工作/生活背景，以及与“${project.theme}”相关的经历。`, `您平时接触${project.theme}相关事务的频率高吗？主要通过哪些渠道了解？`, "在您看来，近几年当地相关工作或生活环境发生了哪些变化？"],
    coreQuestions: [`围绕“${focus}”，您认为最值得关注的问题是什么？`, `从${target}的视角看，目前最明显的成效和不足分别是什么？`, "哪些主体在其中发挥了关键作用？他们之间的协同是否顺畅？", "如果要让相关工作更可持续，您认为最需要优先改进的是什么？"],
    followUps: ["您刚才提到的这个现象，有没有具体案例可以展开说说？", "这个问题大概从什么时候开始变得明显？背后可能有哪些原因？", "不同群体对这件事的看法是否一致？分歧主要在哪里？", "如果资源有限，您觉得最先应该做哪一件事？为什么？"],
    sensitiveAlternatives: form.hasSensitiveTopics ? ["将“是否存在矛盾/冲突”替换为“推进过程中有哪些需要协调的地方”。", "将“责任在谁”替换为“哪些环节还有进一步优化空间”。", "将“群众是否不满意”替换为“大家反馈比较集中的期待是什么”。"] : ["本次访谈未标记敏感议题。如现场出现敏感内容，可使用更中性的描述方式继续追问。"],
    closing: "非常感谢您的分享。后续我们会对访谈内容进行整理归纳，如有需要补充或核对的信息，也希望能再次向您请教。",
    noteTips: ["记录原话中的关键词、具体案例、时间地点和涉及主体。", "区分事实描述、个人判断和改进建议，避免混在一起。", "敏感内容只记录研究必要信息，避免记录可识别个人隐私的细节。", "访谈结束后 30 分钟内补充现场观察和访谈员感受。"]
  };
}

function interviewOutlineToMarkdown(outline: InterviewOutline) {
  return `# 访谈提纲

## 开场白
${outline.opening}

## 基础信息问题
${outline.basicQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 核心问题
${outline.coreQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 深度追问
${outline.followUps.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 敏感问题替代表达
${outline.sensitiveAlternatives.map((item) => `- ${item}`).join("\n")}

## 结束语
${outline.closing}

## 记录提示
${outline.noteTips.map((item) => `- ${item}`).join("\n")}`;
}

function mockMaterialSummary(project: ProjectRecord, material: MaterialItem): MaterialSummary {
  const text = material.content.replace(/\s+/g, " ").trim();
  const shortText = text.length > 120 ? `${text.slice(0, 120)}...` : text;
  const keywords = Array.from(new Set([...material.tags, project.theme, material.type, project.location].filter(Boolean))).slice(0, 6);
  return {
    contentSummary: `${material.title}主要围绕${project.theme}展开，材料来自“${material.source || "未填写来源"}”。核心内容可概括为：${shortText || "暂无正文"}`,
    keywords,
    reportPoints: [`可用于说明${project.location}在“${project.theme}”方面的实际情况。`, `可作为“${material.type}”类材料支撑调研发现。`, "可提炼为报告中的案例、问题表现或一线反馈。"],
    relatedResearchQuestions: project.selectedTopic ? [project.selectedTopic.researchQuestion, `该材料如何支撑主选题“${project.selectedTopic.title}”？`] : [`该材料反映了${project.theme}中的哪些关键问题？`, "材料中的事实能否转化为后续访谈或问卷问题？"],
    gaps: ["当前摘要为 mock 结果，未做真实语义抽取。", "建议补充时间、地点、对象和可核验来源。", "如用于报告，应继续提炼直接引语、数据或典型案例。"]
  };
}

function materialSummaryToMarkdown(summary: MaterialSummary) {
  return `## 内容摘要
${summary.contentSummary}

## 关键词
${summary.keywords.map((item) => `- ${item}`).join("\n")}

## 可用于报告的材料点
${summary.reportPoints.map((item) => `- ${item}`).join("\n")}

## 关联研究问题
${summary.relatedResearchQuestions.map((item) => `- ${item}`).join("\n")}

## 材料不足提示
${summary.gaps.map((item) => `- ${item}`).join("\n")}`;
}
