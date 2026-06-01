import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const port = Number(process.env.PORT || 3000);
const dbDir = path.resolve("work");
const dbPath = path.join(dbDir, "preview-db.json");

async function readDb() {
  await mkdir(dbDir, { recursive: true });
  if (!existsSync(dbPath)) {
    await writeFile(dbPath, JSON.stringify({ projects: [] }, null, 2), "utf8");
  }
  return JSON.parse(await readFile(dbPath, "utf8"));
}

async function writeDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function send(res, status, body, contentType = "text/html; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(title, body) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body{margin:0;background:#f7fafc;color:#172033;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    a{color:#086f9b;text-decoration:none}.wrap{max-width:1120px;margin:0 auto;padding:32px 20px}.hero{min-height:70vh;display:flex;flex-direction:column;justify-content:center}
    h1{font-size:44px;margin:8px 0 14px}h2{margin:0 0 12px}.muted{color:#5d6b7a}.btn{display:inline-flex;align-items:center;gap:8px;border:1px solid #cbd5df;background:#0877a6;color:white;border-radius:8px;padding:10px 14px;font-weight:650;cursor:pointer}
    .btn.secondary{background:white;color:#172033}.btn:disabled{opacity:.55;cursor:not-allowed}.grid{display:grid;gap:16px}.card{background:white;border:1px solid #d8e1ea;border-radius:8px;padding:20px}.row{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center}
    label{display:grid;gap:7px;font-size:14px;font-weight:650}input,textarea,select{border:1px solid #cbd5df;border-radius:8px;padding:10px;font:inherit;background:white}textarea{min-height:92px}
    .form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.full{grid-column:1/-1}.workspace{display:grid;grid-template-columns:220px 1fr 280px;gap:18px}.nav button{width:100%;text-align:left;margin-bottom:8px}
    .topic{border:1px solid #d8e1ea;border-radius:8px;padding:16px;margin-top:12px;background:#fff}.pill{display:inline-block;background:#e8f2f7;border-radius:999px;padding:3px 9px;margin:3px;font-size:12px}.markdown{white-space:pre-wrap;line-height:1.55}
    .tabs>div{display:none}.tabs>div.active{display:block}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.stack{display:grid;gap:14px}
    @media(max-width:900px){.workspace,.form,.row,.two{grid-template-columns:1fr}h1{font-size:34px}}
  </style>
</head>
<body>${body}</body>
</html>`;
}

function home() {
  return layout("AI实践调研Agent", `<main class="wrap hero">
    <p class="muted">高校社会实践队调研助手</p>
    <h1>AI实践调研Agent</h1>
    <p class="muted">创建项目、生成选题、确认主选题、生成方案，并继续准备访谈提纲。</p>
    <p><a class="btn" href="/projects">进入项目</a> <a class="btn secondary" href="/projects/new">新建项目</a></p>
  </main>`);
}

function projectsPage(projects) {
  return layout("项目列表", `<main class="wrap">
    <div class="row"><div><p class="muted">项目列表</p><h1>社会实践调研项目</h1></div><a class="btn" href="/projects/new">新建项目</a></div>
    <div class="grid">${projects.length ? projects.map((p) => `<section class="card row">
      <div><h2>${escapeHtml(p.name)}</h2><p class="muted">类型：${escapeHtml(p.practiceType)} ｜ 地点：${escapeHtml(p.location)} ｜ 阶段：${escapeHtml(p.stage)} ｜ 更新：${new Date(p.updatedAt).toLocaleString("zh-CN")}</p></div>
      <a class="btn secondary" href="/projects/${p.id}">进入项目</a>
    </section>`).join("") : `<section class="card"><h2>还没有项目</h2><p class="muted">创建第一个项目，开始调研准备闭环。</p></section>`}</div>
  </main>`);
}

function field(label, name, type = "text", value = "") {
  return `<label>${label}<input required name="${name}" type="${type}" value="${escapeHtml(value)}" /></label>`;
}

function newProjectPage() {
  return layout("新建项目", `<main class="wrap">
    <a href="/projects">返回项目列表</a><h1>新建实践调研项目</h1>
    <section class="card"><form id="form" class="form">
      ${field("项目名称", "name")}${field("实践类型", "practiceType")}${field("实践主题", "theme")}${field("实践地点", "location")}
      ${field("实践开始时间", "startDate", "date")}${field("实践结束时间", "endDate", "date")}${field("团队人数", "teamSize", "number", "6")}${field("预期成果", "expectedOutcome")}
      <label class="full">其他要求<textarea name="requirements"></textarea></label>
      <p id="error" class="full" style="color:#b91c1c"></p><button class="btn full">创建项目</button>
    </form></section>
    <script>
      document.querySelector("#form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target).entries());
        data.teamSize = Number(data.teamSize || 0);
        const response = await fetch("/api/projects", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) });
        const result = await response.json();
        if (!response.ok) document.querySelector("#error").textContent = result.error || "创建失败";
        else location.href = "/projects/" + result.id;
      });
    </script>
  </main>`);
}

function workspace(project) {
  const topicsHtml = project.topics?.map((t, index) => `<div class="topic">
    <h3>${escapeHtml(t.title)}</h3><p class="muted">${escapeHtml(t.researchQuestion)}</p>
    <p>${t.interviewTargets.map((x) => `<span class="pill">${escapeHtml(x)}</span>`).join("")}</p>
    <p>方法：${t.methods.map(escapeHtml).join("、")} ｜ 可行性：${t.feasibilityScore}/10 ｜ 创新性：${t.innovationScore}/10 ｜ 难度：${escapeHtml(t.difficulty)}</p>
    <p class="muted">${escapeHtml(t.reason)}</p>
    <button class="btn secondary" onclick="selectTopic(${index})">${project.selectedTopic?.title === t.title ? "已选为主选题" : "选择为主选题"}</button>
  </div>`).join("") || `<div class="card muted">点击按钮生成候选选题。</div>`;

  return layout(project.name, `<main class="wrap">
    <a href="/projects">返回项目列表</a><h1>${escapeHtml(project.name)}</h1><p class="muted">当前阶段：${escapeHtml(project.stage)}</p>
    <div class="workspace">
      <aside class="card nav"><h2>流程导航</h2>
        <button class="btn secondary" onclick="showTab('topics')">选题设计</button>
        <button class="btn secondary" onclick="showTab('plan')">调研方案</button>
        <button class="btn secondary" onclick="showTab('interview')">访谈提纲</button>
      </aside>
      <section class="tabs">
        <div id="topics" class="active"><section class="card row"><div><h2>选题设计</h2><p class="muted">生成 5 个候选选题，并选择一个主选题。</p></div><button class="btn" onclick="generateTopics()">生成5个候选选题</button></section>${topicsHtml}</div>
        <div id="plan"><section class="card"><h2>调研方案</h2><p class="muted">主选题：${escapeHtml(project.selectedTopic?.title || "请先选择主选题")}</p><button class="btn" onclick="generatePlan()" ${project.selectedTopic ? "" : "disabled"}>生成并保存方案</button> <button class="btn secondary" onclick="savePlan()">保存编辑</button><textarea id="planText" style="width:100%;min-height:360px;margin-top:14px">${escapeHtml(project.researchPlan || "")}</textarea><h3>预览</h3><div class="markdown">${escapeHtml(project.researchPlan || "生成后将在这里预览。")}</div></section></div>
        <div id="interview">${interviewModule(project)}</div>
      </section>
      <aside class="card"><h2>AI助手</h2><p class="muted">当前预览服务使用 mock 数据。访谈提纲会保存到当前项目的本地 JSON 数据中。</p></aside>
    </div>
    <script>
      const projectId = ${JSON.stringify(project.id)};
      const topics = ${JSON.stringify(project.topics || [])};
      function showTab(id){document.querySelectorAll(".tabs>div").forEach(el=>el.classList.remove("active"));document.querySelector("#"+id).classList.add("active")}
      async function post(url, body){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined}); if(!r.ok) alert((await r.json()).error || "操作失败"); else location.reload();}
      function generateTopics(){post("/api/projects/"+projectId+"/topics")}
      function selectTopic(index){post("/api/projects/"+projectId+"/select-topic",{topic:topics[index]})}
      function generatePlan(){post("/api/projects/"+projectId+"/plan")}
      async function savePlan(){const markdown=document.querySelector("#planText").value; const r=await fetch("/api/projects/"+projectId+"/plan",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({markdown})}); if(!r.ok) alert((await r.json()).error || "保存失败"); else location.reload();}
      function toggleCustomTarget(){document.querySelector("#customTargetWrap").style.display=document.querySelector("#targetType").value==="自定义对象"?"grid":"none"}
      async function generateInterview(){const payload=interviewPayload(); const r=await fetch("/api/projects/"+projectId+"/interview-outline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); if(!r.ok) alert((await r.json()).error || "生成失败"); else location.reload();}
      async function saveInterview(){const payload=interviewPayload(); payload.markdown=document.querySelector("#interviewText").value; const r=await fetch("/api/projects/"+projectId+"/interview-outline",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); if(!r.ok) alert((await r.json()).error || "保存失败"); else location.reload();}
      function interviewPayload(){return {targetType:document.querySelector("#targetType").value,customTarget:document.querySelector("#customTarget").value,durationMinutes:Number(document.querySelector("#durationMinutes").value || 45),hasSensitiveTopics:document.querySelector("#hasSensitiveTopics").checked,focusQuestions:document.querySelector("#focusQuestions").value}}
    </script>
  </main>`);
}

function interviewModule(project) {
  const form = project.interviewOutlineForm || {
    targetType: "基层干部",
    customTarget: "",
    durationMinutes: 45,
    hasSensitiveTopics: false,
    focusQuestions: ""
  };
  const targets = ["基层干部", "村干部/社区干部", "驻村干部", "普通群众", "政府工作人员", "专家学者", "自定义对象"];
  return `<section class="card stack">
    <div class="row"><div><h2>访谈提纲</h2><p class="muted">选择访谈对象并填写约束，生成可编辑的结构化访谈提纲。</p></div><div><button class="btn secondary" onclick="saveInterview()">保存提纲</button> <button class="btn" onclick="generateInterview()">生成访谈提纲</button></div></div>
    <div class="form">
      <label>访谈对象类型<select id="targetType" onchange="toggleCustomTarget()">${targets.map((t) => `<option value="${t}" ${form.targetType === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>访谈时长（分钟）<input id="durationMinutes" type="number" min="10" value="${escapeHtml(form.durationMinutes)}" /></label>
      <label id="customTargetWrap" class="full" style="display:${form.targetType === "自定义对象" ? "grid" : "none"}">自定义对象<input id="customTarget" value="${escapeHtml(form.customTarget || "")}" placeholder="如：返乡创业青年、非遗传承人" /></label>
      <label class="full" style="display:flex;gap:8px;align-items:center"><input id="hasSensitiveTopics" type="checkbox" ${form.hasSensitiveTopics ? "checked" : ""} /> 涉及敏感议题</label>
      <label class="full">希望重点了解的问题<textarea id="focusQuestions">${escapeHtml(form.focusQuestions || "")}</textarea></label>
    </div>
    ${project.interviewOutlineSavedAt ? `<p class="muted">已保存：${new Date(project.interviewOutlineSavedAt).toLocaleString("zh-CN")}</p>` : ""}
    <div class="two">
      <div><h3>提纲编辑</h3><textarea id="interviewText" style="width:100%;min-height:420px">${escapeHtml(project.interviewOutline || "")}</textarea></div>
      <div><h3>提纲预览</h3><div class="card markdown">${escapeHtml(project.interviewOutline || "生成后将在这里预览。")}</div></div>
    </div>
  </section>`;
}

function mockTopics(project) {
  return Array.from({ length: 5 }, (_, index) => ({
    title: `${project.location}${project.theme}调研选题 ${index + 1}`,
    researchQuestion: `当地如何理解并参与${project.theme}，关键影响因素是什么？`,
    interviewTargets: ["社区居民", "基层干部", "志愿组织负责人"],
    methods: ["半结构访谈", "问卷调查", "现场观察"],
    feasibilityScore: 9 - (index % 3),
    innovationScore: 7 + (index % 3),
    difficulty: ["低", "中", "高"][index % 3],
    reason: "对象易触达，能形成定量与定性结合的实践材料。"
  }));
}

function mockPlan(project) {
  const topic = project.selectedTopic;
  return `# ${topic.title}调研方案

## 调研背景
本项目围绕“${project.theme}”展开，实践地点为${project.location}。

## 调研目的
回答核心问题：${topic.researchQuestion}

## 核心问题
- 当地真实需求是什么？
- 现有实践机制有哪些不足？
- 高校实践队可以提出哪些建议？

## 调研对象
${topic.interviewTargets.map((x) => `- ${x}`).join("\n")}

## 调研方法
${topic.methods.map((x) => `- ${x}`).join("\n")}

## 日程安排
- 前期准备：确定对象与工具。
- 实地调研：访谈、问卷、观察。
- 资料整理：汇总数据与发现。

## 成员分工
- 负责人：统筹进度。
- 访谈组：联系并访谈对象。
- 资料组：整理材料。

## 预期成果
${project.expectedOutcome}

## 风险预案
- 准备备选访谈对象。
- 每日复盘调研进度。`;
}

function mockInterviewOutline(project, form) {
  const target = form.targetType === "自定义对象" ? form.customTarget || "自定义对象" : form.targetType;
  const focus = form.focusQuestions || `围绕${project.theme}了解实际情况、主要困难和改进建议。`;
  const sensitive = form.hasSensitiveTopics
    ? ["将“是否存在矛盾/冲突”替换为“推进过程中有哪些需要协调的地方”。", "将“责任在谁”替换为“哪些环节还有进一步优化空间”。", "将“群众是否不满意”替换为“大家反馈比较集中的期待是什么”。"]
    : ["本次访谈未标记敏感议题。如现场出现敏感内容，可使用更中性的描述方式继续追问。"];

  return `# 访谈提纲

## 开场白
您好，我们是“${project.name}”社会实践团队，正在${project.location}围绕“${project.theme}”开展调研。本次访谈预计约 ${form.durationMinutes} 分钟，内容仅用于实践研究分析，我们会尊重您的真实表达并做好信息保护。

## 基础信息问题
1. 请您简单介绍一下自己的工作/生活背景，以及与“${project.theme}”相关的经历。
2. 您平时接触${project.theme}相关事务的频率高吗？主要通过哪些渠道了解？
3. 在您看来，近几年当地相关工作或生活环境发生了哪些变化？

## 核心问题
1. 围绕“${focus}”，您认为最值得关注的问题是什么？
2. 从${target}的视角看，目前最明显的成效和不足分别是什么？
3. 哪些主体在其中发挥了关键作用？他们之间的协同是否顺畅？
4. 如果要让相关工作更可持续，您认为最需要优先改进的是什么？

## 深度追问
1. 您刚才提到的这个现象，有没有具体案例可以展开说说？
2. 这个问题大概从什么时候开始变得明显？背后可能有哪些原因？
3. 不同群体对这件事的看法是否一致？分歧主要在哪里？
4. 如果资源有限，您觉得最先应该做哪一件事？为什么？

## 敏感问题替代表达
${sensitive.map((item) => `- ${item}`).join("\n")}

## 结束语
非常感谢您的分享。后续我们会对访谈内容进行整理归纳，如有需要补充或核对的信息，也希望能再次向您请教。

## 记录提示
- 记录原话中的关键词、具体案例、时间地点和涉及主体。
- 区分事实描述、个人判断和改进建议，避免混在一起。
- 敏感内容只记录研究必要信息，避免记录可识别个人隐私的细节。
- 访谈结束后 30 分钟内补充现场观察和访谈员感受。`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    const db = await readDb();

    if (req.method === "GET" && url.pathname === "/") return send(res, 200, home());
    if (req.method === "GET" && url.pathname === "/projects") return send(res, 200, projectsPage(db.projects));
    if (req.method === "GET" && url.pathname === "/projects/new") return send(res, 200, newProjectPage());

    if (req.method === "GET" && url.pathname === "/api/projects") return send(res, 200, JSON.stringify(db.projects), "application/json");
    if (req.method === "POST" && url.pathname === "/api/projects") {
      const body = await readJson(req);
      const required = ["name", "practiceType", "theme", "location", "startDate", "endDate", "expectedOutcome"];
      const missing = required.filter((key) => !body[key]);
      if (missing.length) return send(res, 400, JSON.stringify({ error: "请填写完整项目信息" }), "application/json");
      const project = { ...body, id: crypto.randomUUID(), stage: "调研前准备", topics: null, selectedTopic: null, researchPlan: null, interviewOutline: "", interviewOutlineForm: null, interviewOutlineSavedAt: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.projects.unshift(project);
      await writeDb(db);
      return send(res, 201, JSON.stringify(project), "application/json");
    }

    const projectMatch = url.pathname.match(/^\/projects\/([^/]+)$/);
    if (req.method === "GET" && projectMatch) {
      const project = db.projects.find((item) => item.id === projectMatch[1]);
      return project ? send(res, 200, workspace(project)) : send(res, 404, "项目不存在");
    }

    const apiMatch = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(topics|select-topic|plan|interview-outline))?$/);
    if (apiMatch) {
      const project = db.projects.find((item) => item.id === apiMatch[1]);
      if (!project) return send(res, 404, JSON.stringify({ error: "项目不存在" }), "application/json");
      if (req.method === "GET") return send(res, 200, JSON.stringify(project), "application/json");
      if (req.method === "POST" && apiMatch[2] === "topics") {
        project.topics = mockTopics(project);
        project.selectedTopic = null;
        project.researchPlan = null;
        project.stage = "选题设计";
      } else if (req.method === "POST" && apiMatch[2] === "select-topic") {
        project.selectedTopic = (await readJson(req)).topic;
        project.stage = "调研方案";
      } else if (req.method === "POST" && apiMatch[2] === "plan") {
        if (!project.selectedTopic) return send(res, 400, JSON.stringify({ error: "请先确认主选题" }), "application/json");
        project.researchPlan = mockPlan(project);
        project.stage = "方案已保存";
      } else if (req.method === "PATCH" && apiMatch[2] === "plan") {
        project.researchPlan = (await readJson(req)).markdown;
        project.stage = "方案已保存";
      } else if (req.method === "POST" && apiMatch[2] === "interview-outline") {
        const form = await readJson(req);
        project.interviewOutlineForm = form;
        project.interviewOutline = mockInterviewOutline(project, form);
        project.interviewOutlineSavedAt = new Date().toISOString();
        project.stage = "访谈提纲";
      } else if (req.method === "PATCH" && apiMatch[2] === "interview-outline") {
        const body = await readJson(req);
        project.interviewOutlineForm = body;
        project.interviewOutline = body.markdown || "";
        project.interviewOutlineSavedAt = new Date().toISOString();
        project.stage = "访谈提纲";
      }
      project.updatedAt = new Date().toISOString();
      await writeDb(db);
      return send(res, 200, JSON.stringify(project), "application/json");
    }

    send(res, 404, "Not found");
  } catch (error) {
    send(res, 500, String(error));
  }
});

server.listen(port, () => {
  console.log(`Preview server listening on http://localhost:${port}`);
});
