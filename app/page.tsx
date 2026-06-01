import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-medium text-primary">高校社会实践队调研助手</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          AI实践调研Agent
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          从项目创建、选题生成、主选题确认到调研方案沉淀，先把调研前准备闭环跑顺。
        </p>
        <div className="mt-8 flex gap-3">
          <Link className={buttonVariants({ className: "gap-2" })} href="/projects">
            进入项目 <ArrowRight className="h-4 w-4" />
          </Link>
          <Link className={buttonVariants({ variant: "outline" })} href="/projects/new">
            新建项目
          </Link>
        </div>
      </section>
    </main>
  );
}
