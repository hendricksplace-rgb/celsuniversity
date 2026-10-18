// JSON answers from Claude, the same provider and call shape as the English evaluation
// (evaluation/grade.ts). Secret: ANTHROPIC_API_KEY.
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic();

export async function askJson<T>(opts: { system: string; user: string; schema: object; effort: "low" | "medium" | "high"; maxTokens: number }): Promise<T> {
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: opts.maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort, format: { type: "json_schema", schema: opts.schema } },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  } as never); // `fallbacks` and `output_config` may be newer than the SDK's bundled types

  const r = response as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
  if (r.stop_reason === "refusal") throw new Error("refused");
  const text = r.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error(`no output (${r.stop_reason})`);
  return JSON.parse(text) as T;
}
