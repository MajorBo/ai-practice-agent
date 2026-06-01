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
import { getLocalProject, updateLocalProject } from "@/lib/clientProjectStore";
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
  ReportDraft,
  ReportDraftOptions,
  ReportDraftStyle,
  ReportDraftLengthOption,
  ReportOutline,
  TopicCandidate
} from "@/lib/types";

const targetTypes: InterviewTargetType[] = ["基层干部", "村干部/社区干部", "驻村干部", "普通群众", "政府工作人员", "专家学者", "自定义对象"];
const materialTypes: MaterialType[] = ["访谈文本", "政策文件", "实践日志", "新闻资料", "其他"];

type ModuleKey = "topics" | "plan" | "interview" | "materials" | "notes" | "outline" | "draft";
type InterviewGenerationSource = "idle" | "ai" | "mock-missing-key" | "mock-api-error";
type PlanGenerationSource = "idle" | "ai" | "mock-missing-key" | "mock-api-error";

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

const defaultReportDraftOptions: ReportDraftOptions = {
  lengthOption: "3000字",
  customLength: "",
  style: "高校社会实践报告"
};

const reportDraftLengthOptions: ReportDraftLengthOption[] = ["3000字", "5000字", "8000字", "自定义"];
const reportDraftStyles: ReportDraftStyle[] = ["高校社会实践报告", "政策调研报告", "课程论文式", "评优答辩式"];

export default function ProjectWorkspacePage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>("topics");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [planDraft, setPlanDraft] = useState("");
  const [planGenerationSource, setPlanGenerationSource] = useState<PlanGenerationSource>("idle");
  const [interviewForm, setInterviewForm] = useState<InterviewOutlineForm>(defaultInterviewForm);
  const [interviewDraft, setInterviewDraft] = useState("");
  const [interviewSavedAt, setInterviewSavedAt] = useState("");
  const [interviewGenerationSource, setInterviewGenerationSource] = useState<InterviewGenerationSource>("idle");
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
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [reportDraftText, setReportDraftText] = useState("");
  const [reportDraftOptions, setReportDraftOptions] = useState<ReportDraftOptions>(defaultReportDraftOptions);
  const [reportDraftFeedback, setReportDraftFeedback] = useState("");

  const interviewStorageKey = `interview-outline:${params.id}`;
  const materialsStorageKey = `materials-library:${params.id}`;
  const interviewNotesStorageKey = `interview-notes:${params.id}`;
  const reportOutlineStorageKey = `report-outline:${params.id}`;
  const reportDraftStorageKey = `report-draft:${params.id}`;

  async function loadProject() {
    setError("");
    const data = getLocalProject(params.id);
    if (!data) throw new Error("未找到项目。当前内测版项目只保存在创建它的浏览器中。");

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

  useEffect(() => {
    const saved = window.localStorage.getItem(reportDraftStorageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as ReportDraft;
      setReportDraft(parsed);
      setReportDraftText(parsed.markdown || "");
      setReportDraftOptions(parsed.options || defaultReportDraftOptions);
      setReportDraftFeedback(parsed.polishFeedback || parsed.supportCheck || "");
    } catch {
      window.localStorage.removeItem(reportDraftStorageKey);
    }
  }, [reportDraftStorageKey]);

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
      updateLocalProject(params.id, {
        topics: data.topics,
        selectedTopic: data.selectedTopic,
        researchPlan: data.researchPlan,
        stage: data.stage
      });
      if (data.selectedTopic) setActiveModule("plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading("");
    }
  }

  function generateTopics() {
    if (!project) return;
    runAction(`/api/projects/${params.id}/topics`, "topics", { project });
  }

  function selectTopic(topic: TopicCandidate) {
    if (!project) return;
    const updated = updateLocalProject(params.id, {
      selectedTopic: topic,
      stage: "调研方案"
    });
    if (updated) {
      setProject(updated);
      setActiveModule("plan");
    }
  }

  async function generatePlan() {
    setActionLoading("plan");
    setError("");

    try {
      const response = await fetch(`/api/projects/${params.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project })
      });
      const data = (await response.json()) as ProjectRecord & { generationSource?: PlanGenerationSource; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "方案生成失败");
      }

      setProject(data);
      setPlanDraft(data.researchPlan || "");
      setPlanGenerationSource(data.generationSource || "mock-api-error");
      updateLocalProject(params.id, {
        researchPlan: data.researchPlan,
        stage: data.stage
      });
      if (data.selectedTopic) setActiveModule("plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案生成失败");
      setPlanGenerationSource("mock-api-error");
    } finally {
      setActionLoading("");
    }
  }

  async function savePlan() {
    setActionLoading("save-plan");
    setError("");

    try {
      const updated = updateLocalProject(params.id, {
        researchPlan: planDraft,
        stage: "方案已保存"
      });
      if (!updated) throw new Error("项目不存在");
      setProject(updated);
      setPlanDraft(updated.researchPlan || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案保存失败");
    } finally {
      setActionLoading("");
    }
  }

  async function generateInterviewOutline() {
    if (!project) return;
    setActionLoading("interview");
    try {
      const response = await fetch(`/api/projects/${params.id}/interview-outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: interviewForm, project })
      });
      const data = (await response.json()) as { markdown?: string | null; source?: InterviewGenerationSource };
      const source = data.source || (data.markdown ? "ai" : "mock-api-error");
      const markdown = data.markdown || interviewOutlineToMarkdown(mockInterviewOutline(project, interviewForm));
      setInterviewDraft(markdown);
      setInterviewGenerationSource(source);
      saveInterviewOutline(markdown, interviewForm);
    } catch (error) {
      console.error("Falling back to mock interview outline:", error);
      const outline = mockInterviewOutline(project, interviewForm);
      const markdown = interviewOutlineToMarkdown(outline);
      setInterviewDraft(markdown);
      setInterviewGenerationSource("mock-api-error");
      saveInterviewOutline(markdown, interviewForm);
    } finally {
      setActionLoading("");
    }
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

  function persistReportDraft(markdown = reportDraftText, options = reportDraftOptions, feedback = reportDraftFeedback) {
    if (!markdown.trim()) {
      setError("请先生成或填写报告初稿");
      return;
    }
    const nextDraft: ReportDraft = {
      markdown,
      options,
      polishFeedback: feedback.startsWith("## AI润色反馈") ? feedback : reportDraft?.polishFeedback || "",
      supportCheck: feedback.startsWith("## 材料支撑检查") ? feedback : reportDraft?.supportCheck || "",
      savedAt: new Date().toISOString()
    };
    setReportDraft(nextDraft);
    setReportDraftText(markdown);
    window.localStorage.setItem(reportDraftStorageKey, JSON.stringify(nextDraft));
    setError("");
  }

  function generateReportDraft() {
    if (!project) return;
    if (!reportOutlineDraft.trim()) {
      setError("请先生成报告大纲，再生成报告初稿");
      setActiveModule("draft");
      return;
    }
    const markdown = mockReportDraft(project, materials, interviewNotes, reportOutlineDraft, reportDraftOptions);
    setReportDraftFeedback("");
    persistReportDraft(markdown, reportDraftOptions, "");
  }

  function deleteReportDraft() {
    setReportDraft(null);
    setReportDraftText("");
    setReportDraftFeedback("");
    window.localStorage.removeItem(reportDraftStorageKey);
  }

  function polishReportDraft() {
    const feedback = mockReportPolishFeedback(reportDraftText, reportDraftOptions);
    setReportDraftFeedback(feedback);
    if (reportDraftText.trim()) {
      const nextDraft: ReportDraft = {
        markdown: reportDraftText,
        options: reportDraftOptions,
        polishFeedback: feedback,
        supportCheck: reportDraft?.supportCheck || "",
        savedAt: new Date().toISOString()
      };
      setReportDraft(nextDraft);
      window.localStorage.setItem(reportDraftStorageKey, JSON.stringify(nextDraft));
    }
  }

  function checkReportSupport() {
    const feedback = mockReportSupportCheck(project, materials, interviewNotes, reportOutlineDraft);
    setReportDraftFeedback(feedback);
    if (reportDraftText.trim()) {
      const nextDraft: ReportDraft = {
        markdown: reportDraftText,
        options: reportDraftOptions,
        polishFeedback: reportDraft?.polishFeedback || "",
        supportCheck: feedback,
        savedAt: new Date().toISOString()
      };
      setReportDraft(nextDraft);
      window.localStorage.setItem(reportDraftStorageKey, JSON.stringify(nextDraft));
    }
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
              <NavButton active={activeModule === "draft"} onClick={() => setActiveModule("draft")}>
                <FileText className="h-4 w-4" /> 报告初稿
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
          {activeModule === "plan" ? <PlanModule loading={actionLoading} onGenerate={generatePlan} onSave={savePlan} planDraft={planDraft} project={project} setPlanDraft={setPlanDraft} source={planGenerationSource} /> : null}
          {activeModule === "interview" ? (
            <InterviewModule
              form={interviewForm}
              loading={actionLoading}
              onFormChange={setInterviewForm}
              onGenerate={generateInterviewOutline}
              onSave={() => saveInterviewOutline()}
              outlineDraft={interviewDraft}
              savedAt={interviewSavedAt}
              setOutlineDraft={setInterviewDraft}
              source={interviewGenerationSource}
            />
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
          {activeModule === "draft" ? (
            <ReportDraftModule
              draftText={reportDraftText}
              feedback={reportDraftFeedback}
              hasOutline={Boolean(reportOutlineDraft)}
              hasPlan={Boolean(project.researchPlan)}
              hasTopic={Boolean(project.selectedTopic)}
              interviewNoteCount={interviewNotes.length}
              materialCount={materials.length}
              onCheckSupport={checkReportSupport}
              onDelete={deleteReportDraft}
              onGenerate={generateReportDraft}
              onPolish={polishReportDraft}
              onSave={() => persistReportDraft()}
              options={reportDraftOptions}
              savedAt={reportDraft?.savedAt || ""}
              setDraftText={setReportDraftText}
              setOptions={setReportDraftOptions}
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
              <p>当前支持：生成候选选题、调研方案、访谈提纲、资料 mock 摘要、访谈纪要、报告大纲和报告初稿。</p>
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

function PlanModule({ loading, onGenerate, onSave, planDraft, project, setPlanDraft, source }: { loading: string; onGenerate: () => void; onSave: () => void; planDraft: string; project: ProjectRecord; setPlanDraft: (value: string) => void; source: PlanGenerationSource }) {
  const sourceText =
    source === "ai"
      ? "当前方案由真实 AI 生成"
      : source === "mock-missing-key"
        ? "未配置 API Key，当前使用 mock fallback"
        : source === "mock-api-error"
          ? "AI 调用失败，当前使用 mock fallback"
          : "";

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
        {sourceText ? <p className="w-fit rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground xl:col-span-2">{sourceText}</p> : null}
        {!project.selectedTopic ? <div className="xl:col-span-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">请先在“选题设计”中选择一个主选题。</div> : <><div><p className="mb-2 text-sm font-medium">Markdown 编辑</p><Textarea className="min-h-[520px] font-mono" onChange={(event) => setPlanDraft(event.target.value)} value={planDraft} /></div><div><p className="mb-2 text-sm font-medium">方案预览</p><div className="markdown-preview min-h-[520px] rounded-md border bg-background p-4 text-sm">{planDraft ? <ReactMarkdown>{planDraft}</ReactMarkdown> : <p className="text-muted-foreground">生成后将在这里预览。</p>}</div></div></>}
      </CardContent>
    </Card>
  );
}

function InterviewModule({ form, loading, onFormChange, onGenerate, onSave, outlineDraft, savedAt, setOutlineDraft, source }: { form: InterviewOutlineForm; loading: string; onFormChange: (form: InterviewOutlineForm) => void; onGenerate: () => void; onSave: () => void; outlineDraft: string; savedAt: string; setOutlineDraft: (value: string) => void; source: InterviewGenerationSource }) {
  function updateForm<K extends keyof InterviewOutlineForm>(key: K, value: InterviewOutlineForm[K]) {
    onFormChange({ ...form, [key]: value });
  }

  const sourceText =
    source === "ai"
      ? "当前内容由真实 AI 生成"
      : source === "mock-missing-key"
        ? "未配置 API Key，当前使用 mock fallback"
        : source === "mock-api-error"
          ? "AI 调用失败，已使用 mock fallback"
          : "";

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
        {sourceText ? <p className="w-fit rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">{sourceText}</p> : null}
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

function ReportDraftModule({
  draftText,
  feedback,
  hasOutline,
  hasPlan,
  hasTopic,
  interviewNoteCount,
  materialCount,
  onCheckSupport,
  onDelete,
  onGenerate,
  onPolish,
  onSave,
  options,
  savedAt,
  setDraftText,
  setOptions
}: {
  draftText: string;
  feedback: string;
  hasOutline: boolean;
  hasPlan: boolean;
  hasTopic: boolean;
  interviewNoteCount: number;
  materialCount: number;
  onCheckSupport: () => void;
  onDelete: () => void;
  onGenerate: () => void;
  onPolish: () => void;
  onSave: () => void;
  options: ReportDraftOptions;
  savedAt: string;
  setDraftText: (value: string) => void;
  setOptions: (value: ReportDraftOptions) => void;
}) {
  function updateOptions<K extends keyof ReportDraftOptions>(key: K, value: ReportDraftOptions[K]) {
    setOptions({ ...options, [key]: value });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>报告初稿</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">基于已保存报告大纲、项目资料和访谈纪要生成结构化 mock 报告初稿。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!hasOutline} onClick={onGenerate}>{draftText ? "重新生成初稿" : "生成报告初稿"}</Button>
          <Button disabled={!draftText} onClick={onSave} variant="outline">保存初稿</Button>
          <Button disabled={!draftText} onClick={onDelete} variant="outline">删除初稿</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3 rounded-lg border bg-background p-4 text-sm md:grid-cols-5">
          <StatusItem label="主选题" value={hasTopic ? "已有" : "暂无"} />
          <StatusItem label="调研方案" value={hasPlan ? "已有" : "暂无"} />
          <StatusItem label="资料数量" value={`${materialCount} 份`} />
          <StatusItem label="访谈纪要数量" value={`${interviewNoteCount} 份`} />
          <StatusItem label="报告大纲" value={hasOutline ? "已有" : "暂无"} />
        </div>

        {!hasOutline ? (
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            还没有已保存的报告大纲。请先进入“报告大纲”模块生成并保存大纲，再生成报告初稿。
          </div>
        ) : null}

        <div className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>字数要求</Label>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              onChange={(event) => updateOptions("lengthOption", event.target.value as ReportDraftLengthOption)}
              value={options.lengthOption}
            >
              {reportDraftLengthOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          {options.lengthOption === "自定义" ? (
            <div className="grid gap-2">
              <Label>自定义字数</Label>
              <input
                className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                onChange={(event) => updateOptions("customLength", event.target.value)}
                placeholder="如：6000字"
                value={options.customLength}
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label>写作风格</Label>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              onChange={(event) => updateOptions("style", event.target.value as ReportDraftStyle)}
              value={options.style}
            >
              {reportDraftStyles.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button disabled={!draftText} onClick={onPolish} variant="outline">AI润色</Button>
            <Button disabled={!draftText} onClick={onCheckSupport} variant="outline">检查材料支撑</Button>
          </div>
        </div>

        {savedAt ? <p className="text-xs text-muted-foreground">已保存：{new Date(savedAt).toLocaleString("zh-CN")}</p> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">初稿编辑</p>
            <Textarea className="min-h-[640px] font-mono" onChange={(event) => setDraftText(event.target.value)} value={draftText} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">初稿预览</p>
            <div className="markdown-preview min-h-[640px] rounded-md border bg-background p-4 text-sm">
              {draftText ? <ReactMarkdown>{draftText}</ReactMarkdown> : <p className="text-muted-foreground">生成后将在这里预览。</p>}
            </div>
          </div>
        </div>

        {feedback ? (
          <div className="markdown-preview rounded-md border bg-card p-4 text-sm">
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function mockInterviewOutline(project: ProjectRecord, form: InterviewOutlineForm): InterviewOutline {
  const target = form.targetType === "自定义对象" ? form.customTarget || "自定义对象" : form.targetType;
  const focus = form.focusQuestions || `围绕${project.theme}了解实际情况、主要困难和改进建议。`;
  return {
    warmUpQuestions: [`我们是“${project.name}”社会实践团队，正在${project.location}围绕“${project.theme}”开展调研。本次访谈预计约 ${form.durationMinutes} 分钟。请问您方便先简单介绍一下自己的工作/生活背景吗？`, `您和“${project.theme}”相关事务通常有哪些接触？`, `从${target}的角度看，您最近一次接触相关事务大概是在什么场景下？`],
    factualQuestions: [`目前您所在的社区/单位/村庄中，与“${project.theme}”相关的主要工作或服务有哪些？`, "这些工作通常由哪些人或机构参与？具体流程大概是怎样的？", "平时居民、群众或服务对象主要通过哪些渠道了解或参与？"],
    processQuestions: [`围绕“${focus}”，能否请您讲讲一件相关工作从提出到落实大致会经历哪些步骤？`, "推进过程中，哪些环节比较顺畅？哪些环节需要反复沟通？", "如果遇到临时变化，通常由谁来协调，怎样调整？"],
    caseFollowUps: ["能否举一个您印象比较深的具体例子？比如某一次服务、协调、沟通或处理过程。", "这个案例中，涉及哪些人？他们分别做了什么？", "这件事最后是如何解决或推进的？有没有留下后续问题？"],
    difficultyFollowUps: ["在实际执行中，最常遇到的困难是什么？这些困难通常出现在哪个环节？", "资源、人手、信息沟通或群众理解方面，哪一项压力更明显？", "不同群体对同一件事是否有不同期待？通常如何协调？"],
    sensitiveAlternatives: form.hasSensitiveTopics ? ["将“是否存在矛盾/冲突”替换为“推进过程中有哪些需要协调的地方”。", "将“责任在谁”替换为“哪些环节还有进一步优化空间”。", "将“群众是否不满意”替换为“大家反馈比较集中的期待是什么”。"] : ["本次访谈未标记敏感议题。如现场出现敏感内容，可使用更中性的描述方式继续追问。"],
    closingConfirmations: ["刚才记录中，是否有哪一点需要我们补充或修正？", "还有哪些您认为重要、但我们没有问到的情况？", "后续如果需要核对信息，是否方便再向您请教？"],
    noteTips: ["记录原话中的关键词、具体案例、时间地点和涉及主体。", "区分事实描述、个人判断和改进建议，避免混在一起。", "敏感内容只记录研究必要信息，避免记录可识别个人隐私的细节。", "访谈结束后 30 分钟内补充现场观察和访谈员感受。"]
  };
}

function interviewOutlineToMarkdown(outline: InterviewOutline) {
  return `## 暖场问题
${outline.warmUpQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 事实性问题
${outline.factualQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 过程性问题
${outline.processQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 案例追问
${outline.caseFollowUps.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 矛盾/困难追问
${outline.difficultyFollowUps.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 敏感问题替代表达
${outline.sensitiveAlternatives.map((item) => `- ${item}`).join("\n")}

## 结束确认问题
${outline.closingConfirmations.map((item, index) => `${index + 1}. ${item}`).join("\n")}

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

function mockReportDraft(project: ProjectRecord, materials: MaterialItem[], notes: InterviewNote[], outline: string, options: ReportDraftOptions) {
  const targetLength = options.lengthOption === "自定义" ? options.customLength || "自定义字数" : options.lengthOption;
  const topicTitle = project.selectedTopic?.title || `${project.location}${project.theme}实践调研`;
  const researchQuestion = project.selectedTopic?.researchQuestion || `围绕${project.theme}梳理现状、问题与改进路径。`;
  const noteSummary = notes.length
    ? notes.slice(0, 3).map((note) => `${note.form.intervieweeIdentity || "访谈对象"}围绕“${note.form.interviewTopic || project.theme}”提供了一线反馈`).join("；")
    : "目前尚未保存访谈纪要，初稿中的访谈发现为占位式 mock 表述。";
  const materialSummary = materials.length
    ? materials.slice(0, 4).map((item) => `《${item.title}》（${item.type}）`).join("、")
    : "暂无资料库材料";
  const outlineHint = outline.split("\n").filter((line) => line.startsWith("## ") || line.startsWith("### ")).slice(0, 8).join("；") || "暂无明确大纲层级";

  return `# ${topicTitle}调研报告初稿

> 写作要求：${targetLength}；写作风格：${options.style}。本初稿为 mock 版本，用于验证报告生成流程，不代表真实 AI 写作结果。

## 摘要
本报告围绕“${project.theme}”展开，以${project.location}为实践地点，结合项目基础信息、主选题、调研方案、资料库材料和访谈纪要，对当地相关实践的现状、问题与改进路径进行初步梳理。报告重点回应研究问题：“${researchQuestion}”。现有材料显示，${noteSummary}。后续可在补充更多材料和核验事实后，形成更完整的正式报告。

## 关键词
${[project.theme, project.location, project.practiceType, "社会实践", "调研报告"].filter(Boolean).map((item) => `- ${item}`).join("\n")}

## 引言
高校社会实践不仅是学生理解社会、连接基层的重要方式，也是围绕现实议题开展问题研究和行动服务的有效路径。本项目“${project.name}”以“${project.theme}”为核心主题，预期成果为“${project.expectedOutcome}”。本报告初稿基于当前已保存的报告大纲进行展开，重点将资料库材料、访谈纪要和调研方案中的信息转化为结构化文字。

## 调研背景
从项目基础信息看，本次实践类型为“${project.practiceType}”，实践地点为${project.location}，实践时间为${project.startDate.slice(0, 10)}至${project.endDate.slice(0, 10)}。围绕“${topicTitle}”这一主选题，团队需要回答的问题是：${researchQuestion}

报告大纲中已经形成的写作线索包括：${outlineHint}。这些线索为初稿提供了章节安排和论证方向。

## 调研方法
本阶段初稿默认采用文本资料整理、访谈纪要归纳和调研方案复用三类方法。资料库中当前可使用材料包括：${materialSummary}。访谈纪要数量为 ${notes.length} 份，资料数量为 ${materials.length} 份。

若后续继续完善，应补充访谈对象样本说明、问卷或观察记录说明，并明确材料的时间、地点、来源和可信度。

## 调研发现
第一，当前材料初步反映出${project.location}在“${project.theme}”方面已有一定实践基础，但不同主体的感受和参与程度可能存在差异。

第二，访谈纪要提供了一线视角：${noteSummary}

第三，资料库材料能够为报告提供背景、事实和案例支撑。特别是已生成摘要的资料，可用于提炼“可用于报告的材料点”和“关联研究问题”。

## 问题分析
围绕主研究问题“${researchQuestion}”，当前初稿可以从以下角度展开分析：

1. 主体协同：不同部门、基层组织、群众或实践队之间是否形成稳定合作。
2. 资源配置：人力、资金、信息和场地等资源是否支撑长期运行。
3. 执行落地：政策或项目安排是否真正转化为可感知的服务或变化。
4. 反馈机制：群众和一线工作人员的反馈是否能进入后续改进。

这些分析仍需要更多可引用原话、具体案例和数据材料进一步支撑。

## 对策建议
第一，围绕调研发现建立问题清单，将访谈纪要中的高频反馈转化为可执行改进事项。

第二，完善多主体协同机制，明确高校实践队、基层组织、政府工作人员和群众之间的分工。

第三，加强材料沉淀，将政策文件、新闻资料、实践日志和访谈文本统一整理到资料库，并持续生成摘要。

第四，面向后续报告完善证据链，优先补充能回应主研究问题的典型案例、直接引语和可核验数据。

## 结论
总体来看，本项目已经具备从“调研前准备”走向“报告写作”的基本材料基础。主选题为报告提供了问题意识，调研方案提供了执行框架，资料库和访谈纪要提供了事实材料。后续工作应继续补充材料、核验来源、细化案例，并将 mock 初稿进一步改写为正式报告文本。

## 材料不足提示
- ${project.selectedTopic ? "已有主选题，可继续围绕研究问题展开论证。" : "缺少主选题，建议先确认主选题。"}
- ${project.researchPlan ? "已有调研方案，可继续提炼方法和日程信息。" : "缺少调研方案，建议先生成并保存。"}
- ${outline ? "已有报告大纲，本初稿已参考其章节线索。" : "缺少报告大纲，建议先生成大纲。"}
- ${materials.length ? `已有 ${materials.length} 份资料，但仍建议补充不同类型材料。` : "缺少资料库材料，建议新增文本资料。"}
- ${notes.length ? `已有 ${notes.length} 份访谈纪要，可继续提炼原话和案例。` : "缺少访谈纪要，建议先基于访谈文本生成纪要。"}
- 当前为 mock 初稿，尚未进行真实 AI 写作、事实核验和引用规范处理。`;
}

function mockReportPolishFeedback(draft: string, options: ReportDraftOptions) {
  const lengthHint = draft.length > 1000 ? "当前文本已有一定篇幅，可重点压缩重复表述并增强段落衔接。" : "当前文本较短，可补充案例、数据和访谈原话。";
  return `## AI润色反馈（mock）

- 写作风格：建议继续贴近“${options.style}”的表达方式。
- 结构建议：保留“摘要—背景—方法—发现—分析—建议—结论”的顺序，便于评审快速理解。
- 语言建议：减少泛泛表述，多使用“材料显示”“访谈对象提到”“资料库记录”等证据提示语。
- 篇幅建议：${lengthHint}
- 下一步：可将“调研发现”和“问题分析”部分进一步拆成带小标题的段落。`;
}

function mockReportSupportCheck(project: ProjectRecord | null, materials: MaterialItem[], notes: InterviewNote[], outline: string) {
  return `## 材料支撑检查（mock）

- 主选题支撑：${project?.selectedTopic ? "已有主选题，初稿可以围绕研究问题展开。" : "缺少主选题，报告问题意识会偏弱。"}
- 报告大纲支撑：${outline ? "已有报告大纲，章节结构具备基础。" : "缺少报告大纲，建议先生成大纲。"}
- 资料库支撑：当前有 ${materials.length} 份资料，其中 ${materials.filter((item) => item.summary).length} 份已有摘要。
- 访谈纪要支撑：当前有 ${notes.length} 份访谈纪要，可用于调研发现和案例部分。
- 风险提示：mock 检查不会验证事实真伪，也不会判断引用是否准确。
- 补强建议：优先补充政策文件、典型案例、可引用原话和带来源的数据。`;
}
