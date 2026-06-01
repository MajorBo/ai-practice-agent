"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { BookOpen, Bot, CheckCircle2, ClipboardList, FileText, Lightbulb, Loader2, MessagesSquare, ScrollText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  InterviewOutline,
  InterviewOutlineForm,
  InterviewNote,
  InterviewNoteForm,
  InterviewNoteSummary,
  InterviewTargetType,
  MaterialForm,
  MaterialItem,
  MaterialSummary,
  MaterialType,
  ProjectRecord,
  ReportOutline,
  TopicCandidate
} from "@/lib/types";

const targetTypes: InterviewTargetType[] = ["基层干部", "村干部/社区干部", "驻村干部", "普通群众", "政府工作人员", "专家学者", "自定义对象"];
const materialTypes: MaterialType[] = ["访谈文本", "政策文件", "实践日志", "新闻资料", "其他"];

type ModuleKey = "topics" | "plan" | "interview" | "materials" | "notes" | "outline";

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

const emptyInterviewNoteForm: InterviewNoteForm = {
  sourceMaterialId: "",
  rawText: "",
  intervieweeIdentity: "",
  interviewTime: "",
  interviewLocation: "",
  interviewTopic: "",
  isAnonymous: false
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
  const [interviewNotes, setInterviewNotes] = useState<InterviewNote[]>([]);
  const [interviewNoteForm, setInterviewNoteForm] = useState<InterviewNoteForm>(emptyInterviewNoteForm);
  const [interviewNoteDraft, setInterviewNoteDraft] = useState("");
  const [editingInterviewNoteId, setEditingInterviewNoteId] = useState<string | null>(null);
  const [selectedInterviewNoteId, setSelectedInterviewNoteId] = useState<string | null>(null);
  const [reportOutline, setReportOutline] = useState<ReportOutline | null>(null);
  const [reportOutlineDraft, setReportOutlineDraft] = useState("");

  const interviewStorageKey = `interview-outline:${params.id}`;
  const materialsStorageKey = `materials-library:${params.id}`;
  const interviewNotesStorageKey = `interview-notes:${params.id}`;
  const reportOutlineStorageKey = `report-outline:${params.id}`;

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

  useEffect(() => {
    const saved = window.localStorage.getItem(interviewNotesStorageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as InterviewNote[];
      setInterviewNotes(parsed);
      setSelectedInterviewNoteId(parsed[0]?.id || null);
    } catch {
      window.localStorage.removeItem(interviewNotesStorageKey);
    }
  }, [interviewNotesStorageKey]);

  useEffect(() => {
    const saved = window.localStorage.getItem(reportOutlineStorageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as ReportOutline;
      setReportOutline(parsed);
      setReportOutlineDraft(parsed.markdown || "");
    } catch {
      window.localStorage.removeItem(reportOutlineStorageKey);
    }
  }, [reportOutlineStorageKey]);

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
  const selectedInterviewNote = interviewNotes.find((item) => item.id === selectedInterviewNoteId) || null;
  const interviewTextMaterials = materials.filter((item) => item.type === "访谈文本");

  function saveMaterials(nextMaterials: MaterialItem[], nextSelectedId = selectedMaterialId) {
    setMaterials(nextMaterials);
    window.localStorage.setItem(materialsStorageKey, JSON.stringify(nextMaterials));
    if (nextSelectedId !== selectedMaterialId) setSelectedMaterialId(nextSelectedId);
  }

  function saveInterviewNotes(nextNotes: InterviewNote[], nextSelectedId = selectedInterviewNoteId) {
    setInterviewNotes(nextNotes);
    window.localStorage.setItem(interviewNotesStorageKey, JSON.stringify(nextNotes));
    if (nextSelectedId !== selectedInterviewNoteId) setSelectedInterviewNoteId(nextSelectedId);
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

  function selectInterviewTextMaterial(materialId: string) {
    const material = materials.find((item) => item.id === materialId);
    setInterviewNoteForm((current) => ({
      ...current,
      sourceMaterialId: materialId,
      rawText: material?.content || current.rawText,
      interviewTopic: current.interviewTopic || material?.title || ""
    }));
  }

  function generateInterviewNote() {
    if (!project) return;
    if (!interviewNoteForm.rawText.trim()) {
      setError("请选择访谈文本资料或手动粘贴访谈文本");
      return;
    }
    if (!interviewNoteForm.intervieweeIdentity.trim() || !interviewNoteForm.interviewTopic.trim()) {
      setError("请填写访谈对象身份和访谈主题");
      return;
    }

    const markdown = interviewNoteSummaryToMarkdown(mockInterviewNoteSummary(project, interviewNoteForm));
    const now = new Date().toISOString();

    if (editingInterviewNoteId) {
      const nextNotes = interviewNotes.map((note) =>
        note.id === editingInterviewNoteId
          ? {
              ...note,
              form: interviewNoteForm,
              markdown,
              updatedAt: now
            }
          : note
      );
      saveInterviewNotes(nextNotes, editingInterviewNoteId);
    } else {
      const note: InterviewNote = {
        id: crypto.randomUUID(),
        form: interviewNoteForm,
        markdown,
        createdAt: now,
        updatedAt: now
      };
      saveInterviewNotes([note, ...interviewNotes], note.id);
      setEditingInterviewNoteId(note.id);
    }

    setInterviewNoteDraft(markdown);
    setError("");
  }

  function saveInterviewNoteDraft() {
    if (!interviewNoteDraft.trim()) {
      setError("请先生成或填写访谈纪要内容");
      return;
    }

    const now = new Date().toISOString();
    if (editingInterviewNoteId) {
      const nextNotes = interviewNotes.map((note) =>
        note.id === editingInterviewNoteId
          ? {
              ...note,
              form: interviewNoteForm,
              markdown: interviewNoteDraft,
              updatedAt: now
            }
          : note
      );
      saveInterviewNotes(nextNotes, editingInterviewNoteId);
    } else {
      const note: InterviewNote = {
        id: crypto.randomUUID(),
        form: interviewNoteForm,
        markdown: interviewNoteDraft,
        createdAt: now,
        updatedAt: now
      };
      saveInterviewNotes([note, ...interviewNotes], note.id);
      setEditingInterviewNoteId(note.id);
    }
    setError("");
  }

  function newInterviewNote() {
    setInterviewNoteForm(emptyInterviewNoteForm);
    setInterviewNoteDraft("");
    setEditingInterviewNoteId(null);
  }

  function editInterviewNote(note: InterviewNote) {
    setSelectedInterviewNoteId(note.id);
    setEditingInterviewNoteId(note.id);
    setInterviewNoteForm(note.form);
    setInterviewNoteDraft(note.markdown);
  }

  function deleteInterviewNote(id: string) {
    const nextNotes = interviewNotes.filter((note) => note.id !== id);
    const nextSelectedId = selectedInterviewNoteId === id ? nextNotes[0]?.id || null : selectedInterviewNoteId;
    saveInterviewNotes(nextNotes, nextSelectedId);
    if (editingInterviewNoteId === id) {
      newInterviewNote();
    }
  }

  function saveReportOutline(markdown = reportOutlineDraft) {
    if (!markdown.trim()) {
      setError("请先生成或填写报告大纲");
      return;
    }
    const nextOutline = {
      markdown,
      savedAt: new Date().toISOString()
    };
    setReportOutline(nextOutline);
    setReportOutlineDraft(markdown);
    window.localStorage.setItem(reportOutlineStorageKey, JSON.stringify(nextOutline));
    setError("");
  }

  function generateReportOutline() {
    if (!project) return;
    const markdown = mockReportOutline(project, materials, interviewNotes);
    saveReportOutline(markdown);
  }

  function deleteReportOutline() {
    setReportOutline(null);
    setReportOutlineDraft("");
    window.localStorage.removeItem(reportOutlineStorageKey);
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
              <NavButton active={activeModule === "notes"} onClick={() => setActiveModule("notes")}>
                <ClipboardList className="h-4 w-4" /> 访谈纪要
              </NavButton>
              <NavButton active={activeModule === "outline"} onClick={() => setActiveModule("outline")}>
                <ScrollText className="h-4 w-4" /> 报告大纲
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
          {activeModule === "notes" ? (
            <InterviewNotesModule
              editingNoteId={editingInterviewNoteId}
              form={interviewNoteForm}
              interviewTextMaterials={interviewTextMaterials}
              notes={interviewNotes}
              noteDraft={interviewNoteDraft}
              onDelete={deleteInterviewNote}
              onEdit={editInterviewNote}
              onFormChange={setInterviewNoteForm}
              onGenerate={generateInterviewNote}
              onNew={newInterviewNote}
              onSave={saveInterviewNoteDraft}
              onSelect={setSelectedInterviewNoteId}
              onSelectMaterial={selectInterviewTextMaterial}
              selectedNote={selectedInterviewNote}
              selectedNoteId={selectedInterviewNoteId}
              setNoteDraft={setInterviewNoteDraft}
            />
          ) : null}
          {activeModule === "outline" ? (
            <ReportOutlineModule
              hasPlan={Boolean(project.researchPlan)}
              hasTopic={Boolean(project.selectedTopic)}
              interviewNoteCount={interviewNotes.length}
              materialCount={materials.length}
              onDelete={deleteReportOutline}
              onGenerate={generateReportOutline}
              onSave={() => saveReportOutline()}
              outlineDraft={reportOutlineDraft}
              savedAt={reportOutline?.savedAt || ""}
              setOutlineDraft={setReportOutlineDraft}
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
              <p>当前支持：生成候选选题、调研方案、访谈提纲、资料 mock 摘要、访谈纪要和报告大纲。</p>
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

function InterviewNotesModule({
  editingNoteId,
  form,
  interviewTextMaterials,
  notes,
  noteDraft,
  onDelete,
  onEdit,
  onFormChange,
  onGenerate,
  onNew,
  onSave,
  onSelect,
  onSelectMaterial,
  selectedNote,
  selectedNoteId,
  setNoteDraft
}: {
  editingNoteId: string | null;
  form: InterviewNoteForm;
  interviewTextMaterials: MaterialItem[];
  notes: InterviewNote[];
  noteDraft: string;
  onDelete: (id: string) => void;
  onEdit: (note: InterviewNote) => void;
  onFormChange: (form: InterviewNoteForm) => void;
  onGenerate: () => void;
  onNew: () => void;
  onSave: () => void;
  onSelect: (id: string) => void;
  onSelectMaterial: (id: string) => void;
  selectedNote: InterviewNote | null;
  selectedNoteId: string | null;
  setNoteDraft: (value: string) => void;
}) {
  function updateForm<K extends keyof InterviewNoteForm>(key: K, value: InterviewNoteForm[K]) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>访谈纪要</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">从资料库访谈文本或手动粘贴文本生成结构化 mock 访谈纪要。</p>
        </div>
        <Button onClick={onNew} variant="outline">
          新建纪要
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>选择资料库访谈文本</Label>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              onChange={(event) => onSelectMaterial(event.target.value)}
              value={form.sourceMaterialId}
            >
              <option value="">不选择，手动粘贴</option>
              {interviewTextMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title}
                </option>
              ))}
            </select>
            {!interviewTextMaterials.length ? <p className="text-xs text-muted-foreground">资料库中暂无“访谈文本”类型资料。</p> : null}
          </div>
          <div className="grid gap-2">
            <Label>访谈对象身份</Label>
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              onChange={(event) => updateForm("intervieweeIdentity", event.target.value)}
              placeholder="如：村干部、社区居民、驻村干部"
              value={form.intervieweeIdentity}
            />
          </div>
          <div className="grid gap-2">
            <Label>访谈时间</Label>
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              onChange={(event) => updateForm("interviewTime", event.target.value)}
              type="datetime-local"
              value={form.interviewTime}
            />
          </div>
          <div className="grid gap-2">
            <Label>访谈地点</Label>
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              onChange={(event) => updateForm("interviewLocation", event.target.value)}
              value={form.interviewLocation}
            />
          </div>
          <div className="grid gap-2">
            <Label>访谈主题</Label>
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              onChange={(event) => updateForm("interviewTopic", event.target.value)}
              value={form.interviewTopic}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input checked={form.isAnonymous} className="h-4 w-4" onChange={(event) => updateForm("isAnonymous", event.target.checked)} type="checkbox" />
            是否匿名
          </label>
          <div className="grid gap-2 md:col-span-2">
            <Label>访谈文本</Label>
            <Textarea
              className="min-h-[180px]"
              onChange={(event) => updateForm("rawText", event.target.value)}
              placeholder="可从资料库选择访谈文本，也可以在这里手动粘贴访谈原文。"
              value={form.rawText}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
            <Button onClick={onGenerate}>{editingNoteId ? "重新生成访谈纪要" : "生成访谈纪要"}</Button>
            <Button disabled={!noteDraft} onClick={onSave} variant="outline">
              保存纪要
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border bg-background p-4">
            <h3 className="mb-3 text-base font-semibold">纪要列表</h3>
            <div className="grid gap-3">
              {notes.map((note) => (
                <button
                  className={`rounded-md border p-3 text-left text-sm ${selectedNoteId === note.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"}`}
                  key={note.id}
                  onClick={() => onSelect(note.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{note.form.intervieweeIdentity || "未填写身份"}</p>
                    <span className="text-xs text-muted-foreground">{note.form.isAnonymous ? "匿名" : "实名/可识别"}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">主题：{note.form.interviewTopic || "未填写"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">访谈时间：{note.form.interviewTime || "未填写"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">创建：{new Date(note.createdAt).toLocaleString("zh-CN")}</p>
                </button>
              ))}
              {!notes.length ? <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">还没有访谈纪要，先生成一份。</div> : null}
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h3 className="mb-3 text-base font-semibold">纪要详情</h3>
            {selectedNote ? (
              <div className="grid gap-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold">{selectedNote.form.interviewTopic || "未填写主题"}</h4>
                    <p className="text-muted-foreground">
                      {selectedNote.form.intervieweeIdentity || "未填写身份"} ｜ {selectedNote.form.interviewTime || "未填写时间"} ｜ {selectedNote.form.isAnonymous ? "匿名" : "非匿名"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => onEdit(selectedNote)} variant="outline">
                      编辑
                    </Button>
                    <Button onClick={() => onDelete(selectedNote.id)} variant="outline">
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-medium">纪要内容</p>
                  <div className="markdown-preview min-h-80 rounded-md border bg-card p-3">
                    <ReactMarkdown>{selectedNote.markdown}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">选择左侧纪要后查看详情。</div>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">纪要编辑</p>
            <Textarea className="min-h-[420px] font-mono" onChange={(event) => setNoteDraft(event.target.value)} value={noteDraft} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">编辑预览</p>
            <div className="markdown-preview min-h-[420px] rounded-md border bg-background p-4 text-sm">
              {noteDraft ? <ReactMarkdown>{noteDraft}</ReactMarkdown> : <p className="text-muted-foreground">生成后将在这里预览，也可以手动编辑后保存。</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportOutlineModule({
  hasPlan,
  hasTopic,
  interviewNoteCount,
  materialCount,
  onDelete,
  onGenerate,
  onSave,
  outlineDraft,
  savedAt,
  setOutlineDraft
}: {
  hasPlan: boolean;
  hasTopic: boolean;
  interviewNoteCount: number;
  materialCount: number;
  onDelete: () => void;
  onGenerate: () => void;
  onSave: () => void;
  outlineDraft: string;
  savedAt: string;
  setOutlineDraft: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>报告大纲</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">基于项目基础信息、主选题、调研方案、资料摘要和访谈纪要生成结构化 mock 大纲。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onGenerate}>{outlineDraft ? "重新生成" : "生成报告大纲"}</Button>
          <Button disabled={!outlineDraft} onClick={onSave} variant="outline">
            保存大纲
          </Button>
          <Button disabled={!outlineDraft} onClick={onDelete} variant="outline">
            删除大纲
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3 rounded-lg border bg-background p-4 text-sm md:grid-cols-4">
          <StatusItem label="资料数量" value={`${materialCount} 份`} />
          <StatusItem label="访谈纪要数量" value={`${interviewNoteCount} 份`} />
          <StatusItem label="主选题" value={hasTopic ? "已有" : "暂无"} />
          <StatusItem label="调研方案" value={hasPlan ? "已有" : "暂无"} />
        </div>
        {savedAt ? <p className="text-xs text-muted-foreground">已保存：{new Date(savedAt).toLocaleString("zh-CN")}</p> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">大纲编辑</p>
            <Textarea className="min-h-[560px] font-mono" onChange={(event) => setOutlineDraft(event.target.value)} value={outlineDraft} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">大纲预览</p>
            <div className="markdown-preview min-h-[560px] rounded-md border bg-background p-4 text-sm">
              {outlineDraft ? <ReactMarkdown>{outlineDraft}</ReactMarkdown> : <p className="text-muted-foreground">点击“生成报告大纲”后将在这里预览。</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
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

function mockInterviewNoteSummary(project: ProjectRecord, form: InterviewNoteForm): InterviewNoteSummary {
  const text = form.rawText.replace(/\s+/g, " ").trim();
  const shortText = text.length > 140 ? `${text.slice(0, 140)}...` : text || "原始访谈文本较短，暂未提取到充分内容。";
  const identity = form.isAnonymous ? `${form.intervieweeIdentity || "访谈对象"}（匿名）` : form.intervieweeIdentity || "未填写身份";

  return {
    basicInfo: [
      `访谈对象身份：${identity}`,
      `访谈时间：${form.interviewTime || "未填写"}`,
      `访谈地点：${form.interviewLocation || "未填写"}`,
      `访谈主题：${form.interviewTopic || project.theme}`,
      `是否匿名：${form.isAnonymous ? "是" : "否"}`
    ],
    coreSummary: `本次访谈围绕“${form.interviewTopic || project.theme}”展开，受访者从自身经历和观察出发，提供了与${project.location}${project.theme}相关的一线反馈。mock 摘要提炼的核心内容为：${shortText}`,
    keyFacts: [
      `材料显示，${project.location}在“${project.theme}”相关工作中已经形成一定实践基础。`,
      "受访者提到的问题主要集中在资源协调、执行落地和群众反馈等方面。",
      "访谈文本可作为后续报告中描述现状和问题表现的定性材料。"
    ],
    importantViews: [
      "受访者认为相关工作需要更贴近实际需求，避免只停留在形式层面。",
      "受访者强调不同主体之间的协同会影响实践效果。",
      "受访者建议后续改进应优先关注可持续机制和具体执行细节。"
    ],
    cases: [
      "可从原始文本中继续提取一个具体人物、事件或场景作为典型案例。",
      "如文本中包含时间、地点、行动和结果，可整理为报告中的案例段落。"
    ],
    quotes: [
      text ? `“${text.slice(0, 60)}${text.length > 60 ? "..." : ""}”` : "原文不足，建议补充可引用原话。",
      "建议后续人工核对原文，筛选更完整、表达更自然的直接引语。"
    ],
    researchLinks: project.selectedTopic
      ? [project.selectedTopic.researchQuestion, `可用于回应主选题“${project.selectedTopic.title}”中的对象体验、现实困难或改进路径。`]
      : [`可关联到“${project.theme}”的现状、问题和改进建议。`, "建议先确认主选题，再进一步标注材料与研究问题的关系。"],
    followUpSuggestions: [
      "追问受访者提到的问题是否具有普遍性，是否还有其他群体持不同意见。",
      "补充询问具体案例的时间、地点、参与主体和结果。",
      "继续核实材料中涉及的数据、政策或事实来源。"
    ]
  };
}

function interviewNoteSummaryToMarkdown(summary: InterviewNoteSummary) {
  return `# 访谈纪要

## 访谈基本信息
${summary.basicInfo.map((item) => `- ${item}`).join("\n")}

## 核心内容摘要
${summary.coreSummary}

## 关键事实
${summary.keyFacts.map((item) => `- ${item}`).join("\n")}

## 重要观点
${summary.importantViews.map((item) => `- ${item}`).join("\n")}

## 典型案例
${summary.cases.map((item) => `- ${item}`).join("\n")}

## 可引用原话
${summary.quotes.map((item) => `- ${item}`).join("\n")}

## 与研究问题的关联
${summary.researchLinks.map((item) => `- ${item}`).join("\n")}

## 后续追问建议
${summary.followUpSuggestions.map((item) => `- ${item}`).join("\n")}`;
}

function mockReportOutline(project: ProjectRecord, materials: MaterialItem[], notes: InterviewNote[]) {
  const topicTitle = project.selectedTopic?.title || `${project.location}${project.theme}实践调研`;
  const researchQuestion = project.selectedTopic?.researchQuestion || `围绕${project.theme}梳理现状、问题与改进路径。`;
  const materialTitles = materials.slice(0, 5).map((item) => `《${item.title}》`).join("、") || "暂无资料库材料";
  const noteThemes = notes
    .slice(0, 4)
    .map((note) => `${note.form.intervieweeIdentity || "访谈对象"}：${note.form.interviewTopic || "未填写主题"}`)
    .join("；") || "暂无已保存访谈纪要";
  const summarizedMaterials = materials.filter((item) => item.summary).length;

  return `# ${topicTitle}调研报告大纲

## 报告标题
${topicTitle}——基于${project.location}社会实践调研的分析

## 摘要方向
围绕“${project.theme}”和主研究问题“${researchQuestion}”，概括${project.location}相关实践的现实基础、主要问题、受访者观点、典型材料和改进建议。摘要应突出高校社会实践队的实地调研过程，以及资料库和访谈纪要提供的一线证据。

## 一、调研背景与问题提出

### 1.1 项目背景
写作重点：介绍项目名称“${project.name}”、实践类型“${project.practiceType}”、实践地点“${project.location}”和预期成果“${project.expectedOutcome}”。

可使用材料：
- 项目基础信息
- 调研方案中的“调研背景”

### 1.2 研究问题
写作重点：说明主选题和核心研究问题，明确报告要回答什么。

可使用材料：
- 主选题：${topicTitle}
- 研究问题：${researchQuestion}

## 二、调研设计与资料来源

### 2.1 调研方法与过程
写作重点：说明访谈、资料整理、现场观察等方法如何支撑结论。

可使用材料：
- 调研方案：${project.researchPlan ? "已有，可提炼方法和日程" : "暂无，需要补充"}
- 资料库材料：${materialTitles}

### 2.2 材料结构
写作重点：交代资料数量、访谈纪要数量和材料可信度。

可使用材料：
- 资料数量：${materials.length} 份
- 已生成摘要资料：${summarizedMaterials} 份
- 访谈纪要：${notes.length} 份

## 三、调研发现

### 3.1 现状与已有基础
写作重点：从政策文件、新闻资料、实践日志和访谈文本中提炼当地实践现状。

可使用材料：
- ${materialTitles}

### 3.2 主要问题与成因
写作重点：结合访谈纪要提取高频问题、执行难点、资源约束和主体协同问题。

可使用材料：
- ${noteThemes}

### 3.3 典型案例与一线反馈
写作重点：选取 1-2 个具体案例，加入可引用原话，增强报告真实感。

可使用材料：
- 已保存访谈纪要中的“典型案例”和“可引用原话”

## 四、分析讨论

### 4.1 与研究问题的对应关系
写作重点：逐条回应“${researchQuestion}”，说明材料如何支撑判断。

可使用材料：
- 访谈纪要中的“与研究问题的关联”
- 资料摘要中的“关联研究问题”

### 4.2 影响机制分析
写作重点：从主体协同、资源配置、政策落地、群众参与等角度解释问题形成原因。

可使用材料：
- 访谈纪要中的重要观点
- 资料摘要中的可用于报告的材料点

## 五、对策建议

### 5.1 面向当地实践的改进建议
写作重点：提出具体、可执行、与问题对应的建议。

可使用材料：
- 访谈纪要中的后续追问建议
- 调研方案中的风险预案和预期成果

### 5.2 面向高校实践队的行动建议
写作重点：总结实践队后续可以继续补充的调研、服务或传播行动。

可使用材料：
- 项目其他要求：${project.requirements || "暂无"}

## 六、结论

### 6.1 核心结论
写作重点：用 2-3 条结论回答主研究问题，避免泛泛而谈。

### 6.2 研究不足
写作重点：说明样本、资料、时间和方法限制。

缺失材料提示：
- ${project.selectedTopic ? "主选题已具备。" : "缺少主选题，建议先在选题设计中确认。"}
- ${project.researchPlan ? "调研方案已具备。" : "缺少调研方案，建议先生成或保存调研方案。"}
- ${materials.length ? "已有资料库材料，但建议继续补充不同类型资料。" : "缺少资料库材料，建议新增访谈文本、政策文件或实践日志。"}
- ${notes.length ? "已有访谈纪要，可支撑发现章节。" : "缺少访谈纪要，建议先基于访谈文本生成纪要。"}
- ${summarizedMaterials ? "已有资料摘要，可用于报告材料点。" : "资料摘要不足，建议在资料库中生成 mock 摘要。"}
`;
}
