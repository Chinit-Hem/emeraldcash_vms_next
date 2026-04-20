import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function listPidsFromLsof(args) {
  const result = spawnSync("lsof", args, { encoding: "utf8" });
  if (result.status !== 0) return [];

  return result.stdout
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => Number.parseInt(value, 10))
    .filter((pid) => Number.isFinite(pid));
}

function getCommand(pid) {
  const result = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
  return String(result.stdout || "").trim();
}

function listProjectNextDevPids(cwd) {
  const result = spawnSync("ps", ["-ax", "-o", "pid=,command="], { encoding: "utf8" });
  if (result.status !== 0) return [];

  const lines = String(result.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const pids = [];

  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(.*)$/);
    if (!match) continue;

    const pid = Number.parseInt(match[1], 10);
    const command = match[2] || "";
    if (!Number.isFinite(pid)) continue;

    // Only match "next dev" commands from THIS repo path.
    if (command.includes(`${cwd}/node_modules/.bin/next`) && command.includes(" dev")) {
      pids.push(pid);
      continue;
    }

    // Also cover "node .../next/dist/bin/next dev" style invocations.
    if (command.includes(`${cwd}/node_modules/next/`) && command.includes(" next") && command.includes(" dev")) {
      pids.push(pid);
    }
  }

  return pids;
}

function killPid(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

const lockPath = path.join(process.cwd(), ".next", "dev", "lock");
const nextDir = path.join(process.cwd(), ".next");
const cwd = process.cwd();

const hasLockFile = fs.existsSync(lockPath);
const hasNextDir = fs.existsSync(nextDir);

const projectDevPids = listProjectNextDevPids(cwd);
const port3000Pids = listPidsFromLsof(["-t", "-iTCP:3000", "-sTCP:LISTEN"]);
const port3001Pids = listPidsFromLsof(["-t", "-iTCP:3001", "-sTCP:LISTEN"]);

const candidates = new Set([...projectDevPids, ...port3000Pids, ...port3001Pids]);
const pidsToKill = [];

for (const pid of candidates) {
  const command = getCommand(pid);
  const looksLikeNext =
    command.includes("next-server") ||
    command.includes(" next dev") ||
    command.includes("/node_modules/.bin/next dev") ||
    command.includes("/node_modules/next/");

  const belongsToRepo =
    command.includes(cwd) || command.includes("next-server");

  if (looksLikeNext && belongsToRepo) pidsToKill.push(pid);
}

const uniquePidsToKill = Array.from(new Set(pidsToKill)).sort((a, b) => a - b);

for (let attempt = 0; attempt < 6; attempt++) {
  if (uniquePidsToKill.length === 0) break;

  const signal = attempt < 3 ? "SIGTERM" : "SIGKILL";
  for (const pid of uniquePidsToKill) killPid(pid, signal);

  sleep(350);

  // If nothing is listening on 3000/3001 anymore, we can stop early.
  const still3000 = listPidsFromLsof(["-t", "-iTCP:3000", "-sTCP:LISTEN"]);
  const still3001 = listPidsFromLsof(["-t", "-iTCP:3001", "-sTCP:LISTEN"]);
  if (still3000.length === 0 && still3001.length === 0) break;
}

try {
  fs.rmSync(lockPath, { force: true });
} catch {
  // ignore
}

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
} catch {
  // ignore
}

if (uniquePidsToKill.length > 0) {
  console.log(`Stopped Next dev processes: ${uniquePidsToKill.join(", ")}.`);
}

if (hasLockFile) {
  console.log("Removed .next/dev/lock.");
} else {
  console.log("No .next/dev/lock found.");
}

if (hasNextDir) {
  console.log("Removed .next directory.");
} else {
  console.log("No .next directory found.");
}
