#!/usr/bin/env node
/**
 * send-update.mjs — broadcast a newsletter update via the Worker's /broadcast endpoint.
 *
 * Usage:
 *   node sender/send-update.mjs path/to/update.md
 *   cat update.md | node sender/send-update.mjs
 *
 * Required environment variables:
 *   WORKER_URL      — e.g. https://newsletter-bot.\<your-subdomain\>.workers.dev
 *   WEBHOOK_SECRET  — same value you stored as the Worker secret
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
const WORKER_URL = process.env.WORKER_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
if (!WORKER_URL || !WEBHOOK_SECRET) {
  console.error(
    "Error: WORKER_URL and WEBHOOK_SECRET environment variables are required.",
  );
  process.exit(1);
}

async function readStdin() {
  return new Promise((resolve) => {
    const lines = [];
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => lines.push(line));
    rl.on("close", () => resolve(lines.join("\n")));
  });
}

async function main() {
  let text;
  const filePath = process.argv[2];

  if (filePath) {
    text = readFileSync(filePath, "utf8").trim();
  } else if (!process.stdin.isTTY) {
    text = (await readStdin()).trim();
  } else {
    console.error(
      "Error: provide a markdown file path or pipe content via stdin.",
    );
    process.exit(1);
  }

  if (!text) {
    console.error("Error: message text is empty.");
    process.exit(1);
  }

  console.log(`Sending ${text.length} characters to ${WORKER_URL}/broadcast …`);
  const response = await fetch(`${WORKER_URL}/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Error: Worker responded with ${response.status} — ${body}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(
    `✅ Done — ${result.sent}/${result.total} sent, ${result.failed} failed.`,
  );
}
main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
