import { Client, isNotionClientError } from "@notionhq/client";
import { markdownToBlocks } from "@tryfabric/martian";
import * as yaml from "js-yaml";
import * as fs from "node:fs";
import * as path from "node:path";
import { watch as chokidarWatch } from "chokidar";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ARTIFACTS_DIR = path.resolve(
  process.env.ARTIFACTS_DIR ?? "_bmad-output/implementation-artifacts",
);
const SPRINT_FILE = path.join(
  ARTIFACTS_DIR,
  process.env.SPRINT_FILE ?? "sprint-status.yaml",
);
const STATE_FILE = path.resolve(
  process.env.STATE_FILE ?? ".notion-sync-state.json",
);

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID!;

if (!NOTION_API_KEY || !NOTION_PAGE_ID) {
  console.error(
    "[notion-sync] Missing NOTION_API_KEY or NOTION_PAGE_ID in .env",
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncState {
  databaseId: string;
  pageMap: Record<string, string>; // entry ID → Notion page ID
}

interface SprintStatus {
  project: string;
  last_updated: string;
  development_status: Record<string, string>;
}

type EntryType = "epic" | "story" | "retrospective";

// Maps granular sprint statuses → Notion's three-lane Kanban status
const KANBAN_LANE: Record<string, string> = {
  backlog: "Not started",
  optional: "Not started",
  "ready-for-dev": "In progress",
  "in-progress": "In progress",
  review: "In progress",
  done: "Done",
};

// ---------------------------------------------------------------------------
// Rate-limit helper — Notion allows 3 req/s for standard integrations
// ---------------------------------------------------------------------------

const REQUEST_INTERVAL_MS = 350;
let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_INTERVAL_MS) {
    await sleep(REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestTime = Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

function loadState(): SyncState | null {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  return null;
}

function saveState(state: SyncState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// YAML helpers
// ---------------------------------------------------------------------------

function parseSprintStatus(): SprintStatus {
  const raw = fs.readFileSync(SPRINT_FILE, "utf-8");
  return yaml.load(raw) as SprintStatus;
}

function categorizeEntry(id: string): EntryType {
  if (id.endsWith("-retrospective")) return "retrospective";
  if (id.startsWith("epic-")) return "epic";
  return "story";
}

function epicForEntry(id: string): string {
  if (id.startsWith("epic-")) {
    const num = id.match(/^epic-(\d+)/)?.[1];
    return `epic-${num}`;
  }
  const num = id.match(/^(\d+)/)?.[1];
  return num ? `epic-${num}` : "unknown";
}

function formatTitle(id: string): string {
  const type = categorizeEntry(id);
  if (type === "epic") return `Epic ${id.replace("epic-", "")}`;
  if (type === "retrospective") {
    const num = id.match(/epic-(\d+)/)?.[1] ?? "?";
    return `Epic ${num} Retrospective`;
  }
  const [epicNum, storyNum, ...words] = id.split("-");
  const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return `${epicNum}.${storyNum}: ${title}`;
}

// ---------------------------------------------------------------------------
// Notion — database setup
// ---------------------------------------------------------------------------

async function findOrCreateDatabase(
  cached: SyncState | null,
): Promise<SyncState> {
  if (cached?.databaseId) {
    try {
      await throttle();
      await notion.databases.retrieve({ database_id: cached.databaseId });
      return cached;
    } catch {
      console.log("[notion-sync] Cached database not found, recreating…");
    }
  }

  await throttle();
  const db = await notion.databases.create({
    parent: { page_id: NOTION_PAGE_ID },
    title: [{ text: { content: "Sprint Board" } }],
    properties: {
      Name: { title: {} },
      "Story ID": { rich_text: {} },
      Type: {
        select: {
          options: [
            { name: "epic", color: "purple" },
            { name: "story", color: "blue" },
            { name: "retrospective", color: "gray" },
          ],
        },
      },
      // @ts-expect-error — status type works at runtime but isn't in the SDK's create types
      Status: { status: {} },
      "Detail Status": {
        select: {
          options: [
            { name: "backlog", color: "default" },
            { name: "ready-for-dev", color: "blue" },
            { name: "in-progress", color: "yellow" },
            { name: "review", color: "orange" },
            { name: "done", color: "green" },
            { name: "optional", color: "gray" },
          ],
        },
      },
      Epic: { select: {} },
    },
  });

  console.log(`[notion-sync] Created database: ${notionUrl(db.id)}`);
  const state: SyncState = { databaseId: db.id, pageMap: {} };
  saveState(state);
  return state;
}

function notionUrl(id: string): string {
  const clean = id.replace(/-/g, "");
  return `https://notion.so/${clean}`;
}

// ---------------------------------------------------------------------------
// Notion — upsert a single sprint entry (row in the database)
// ---------------------------------------------------------------------------

async function upsertEntry(
  state: SyncState,
  id: string,
  status: string,
): Promise<void> {
  const properties = {
    Name: { title: [{ text: { content: formatTitle(id) } }] },
    "Story ID": { rich_text: [{ text: { content: id } }] },
    Type: { select: { name: categorizeEntry(id) } },
    Status: { status: { name: KANBAN_LANE[status] ?? "Not started" } },
    "Detail Status": { select: { name: status } },
    Epic: { select: { name: epicForEntry(id) } },
  } as Record<string, unknown>;

  const existingPageId = state.pageMap[id];

  if (existingPageId) {
    await throttle();
    await notion.pages.update({
      page_id: existingPageId,
      properties: properties as Parameters<typeof notion.pages.update>[0]["properties"],
    });
  } else {
    await throttle();
    const page = await notion.pages.create({
      parent: { database_id: state.databaseId },
      properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
    });
    state.pageMap[id] = page.id;
  }
}

// ---------------------------------------------------------------------------
// Notion — sync markdown file content into a page's body
// ---------------------------------------------------------------------------

async function syncMarkdownToPage(
  state: SyncState,
  filename: string,
): Promise<void> {
  const id = path.basename(filename, ".md");
  const pageId = state.pageMap[id];
  if (!pageId) return;

  const filePath = path.join(ARTIFACTS_DIR, filename);
  if (!fs.existsSync(filePath)) return;

  const markdown = fs.readFileSync(filePath, "utf-8");
  const blocks = markdownToBlocks(markdown);

  // Clear existing blocks
  await throttle();
  const existing = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });
  for (const block of existing.results) {
    await throttle();
    await notion.blocks.delete({ block_id: block.id });
  }

  // Append new blocks in chunks of 100 (API limit)
  for (let i = 0; i < blocks.length; i += 100) {
    await throttle();
    await notion.blocks.children.append({
      block_id: pageId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: blocks.slice(i, i + 100) as any,
    });
  }
}

// ---------------------------------------------------------------------------
// Full sync
// ---------------------------------------------------------------------------

async function syncAll(): Promise<SyncState> {
  console.log("[notion-sync] Starting full sync…");

  const sprint = parseSprintStatus();
  const state = await findOrCreateDatabase(loadState());

  for (const [id, status] of Object.entries(sprint.development_status)) {
    console.log(`  ${id}: ${status}`);
    await upsertEntry(state, id, status);
  }
  saveState(state);

  // Sync markdown story files
  const mdFiles = fs
    .readdirSync(ARTIFACTS_DIR)
    .filter((f) => f.endsWith(".md"));

  for (const file of mdFiles) {
    const id = path.basename(file, ".md");
    if (state.pageMap[id]) {
      console.log(`  syncing content → ${file}`);
      await syncMarkdownToPage(state, file);
    }
  }

  saveState(state);
  console.log(
    `[notion-sync] Sync complete. Board: ${notionUrl(state.databaseId)}`,
  );
  return state;
}

// ---------------------------------------------------------------------------
// File watcher
// ---------------------------------------------------------------------------

async function watchMode(): Promise<void> {
  let state: SyncState;

  try {
    state = await syncAll();
  } catch (err) {
    handleError("Initial sync failed", err);
    process.exit(1);
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const watcher = chokidarWatch(ARTIFACTS_DIR, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher.on("all", (_event, filePath) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      const filename = path.basename(filePath);

      try {
        if (filename === "sprint-status.yaml") {
          console.log("[notion-sync] Sprint status changed, syncing…");
          const sprint = parseSprintStatus();
          for (const [id, status] of Object.entries(
            sprint.development_status,
          )) {
            await upsertEntry(state, id, status);
          }
          saveState(state);
          console.log("[notion-sync] Status sync complete.");
        } else if (filename.endsWith(".md")) {
          console.log(`[notion-sync] ${filename} changed, syncing…`);
          const sprint = parseSprintStatus();
          const id = path.basename(filename, ".md");
          const status = sprint.development_status[id];
          if (status && !state.pageMap[id]) {
            await upsertEntry(state, id, status);
            saveState(state);
          }
          await syncMarkdownToPage(state, filename);
          console.log("[notion-sync] Content sync complete.");
        }
      } catch (err) {
        handleError(`Failed to sync ${filename}`, err);
      }
    }, 1_000);
  });

  console.log(`[notion-sync] Watching ${ARTIFACTS_DIR} for changes…`);
  console.log("[notion-sync] Press Ctrl+C to stop.\n");
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

function handleError(context: string, err: unknown): void {
  if (isNotionClientError(err)) {
    console.error(`[notion-sync] ${context}: ${err.message}`);
    if (err.code === "rate_limited") {
      console.error("[notion-sync] Rate limited — will retry on next change.");
    }
  } else {
    console.error(`[notion-sync] ${context}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const command = process.argv[2];

if (command === "watch") {
  watchMode();
} else {
  syncAll().catch((err) => {
    handleError("Sync failed", err);
    process.exit(1);
  });
}
