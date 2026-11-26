/** Drop <break .../> tags from a spoken line, keeping each real word's start time. */
export function cleanLine(text, wt) {
  const T = text.split(/\s+/).filter(Boolean);
  if (T.length !== wt.length) return { text: text.replace(/<break[^>]*\/>/g, "").replace(/\s+/g, " ").trim(), wt };
  const words = [], times = [];
  T.forEach((t, i) => {
    if (t === "<break" || /^time=/.test(t)) return;
    const w = t.replace(/^\/>/, "");
    if (w) { words.push(w); times.push(wt[i]); }
  });
  return { text: words.join(" "), wt: times };
}
