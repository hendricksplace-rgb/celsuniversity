// Speech-to-text for the speaking section, behind one small interface so the provider can change
// (e.g. Azure Pronunciation Assessment, which would also return pronunciation scores).

export type Transcript = {
  text: string;
  /** Provider-specific extras, e.g. pronunciation scores; graded as-is when present. */
  scores?: Record<string, number>;
};

export interface SpeechToText {
  transcribe(audio: Blob, opts: { language: string }): Promise<Transcript>;
}

/** OpenAI gpt-4o-mini-transcribe. Secret: OPENAI_API_KEY. */
export const openAiTranscriber: SpeechToText = {
  async transcribe(audio, { language }) {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    const form = new FormData();
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", language);
    form.append("response_format", "json");
    form.append("file", audio, audio.type.includes("mp4") ? "answer.mp4" : "answer.webm");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) throw new Error(`transcription failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { text?: string };
    return { text: (data.text ?? "").trim() };
  },
};

/** The one in use. Swap here. */
export const speechToText: SpeechToText = openAiTranscriber;
