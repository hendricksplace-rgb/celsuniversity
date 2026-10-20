# CelsBSNS: voice recording freezes + progress not showing — fix brief (2026-10-19, Cowork)

Reported by Matt's testers on the live app (nuevo.celstv.com). Cowork checked main (5c628de), the database and the Supabase logs.

## Evidence
- iPad Safari (identifies as Macintosh), week 7 Speaking ex. 1: the timer is stuck at 1:00 (the exercise's max_s auto-stop), the stop button is still red with "Escuchando…", and the orange mic light stays on. The whole page stopped responding, so the freeze is inside stopMic, both on auto-stop and on a tap.
- Progreso card: 18% · "Siguiente: Semana 3", with "Tú" at Semana 3. The student (reneod93) has only worked in weeks 7–9 (8 + 9 + 6 lessons completed) and nothing in weeks 1–6.
- Speaking rows: reneod93 week 7 {1,0,0}, week 8 {0,3,0}, week 9 no row; peru_zi25 week 1 {0,2,0}. No Speaking lesson is completed for any real student.
- Reading, Research, Video submission and Speaking stay in_progress in every week; no week is ever complete.
- record_lesson_progress returned 400 P0001 "no access" for reneod93 (Safari) at 00:52:33 and 00:53:05 UTC, ~30 s apart, right after he completed a CelsUS extra video.

## 1. The stop button stops responding (all voice recorders)
Code: components/speaking/InteractiveSpeaking.tsx (startMic/stopMic), components/course/BsnsTask.tsx (Recorder), components/ai/useRecorder.ts, components/video/InteractiveVideo.tsx. Also check components/guided/SimulatorView.tsx and BuildInterview.tsx (the Interview course simulator uses the same pattern).

Likely causes:
1. Safari: getUserMedia + AudioContext (for the wave) and webkitSpeechRecognition run on the same mic at the same time. WebKit handles this badly: recognition stops sending results, onend never comes, and closing the AudioContext or stopping tracks while recognition is still capturing can leave the tab's audio stuck. finishTry never calls recog.abort(), so a recognition that didn't stop keeps the mic, and the next start() throws (the error is swallowed).
2. stopMic can lock itself forever. x.stopping = true is set first, so any exception afterwards leaves it true. Examples: rec.stop() on an inactive recorder throws inside the Promise; functions.invoke throws on the network. The rec.onstop promise never resolves if the recorder already stopped. functions.invoke("transcribe-speech") has no timeout.
3. The mic button is disabled={disabled || busy}. If busyIdx is never cleared, every exercise stays locked until the page is reloaded.

Fix (all recorders):
- Never run SpeechRecognition and getUserMedia at the same time.
  - Safari / WebKit (Mac, iPadOS that reports Macintosh, and iOS): use MediaRecorder (audio/mp4) and the transcribe-speech Edge Function. Don't use webkitSpeechRecognition.
  - Chrome: either SpeechRecognition only (live captions) with a CSS wave and no AudioContext, or the MediaRecorder path. Pick one.
- Stop always finishes within about 1.5 s:
  - Wrap all of stopMic in try/finally. The finally resets stopping, recIdx and busyIdx, stops all tracks and closes the AudioContext.
  - Call recog.abort() if onend hasn't come after 1.2 s.
  - Check rec.state === "recording" before rec.stop(), with a 1.5 s fallback that builds the Blob from the chunks already collected.
- Transcription times out after 20 s (AbortController). On a timeout or error, save the try as failed with the existing "type it" option. The screen must never stay on "Convirtiendo tu voz en texto…".
- Stop and clean up on pagehide, on visibilitychange (hidden), and when the student switches to another exercise.
- Apply the same rules to BsnsTask Recorder, useRecorder and InteractiveVideo: the stop button checks state, onstop has a fallback, and Safari gets video/mp4 / audio/mp4.
- Test: Playwright with --use-fake-device-for-media-stream --use-fake-ui-for-media-stream (Chromium; WebKit if available). Record and stop 5 times in a row on each of the 3 exercises; the button must always respond. Then cut the network during transcription: a "failed" try appears and the mic works again. Real iPhone / Mac Safari is checked by hand.

## 2. Progress isn't saved or isn't shown
a) Speaking tries can be overwritten with older numbers. saveProgress upserts the whole reps array from page state that came from server props at page load. If the page is shown from Next's client cache (back/forward), it starts from older numbers and the next try writes the lower count. Fix: an RPC that increments in the DB (DONE, see below), re-read speaking_progress on mount, and never write the whole array from the client. Check the other pages that keep counts or state from props (Reading reading_progress.state, Research): merge, don't replace.
b) The weeks never complete. A lesson counts in Progreso only when progress.status = 'completed'. Reading, Research, Video and Speaking complete only through their "Terminar" button, and Speaking needs all reps. Once 1 is fixed, check that each page's finish button is visible and reachable on phone and that finishLesson gets called. finishLesson queues failed calls in localStorage, so make sure OfflineSync is mounted on the lesson pages so queued completions are sent. (Matt to decide: Speaking complete with 1 try per exercise instead of all? Keep it as is for now, behind one constant.)
c) Progreso's CelsBSNS card (src/lib/progress-page.ts → bsnsView):
- The pin and "Siguiente" follow the real weeks: put the pin at the week with the student's latest activity (week 9 for reneod93), not at the total share of the course. Keep the % as the share of the course done (18% is right).
- Current week: use the week of the student's most recent activity; if that week is complete, use the next one (not "first incomplete week").
- Count in_progress lessons as half a lesson so work in progress shows (or show "N lecciones empezadas"); keep "completed" for the checks.
- Progreso shows the latest numbers when the student returns (router.refresh() on mount, or no router cache for that page).

## Done when
- On Safari (Mac and iPhone) and Chrome (Android and desktop), voice can be recorded and stopped 5 times in a row in every exercise without reloading.
- Each try adds 1 to speaking_progress.reps and never lowers it.
- reneod93's Progreso card shows week 9 and his real progress.
- record_lesson_progress stops returning 400 for students.
