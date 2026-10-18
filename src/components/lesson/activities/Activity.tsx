"use client";

import { ChoiceQuiz, fromCelstv, fromQuiz } from "./ChoiceQuiz";
import { Flashcards } from "./Flashcards";
import { Flipbook } from "./Flipbook";
import { Grammar } from "./Grammar";
import { arr, obj, str, T, Urls, type ActivityT } from "./shared";

type Props = {
  type: string;
  settings: unknown;
  /** signed URLs for this block's storage refs only */
  urls: Record<string, string>;
  t: ActivityT;
  seed: string;
  title?: string;
};

/** Interactive lesson blocks migrated from Base44. Practice only: answers aren't saved. */
export function Activity({ type, settings, urls, t, seed, title }: Props) {
  return (
    <T.Provider value={t}>
      <Urls.Provider value={urls}>
        {type === "flashcard" ? (
          <Flashcards cards={arr(settings)} seed={seed} />
        ) : type === "grammar" ? (
          <Grammar settings={settings} seed={seed} />
        ) : type === "quiz" ? (
          <ChoiceQuiz questions={fromQuiz(settings)} />
        ) : type === "celstv_quiz" ? (
          <ChoiceQuiz questions={fromCelstv(settings)} heading={str(obj(settings).episodeTitle) || undefined} />
        ) : type === "flipbook" ? (
          <Flipbook settings={settings} title={title ?? ""} />
        ) : null}
      </Urls.Provider>
    </T.Provider>
  );
}
