// System prompts
export const CLAUDE_SYSTEM_PROMPT = "You are Claude Code, Anthropic's official CLI for Claude.";
// Rewrite rules applied to Antigravity system prompts: competing-client branding
// makes the backend flag the request and answer 429 Quota Exhausted.
export const ANTIGRAVITY_PROMPT_REWRITES = [
  { from: "You are a Claude agent, built on Anthropic's Claude Agent SDK.", to: "" },
  { from: /opencode/gi, to: (m) => (m === "OpenCode" ? "Antigravity" : m === "OPENCODE" ? "ANTIGRAVITY" : "antigravity") }
];
export const CODEBUDDY_INTL_SYSTEM_PROMPT = "You are CodeBuddy Code.";
export const ANTIGRAVITY_DEFAULT_SYSTEM = "You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.You are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.**Absolute paths only****Proactiveness**";
