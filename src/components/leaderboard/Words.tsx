/** The English phrase split into words, the one Amy is saying lit up. */
export function Words({ text, k }: { text: string; k: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className={`w ${i === k ? "now" : ""}`}>
          {w}
          {i < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
