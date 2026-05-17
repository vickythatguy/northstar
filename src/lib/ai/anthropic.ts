import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const COPILOT_MODEL =
  process.env.ANTHROPIC_COPILOT_MODEL ?? "claude-sonnet-4-6";

export const CATEGORIZE_MODEL =
  process.env.ANTHROPIC_CATEGORIZE_MODEL ?? "claude-haiku-4-5-20251001";

export function hasAnthropicKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}
