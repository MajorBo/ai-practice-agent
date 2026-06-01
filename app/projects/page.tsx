"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listLocalProjects } from "@/lib/clientProjectStore";
import type { ProjectRecord } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProjects(listLocalProjects());
    setLoading(false);
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">项目列表</p>
          <h1 className="mt-1 text-3xl font-bold">社会实践调研项目</h1>
          <p className="mt-2 text-sm text-muted-foreground">当前内测版项目保存在本浏览器 localStorage。</p>
        </div>
        <Link className={buttonVariants({ className: "gap-2" })} href="/projects/new">
          <Plus className="h-4 w-4" /> 新建项目
        </Link>
      </div>

      {loading ? <p className="text-muted-foreground">正在加载项目...</p> : null}

      {!loading && projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>还没有项目</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground">创建第一个项目，开始完成调研前准备闭环。</p>
            <Link className={buttonVariants()} href="/projects/new">
              去创建
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-xl font-semibold">{project.name}</h2>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                  <span>类型：{project.practiceType}</span>
                  <span>地点：{project.location}</span>
                  <span>阶段：{project.stage}</span>
                  <span>更新：{formatDateTime(project.updatedAt)}</span>
                </div>
              </div>
              <Link className={buttonVariants({ variant: "outline", className: "gap-2" })} href={`/projects/${project.id}`}>
                进入项目 <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
