"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createLocalProject } from "@/lib/clientProjectStore";
import type { ProjectInput } from "@/lib/types";

const initialForm: ProjectInput = {
  name: "",
  practiceType: "",
  theme: "",
  location: "",
  startDate: "",
  endDate: "",
  teamSize: 6,
  expectedOutcome: "",
  requirements: ""
};

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProjectInput>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateProject(input: ProjectInput) {
    if (!input.name || !input.practiceType || !input.theme || !input.location || !input.startDate || !input.endDate || !input.expectedOutcome) {
      return "请完整填写项目基础信息";
    }
    if (!Number.isFinite(input.teamSize) || input.teamSize <= 0) return "团队人数必须大于 0";
    if (new Date(input.startDate) > new Date(input.endDate)) return "实践开始时间不能晚于结束时间";
    return "";
  }

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const validationError = validateProject(form);
      if (validationError) throw new Error(validationError);

      const project = createLocalProject(form);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "项目创建失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <Link className="text-sm text-primary hover:underline" href="/projects">
          返回项目列表
        </Link>
        <h1 className="mt-3 text-3xl font-bold">新建实践调研项目</h1>
        <p className="mt-2 text-muted-foreground">项目会保存到当前浏览器 localStorage，适合 Vercel 内测演示。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>项目基础信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={submitProject}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="项目名称">
                <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
              </Field>
              <Field label="实践类型">
                <Input placeholder="如：乡村振兴、基层治理、文化传承" value={form.practiceType} onChange={(event) => updateField("practiceType", event.target.value)} />
              </Field>
              <Field label="实践主题">
                <Input value={form.theme} onChange={(event) => updateField("theme", event.target.value)} />
              </Field>
              <Field label="实践地点">
                <Input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
              </Field>
              <Field label="实践开始时间">
                <Input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
              </Field>
              <Field label="实践结束时间">
                <Input type="date" value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} />
              </Field>
              <Field label="团队人数">
                <Input type="number" min={1} value={form.teamSize} onChange={(event) => updateField("teamSize", Number(event.target.value))} />
              </Field>
              <Field label="预期成果">
                <Input placeholder="如：调研报告、政策建议、实践视频" value={form.expectedOutcome} onChange={(event) => updateField("expectedOutcome", event.target.value)} />
              </Field>
            </div>

            <Field label="其他要求">
              <Textarea value={form.requirements} onChange={(event) => updateField("requirements", event.target.value)} />
            </Field>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex justify-end gap-3">
              <Link className="inline-flex h-10 items-center rounded-md px-4 text-sm hover:bg-muted" href="/projects">
                取消
              </Link>
              <Button disabled={saving} type="submit">
                {saving ? "创建中..." : "创建项目"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
