"use strict";
const demo = {
  name: "Demo: Customer Inquiry Flow",
  nodes: [
    { id: "1", name: "Webhook", type: "n8n-nodes-base.webhook" },
    { id: "2", name: "Validate Input", type: "n8n-nodes-base.if" },
    {
      id: "3",
      name: "Gemini AI",
      type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
    },
    { id: "4", name: "Google Sheets", type: "n8n-nodes-base.googleSheets" },
    { id: "5", name: "Send Email", type: "n8n-nodes-base.gmail" },
    { id: "6", name: "Respond", type: "n8n-nodes-base.respondToWebhook" },
  ],
  connections: {
    Webhook: { main: [[{ node: "Validate Input", type: "main", index: 0 }]] },
    "Validate Input": {
      main: [[{ node: "Gemini AI", type: "main", index: 0 }]],
    },
    "Gemini AI": {
      main: [[{ node: "Google Sheets", type: "main", index: 0 }]],
    },
    "Google Sheets": {
      main: [[{ node: "Send Email", type: "main", index: 0 }]],
    },
    "Send Email": { main: [[{ node: "Respond", type: "main", index: 0 }]] },
  },
};
const $ = (id) => document.getElementById(id);
let current = demo;
function analyze(workflow, isDemo = false) {
  if (
    !workflow ||
    !Array.isArray(workflow.nodes) ||
    typeof workflow.connections !== "object" ||
    workflow.connections === null ||
    Array.isArray(workflow.connections)
  )
    throw Error(
      "Invalid n8n workflow: expected nodes array and connections object.",
    );
  if (workflow.nodes.length > 1000)
    throw Error("Too many nodes for this preview (max 1,000).");
  const nodes = workflow.nodes;
  let links = 0;
  for (const outputs of Object.values(workflow.connections)) {
    if (!outputs || typeof outputs !== "object") continue;
    for (const branches of Object.values(outputs)) {
      if (!Array.isArray(branches)) continue;
      for (const branch of branches) {
        if (Array.isArray(branch))
          links += branch.filter((x) => x && typeof x.node === "string").length;
      }
    }
  }
  const triggers = nodes.filter((n) =>
    /trigger|webhook|schedule|manualTrigger/i.test(String(n.type || "")),
  ).length;
  $("nodesCount").textContent = String(nodes.length).padStart(2, "0");
  $("connectionsCount").textContent = String(links).padStart(2, "0");
  $("triggersCount").textContent = String(triggers).padStart(2, "0");
  $("workflowStatus").textContent = isDemo ? "Demo" : "Imported";
  $("statusDetail").textContent = isDemo
    ? "Sample data"
    : "Local JSON inspection";
  $("workflowName").textContent = String(
    workflow.name || "Unnamed workflow",
  ).slice(0, 100);
  const list = $("nodeList");
  list.replaceChildren();
  if (!nodes.length) {
    list.textContent = "No nodes found.";
  }
  nodes.forEach((n, i) => {
    const item = document.createElement("div");
    item.className = "node-item";
    const title = document.createElement("strong");
    title.textContent = `${i + 1}. ${String(n.name || "Unnamed node").slice(0, 100)}`;
    const subtitle = document.createElement("small");
    subtitle.textContent = String(n.type || "Unknown type").slice(0, 160);
    item.append(title, subtitle);
    list.appendChild(item);
  });
  current = workflow;
  renderPhase2(workflow);
  setMessage(
    isDemo
      ? "Demo workflow loaded. Upload your own to inspect it."
      : `Loaded ${nodes.length} nodes and ${links} connections. File inspected locally.`,
  );
}
function setMessage(msg, error = false) {
  $("message").textContent = msg;
  $("message").classList.toggle("error", error);
}
async function readFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".json"))
    return setMessage("Please select a .json file.", true);
  if (file.size > 2 * 1024 * 1024)
    return setMessage("File is too large. Maximum size is 2 MB.", true);
  try {
    const data = JSON.parse(await file.text());
    analyze(data);
  } catch (e) {
    setMessage(
      e instanceof SyntaxError ? "Invalid JSON file." : e.message,
      true,
    );
  }
}
$("dropzone").addEventListener("click", () => $("fileInput").click());
$("dropzone").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    $("fileInput").click();
  }
});
$("fileInput").addEventListener("change", (e) => {
  readFile(e.target.files[0]);
  e.target.value = "";
});
for (const name of ["dragenter", "dragover"])
  $("dropzone").addEventListener(name, (e) => {
    e.preventDefault();
    $("dropzone").classList.add("dragover");
  });
for (const name of ["dragleave", "drop"])
  $("dropzone").addEventListener(name, (e) => {
    e.preventDefault();
    $("dropzone").classList.remove("dragover");
  });
$("dropzone").addEventListener("drop", (e) =>
  readFile(e.dataTransfer.files[0]),
);
$("demoBtn").addEventListener("click", () => analyze(demo, true));
$("clearBtn").addEventListener("click", () => {
  const empty = { name: "No workflow selected", nodes: [], connections: {} };
  analyze(empty);
  $("workflowStatus").textContent = "Empty";
  setMessage("Cleared. Upload an n8n JSON workflow to begin.");
});
document.querySelectorAll("[data-volume]").forEach((b) =>
  b.addEventListener("click", () => {
    document
      .querySelectorAll("[data-volume]")
      .forEach((x) => x.classList.remove("selected"));
    b.classList.add("selected");
  }),
);
$("menuBtn").addEventListener("click", () =>
  document.querySelector(".sidebar").classList.toggle("open"),
);
document
  .querySelectorAll("nav a")
  .forEach((a) =>
    a.addEventListener("click", () =>
      document.querySelector(".sidebar").classList.remove("open"),
    ),
  );
analyze(demo, true);

// Phase 2: client-only, rule-based analysis. Never executes imported code or nodes.
function getEdges(w) {
  const edges = [];
  for (const [source, ports] of Object.entries(w.connections || {})) {
    if (!ports || typeof ports !== "object") continue;
    for (const [port, groups] of Object.entries(ports)) {
      if (!Array.isArray(groups)) continue;
      groups.forEach((group, branch) => {
        if (!Array.isArray(group)) return;
        group.forEach((target) => {
          if (target && typeof target.node === "string")
            edges.push({ source, target: target.node, port, branch });
        });
      });
    }
  }
  return edges;
}
function renderPhase2(w) {
  const nodes = w.nodes || [],
    edges = getEdges(w),
    names = new Set(nodes.map((n) => n.name));
  const findings = [];
  const add = (level, title, detail) => findings.push({ level, title, detail });
  const ids = new Set(),
    seenNames = new Set();
  for (const n of nodes) {
    if (!n.name || !n.type)
      add("error", "Incomplete node", `A node has no name or type.`);
    if (n.id && ids.has(n.id))
      add("warning", "Duplicate node ID", `Node ID is repeated.`);
    if (n.id) ids.add(n.id);
    if (seenNames.has(n.name))
      add(
        "error",
        "Duplicate node name",
        `“${n.name}” appears more than once.`,
      );
    seenNames.add(n.name);
    if (n.disabled) add("info", "Disabled node", `“${n.name}” is disabled.`);
  }
  for (const e of edges) {
    if (!names.has(e.source))
      add(
        "error",
        "Missing source node",
        `Connection starts from unknown node “${e.source}”.`,
      );
    if (!names.has(e.target))
      add(
        "error",
        "Missing target node",
        `Connection points to unknown node “${e.target}”.`,
      );
  }
  const incident = new Set(edges.flatMap((e) => [e.source, e.target]));
  for (const n of nodes) {
    if (!incident.has(n.name) && nodes.length > 1)
      add(
        "warning",
        "Disconnected node",
        `“${n.name}” has no exported connections.`,
      );
  }
  const mainEdges = edges.filter((e) => e.port === "main");
  const mainIncoming = new Set(mainEdges.map((e) => e.target));
  const mainOutgoing = new Set(mainEdges.map((e) => e.source));
  const isTrigger = (n) => /trigger|webhook/i.test(String(n.type || ""));
  for (const n of nodes) {
    if (isTrigger(n) && !mainOutgoing.has(n.name) && nodes.length > 1)
      add(
        "warning",
        "Trigger has no main output",
        `“${n.name}” has no main-path connection.`,
      );
  }
  if (nodes.length === 0)
    add("info", "No workflow loaded", "Upload a JSON file or load the demo.");
  if (nodes.length > 0 && edges.length === 0)
    add("warning", "No connections", "The exported workflow has no links.");
  if (nodes.length > 0 && findings.length === 0)
    add(
      "info",
      "No basic structural issues detected",
      "This does not guarantee that the workflow will run successfully.",
    );
  const counts = { error: 0, warning: 0, info: 0 };
  findings.forEach((f) => counts[f.level]++);
  $("errorCount").textContent = counts.error;
  $("warningCount").textContent = counts.warning;
  $("infoCount").textContent = counts.info;
  $("riskSummary").textContent = counts.error
    ? "ERRORS FOUND"
    : counts.warning
      ? "CHECK WARNINGS"
      : "BASIC CHECKS PASSED";
  const list = $("riskList");
  list.replaceChildren();
  for (const f of findings) {
    const item = document.createElement("article");
    item.className = "risk-item " + f.level;
    const title = document.createElement("strong");
    title.textContent = f.level.toUpperCase() + " · " + f.title;
    const desc = document.createElement("p");
    desc.textContent = f.detail;
    item.append(title, desc);
    list.appendChild(item);
  }
  renderMap(nodes, edges, mainIncoming, mainOutgoing);
}
function renderMap(nodes, edges, incoming, outgoing) {
  const host = $("workflowMap");
  host.replaceChildren();
  if (!nodes.length) {
    host.textContent = "No nodes to display.";
    return;
  }
  const positions = new Map();
  const n = nodes.length;
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(n))));
  const rows = Math.ceil(n / cols);
  const cellW = 230,
    cellH = 125,
    pad = 35;
  const width = cols * cellW + pad * 2,
    height = rows * cellH + pad * 2;
  nodes.forEach((node, i) =>
    positions.set(node.name, {
      x: pad + (i % cols) * cellW,
      y: pad + Math.floor(i / cols) * cellH,
    }),
  );
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Node connection diagram");
  const defs = document.createElementNS(ns, "defs");
  const marker = document.createElementNS(ns, "marker");
  for (const [k, v] of Object.entries({
    id: "arrow",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "7",
    markerHeight: "7",
    orient: "auto-start-reverse",
  }))
    marker.setAttribute(k, v);
  const triangle = document.createElementNS(ns, "path");
  triangle.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  triangle.setAttribute("fill", "#37d4eb");
  marker.appendChild(triangle);
  defs.appendChild(marker);
  svg.appendChild(defs);
  edges.forEach((e) => {
    const a = positions.get(e.source),
      b = positions.get(e.target);
    if (!a || !b) return;
    const line = document.createElementNS(ns, "path");
    const x1 = a.x + 172,
      y1 = a.y + 25,
      x2 = b.x,
      y2 = b.y + 25;
    const bend = Math.max(30, Math.abs(x2 - x1) / 2);
    line.setAttribute(
      "d",
      `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
    );
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", e.port === "main" ? "#37d4eb" : "#a58aff");
    line.setAttribute("stroke-width", "2");
    if (e.port !== "main") line.setAttribute("stroke-dasharray", "5 5");
    line.setAttribute("marker-end", "url(#arrow)");
    svg.appendChild(line);
  });
  nodes.forEach((node, i) => {
    const p = positions.get(node.name);
    const group = document.createElementNS(ns, "g");
    const rect = document.createElementNS(ns, "rect");
    for (const [k, v] of Object.entries({
      x: p.x,
      y: p.y,
      width: 172,
      height: 52,
      rx: 10,
      fill: node.disabled ? "#2b2939" : "#202c4d",
      stroke: node.disabled ? "#b68c6c" : "#7086bb",
    }))
      rect.setAttribute(k, String(v));
    group.appendChild(rect);
    const title = document.createElementNS(ns, "text");
    title.setAttribute("x", String(p.x + 12));
    title.setAttribute("y", String(p.y + 21));
    title.setAttribute("fill", "#f4f6ff");
    title.setAttribute("font-size", "12");
    const label = String(node.name || "Unnamed");
    title.textContent = label.length > 23 ? label.slice(0, 22) + "…" : label;
    group.appendChild(title);
    const subtitle = document.createElementNS(ns, "text");
    subtitle.setAttribute("x", String(p.x + 12));
    subtitle.setAttribute("y", String(p.y + 39));
    subtitle.setAttribute("fill", "#9aadd2");
    subtitle.setAttribute("font-size", "10");
    subtitle.textContent = node.disabled
      ? "Disabled"
      : String(node.type || "Unknown")
          .split(".")
          .pop()
          .slice(0, 26);
    group.appendChild(subtitle);
    svg.appendChild(group);
  });
  host.appendChild(svg);
}
// Gemini AI Integration - Button Click Event

$("analyzeAiBtn").addEventListener("click", async () => {
  $("aiStatus").textContent = "Preparing workflow for AI analysis...";
  $("aiResult").textContent = "";
  const workflowData = current;
  const payload = {
  workflowName: workflowData.name || "Unnamed Workflow",
  nodes: workflowData.nodes,
  connections: workflowData.connections
};
const webhookUrl = "/.netlify/functions/analyze";
try {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

 if (!response.ok) {
  const errorDetails = await response.text();
  throw new Error(`HTTP ${response.status}: ${errorDetails}`);
}

  const result = await response.text();
$("aiResult").textContent = result;
  $("aiStatus").textContent = "AI analysis completed successfully!";
} catch (error) {
  $("aiStatus").textContent = "AI analysis failed. Please try again.";
  console.error(error);
}
});

// Simulation Lab — Request Volume Selection
let selectedVolume = 10;

document.querySelectorAll("#requests button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedVolume = Number(button.dataset.volume);

    document.querySelectorAll("#requests button").forEach((btn) => {
      btn.classList.remove("selected");
    });

    button.classList.add("selected");
    console.log("Selected simulation volume:", selectedVolume);
  });
});

document.getElementById("runSimulation").addEventListener("click", () => {
 const nodeCount = current.nodes.length;
  const estimatedTime = nodeCount * 0.5 * selectedVolume;
  const estimatedMinutes = estimatedTime / 60;
  const totalExecutions = nodeCount * selectedVolume;

  const resultBox = document.querySelector(".simulation-placeholder");

  resultBox.innerHTML = `
    <h4>Simulation Results</h4>
    <p>Requests: ${selectedVolume}</p>
    <p>Workflow Nodes: ${nodeCount}</p>
    <p>Estimated Node Executions: ${totalExecutions.toLocaleString()}</p>
    <p>Estimated Total Processing Time: ${estimatedTime.toFixed(1)} seconds</p>
    <p>Estimated Duration: ${estimatedMinutes.toFixed(1)} minutes</p>
    <p>Assumption: 0.5 seconds per node per request, processed sequentially.</p>
  `;
});
