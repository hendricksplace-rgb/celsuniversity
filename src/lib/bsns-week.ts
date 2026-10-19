// CelsBSNS week page v2 (celsu-celsbsns-semana-brief.md): everything the page shows, from the course page data,
// the lesson texts, the student's submissions, the enrollment start, the class teacher and the week's resources.
// Due dates are suggestions only: nothing is ever locked.
import type { createClient } from "@/lib/supabase/server";
import type { CoursePage, Episode, Part } from "@/lib/course-page";
import { initials } from "@/lib/my-classes";
import { capstoneParts, loadSyllabus } from "@/lib/bsns-syllabus";
import {
  BSNS_WEEKS,
  DUE_DAY,
  currentWeekOf,
  WEEK_TOPICS,
  lessonFields,
  parseTime,
  taskStatus,
  taskTime,
  videoTitle,
  weekTitle,
  type TaskStatus,
} from "@/lib/bsns";

type Client = Awaited<ReturnType<typeof createClient>>;
type Lang = "es" | "en";

/** Dates are shown in Mexico City time, as on Mis clases (profiles has no time zone yet). */
const TZ = "America/Mexico_City";
const ymd = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);
/** "2026-10-24" → "vie 24 oct" / "Fri Oct 24". */
function shortDate(day: string, lang: Lang) {
  const d = new Date(`${day}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
      timeZone: "UTC",
      ...o,
    })
      .format(d)
      .replace(/\./g, "");
  return lang === "es"
    ? `${f({ weekday: "short" })} ${f({ day: "numeric" })} ${f({ month: "short" })}`
    : `${f({ weekday: "short" })} ${f({ month: "short" })} ${f({ day: "numeric" })}`;
}

export type Kind = "syllabus" | "reading" | "research" | "writing" | "video_submission" | "speaking" | "feedback" | "other";
export type Due = { day: string; label: string; days: number };
export type Activity = {
  id: string;
  kind: Kind;
  href: string;
  /** Card title: the lesson text's "Title:", else the lesson name. */
  title: string;
  /** "Reading Assignment", "Writing Task"… */
  name: string;
  /** Second line of the type label, e.g. "CASE STUDY". */
  subtype: string | null;
  status: TaskStatus;
  done: boolean;
  started: boolean;
  time: string | null;
  hours: number;
  goal: string | null;
  due: Due | null;
};
export type Video = { id: string; href: string; title: string; done: boolean };
/** A row of "Tus pendientes": one activity, or the week's videos as one. */
export type Row = {
  key: string;
  videos: boolean;
  activity: Activity | null;
  done: boolean;
  started: boolean;
  href: string;
  hours: number;
  due: Due | null;
};
export type Phase = {
  key: "prep" | "research" | "produce" | "review";
  videos: Video[];
  cards: Activity[];
  done: boolean;
};
export type RouteNode = {
  n: number;
  topic: string;
  href: string;
  done: boolean;
  current: boolean;
  viewing: boolean;
};
export type Resource = {
  id: string;
  label: string;
  href: string;
  tag: "pdf" | "link" | "audio" | "list" | "video";
  external: boolean;
};

export type BsnsWeek = {
  slug: string;
  n: number;
  total: number;
  title: [string, string];
  topic: string;
  preview: boolean;
  firstName: string | null;
  hours: number;
  deliverables: number;
  /** The week's first suggested due date still open (else the week's last one). */
  nextDue: Due | null;
  rows: Row[];
  allRows: number;
  doneRows: number;
  current: Row | null;
  phases: Phase[];
  route: RouteNode[];
  currentWeek: number;
  routeFill: number;
  coach: { name: string; initials: string } | null;
  milestones: { week: number; part: number; label: string; now: boolean }[];
  resources: Resource[];
  courseResources: Resource[];
};

function kindOf(p: Part): Kind {
  if (p.type === "reading") return /syllabus/i.test(p.title) ? "syllabus" : "reading";
  if (p.type && ["research", "writing", "video_submission", "speaking", "feedback"].includes(p.type)) return p.type as Kind;
  return "other";
}

const PHASE_OF: Record<Kind, Phase["key"]> = {
  syllabus: "prep",
  reading: "prep",
  research: "research",
  writing: "produce",
  video_submission: "produce",
  speaking: "produce",
  feedback: "review",
  other: "prep",
};

/** Done for a CelsBSNS activity: the lesson is completed, or its submission went to the coach. */
const isDone = (s: TaskStatus) => s === "done" || s === "submitted" || s === "reviewed";

export async function loadBsnsWeek(
  supabase: Client,
  opts: {
    page: CoursePage;
    week: Episode;
    userId: string;
    displayName: string | null;
    lang: Lang;
  },
): Promise<BsnsWeek> {
  const { page, week, userId, lang } = opts;
  const slug = page.course.slug;
  const allIds = page.episodes.flatMap((e) => e.parts.map((p) => p.id));
  const taskIds = week.parts.filter((p) => p.type !== "video").map((p) => p.id);

  const { data: links } = await supabase.from("program_courses").select("program_id").eq("course_id", page.course.id);
  const programIds = (links ?? []).map((l) => l.program_id as string);
  const scope = [`course_id.eq.${page.course.id}`, ...(programIds.length ? [`program_id.in.(${programIds.join(",")})`] : [])];

  const [{ data: subs }, { data: blocks }, { data: enrolls }, { data: classRows }, { data: res }, syllabus] = await Promise.all([
    allIds.length ? supabase.from("submissions").select("lesson_id, status").eq("user_id", userId).in("lesson_id", allIds) : Promise.resolve({ data: [] }),
    taskIds.length
      ? supabase
          .from("content_blocks")
          .select("lesson_id, body, data, sort_order")
          .in("lesson_id", taskIds)
          .eq("block_type", "text")
          .eq("teacher_only", false)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.from("enrollments").select("starts_at").eq("user_id", userId).eq("status", "active").or(scope.join(",")).order("starts_at").limit(1),
    supabase
      .from("class_members")
      .select("class_id, classes!inner(status, class_courses(course_id))")
      .eq("user_id", userId)
      .eq("member_role", "student")
      .eq("classes.status", "active"),
    supabase.from("resources").select("id, label, label_es, resource_type, url, sort_order").eq("module_id", week.id).order("sort_order"),
    loadSyllabus(supabase, page),
  ]);
  const subOf = new Map((subs ?? []).map((s) => [s.lesson_id, s]));
  const statusOf = (p: Part) => taskStatus(p, subOf.get(p.id));

  // ---- Lesson texts → card fields ----
  const textOf = new Map<string, { en: string; es: string | null }>();
  for (const b of blocks ?? []) {
    if (textOf.has(b.lesson_id)) continue; // the first text block carries the header
    const es = (b.data as Record<string, unknown> | null)?.text_es;
    textOf.set(b.lesson_id, {
      en: b.body ?? "",
      es: typeof es === "string" ? es : null,
    });
  }

  // ---- Suggested dates, counted from the enrollment start ----
  const start = enrolls?.[0]?.starts_at ? ymd(enrolls[0].starts_at) : null;
  const today = ymd(new Date());
  const dueFor = (kind: Kind): Due | null => {
    const day = DUE_DAY[kind];
    if (!start || !day) return null;
    const d = addDays(start, (week.n - 1) * 7 + day - 1);
    return { day: d, label: shortDate(d, lang), days: dayDiff(d, today) };
  };

  const activities: Activity[] = week.parts
    .filter((p) => p.type !== "video")
    .map((p) => {
      const kind = kindOf(p);
      const tx = textOf.get(p.id);
      const f = tx ? lessonFields(tx.en, tx.es) : null;
      const named = taskTime(p.title);
      const time = f?.time ?? parseTime(named.label);
      const status = statusOf(p);
      return {
        id: p.id,
        kind,
        href: p.href,
        title: f?.title || (kind === "syllabus" ? p.title.replace(/\s*syllabus\s*$/i, "") : named.name),
        name: named.name,
        subtype: kind === "reading" && f?.type && /case study/i.test(f.type) ? "CASE STUDY" : null,
        status,
        done: isDone(status),
        started: p.started || status !== "pending",
        time: time?.label ?? null,
        hours: time?.hours ?? 0,
        goal: (lang === "es" ? (f?.goalEs ?? f?.goalEn) : (f?.goalEn ?? f?.goalEs)) ?? null,
        due: dueFor(kind),
      };
    });
  const videos: Video[] = week.parts
    .filter((p) => p.type === "video")
    .map((p, i, all) => {
      // "Week 3 Video 1" says nothing more than the row's "Video 1": the week's topic then.
      const own = all.length > 1 ? videoTitle(p.title) : "";
      return {
        id: p.id,
        href: p.href,
        title: own && !/^(week\s*\d+\s*)?video\s*\d+$/i.test(own) ? own : weekTitle(week.title),
        done: p.done,
      };
    });

  // ---- Rows: the videos as one activity, then each task in lesson order ----
  const allRows: Row[] = [];
  if (videos.length) {
    const done = videos.every((v) => v.done);
    allRows.push({
      key: "videos",
      videos: true,
      activity: null,
      done,
      started: videos.some((v) => v.done),
      href: (videos.find((v) => !v.done) ?? videos[0]).href,
      hours: 0,
      due: null,
    });
  }
  for (const a of activities)
    allRows.push({
      key: a.id,
      videos: false,
      activity: a,
      done: a.done,
      started: a.started,
      href: a.href,
      hours: a.hours,
      due: a.due,
    });
  const doneRows = allRows.filter((r) => r.done).length;

  // Current: where the student left off in this week (if still open), else the first open activity.
  const resumeId = page.resume && page.resume.episode.n === week.n && !page.resume.fresh ? page.resume.part.id : null;
  const current =
    allRows.find((r) => !r.done && (r.key === resumeId || (r.videos && videos.some((v) => v.id === resumeId)))) ?? allRows.find((r) => !r.done) ?? null;

  // "Tus pendientes": the 2 latest done before the current one, the current one, then what comes next (4 rows).
  let rows: Row[];
  if (!current) rows = allRows.slice(-4);
  else {
    const at = allRows.indexOf(current);
    const before = allRows
      .slice(0, at)
      .filter((r) => r.done)
      .slice(-2);
    const after = allRows.slice(at + 1).filter((r) => !r.done);
    rows = [...before, current, ...after].slice(0, Math.max(4, before.length + 2));
    if (rows.length < 4)
      rows = [
        ...allRows
          .slice(0, at)
          .filter((r) => r.done && !rows.includes(r))
          .slice(-(4 - rows.length)),
        ...rows,
      ];
    rows.sort((a, b) => allRows.indexOf(a) - allRows.indexOf(b));
  }

  // ---- Phases ----
  const keys: Phase["key"][] = ["prep", "research", "produce", "review"];
  const phases: Phase[] = keys
    .map((key) => {
      const cards = activities.filter((a) => PHASE_OF[a.kind] === key);
      const vids = key === "prep" ? videos : [];
      return {
        key,
        videos: vids,
        cards,
        done: [...cards.map((c) => c.done), ...vids.map((v) => v.done)].every(Boolean),
      };
    })
    .filter((p) => p.cards.length || p.videos.length);

  // ---- The 10-week route ----
  const share = (e: Episode) => {
    const tasks = e.parts.filter((p) => p.type !== "video");
    const vids = e.parts.filter((p) => p.type === "video");
    const units = tasks.map((p) => isDone(statusOf(p))).concat(vids.length ? [vids.every((p) => p.done)] : []);
    return units.length ? units.filter(Boolean).length / units.length : 0;
  };
  const currentWeek = currentWeekOf(page.episodes.map((e) => ({ n: e.n, done: e.parts.map((p) => p.done) })));
  const curEp = page.episodes.find((e) => e.n === currentWeek);
  const total = Math.max(10, page.episodes.length);
  const topics = WEEK_TOPICS[lang];
  const route: RouteNode[] = Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    const e = page.episodes.find((x) => x.n === n);
    return {
      n,
      topic: topics[i] ?? (e ? weekTitle(e.title) : ""),
      href: e?.href ?? `/app/cursos/${slug}/semana/${n}`,
      done: !!e && n !== currentWeek && share(e) === 1,
      current: n === currentWeek,
      viewing: n === week.n,
    };
  });
  const routeFill = Math.min(1, Math.max(0, (currentWeek - 1 + (curEp ? share(curEp) : 0)) / (total - 1)));

  // ---- Coach: the teacher of the student's active class (one with this course first) ----
  let coach: BsnsWeek["coach"] = null;
  if (classRows?.length) {
    type ClassRow = {
      class_id: string;
      classes: { class_courses: { course_id: string }[] | null } | { class_courses: { course_id: string }[] | null }[] | null;
    };
    const withCourse = (classRows as ClassRow[]).find((r) => {
      const c = Array.isArray(r.classes) ? r.classes[0] : r.classes;
      return (c?.class_courses ?? []).some((cc) => cc.course_id === page.course.id);
    });
    const classIds = [withCourse?.class_id, ...classRows.map((r) => r.class_id)].filter((x): x is string => !!x);
    const { data: people } = await supabase.rpc("my_class_people");
    for (const id of classIds) {
      const t = (people ?? []).find((m) => m.class_id === id && m.member_role === "teacher");
      if (t) {
        const name = t.display_name?.trim();
        if (name) coach = { name, initials: initials(name) };
        break;
      }
    }
  }

  // ---- Resources: the week's own (with a link), else the course's resource lessons ----
  const tagOf = (t: string): Resource["tag"] =>
    /pdf|file|doc/i.test(t) ? "pdf" : /audio/i.test(t) ? "audio" : /video/i.test(t) ? "video" : /list|vocab/i.test(t) ? "list" : "link";
  const resources: Resource[] = (res ?? [])
    .filter((r) => r.url && /^https:\/\//.test(r.url))
    .map((r) => ({
      id: r.id,
      label: (lang === "es" ? r.label_es : null) || r.label,
      href: r.url!,
      tag: tagOf(`${r.resource_type} ${r.url}`),
      external: true,
    }));
  // "Recursos del curso": the course-level resources the old course page listed as "Recursos adicionales".
  const courseResources: Resource[] = page.extras
    .filter((x) => x.kind === "resources")
    .flatMap((x) => x.parts)
    .map((p) => ({ id: p.id, label: p.title, href: p.href, tag: /dictionary|vocab/i.test(p.title) ? "list" : "link", external: false }));

  // ---- Capstone: this week's part, the next 2 and part 10, from the syllabus ----
  const parts = capstoneParts(syllabus, lang);
  const shown = parts.filter((p) => (p.week >= week.n && p.week <= week.n + 2) || p.week === BSNS_WEEKS);
  const milestones = shown.map((m) => ({ week: m.week, part: m.part, label: m.text, now: m.week === week.n }));

  // Hero title: "Professional Communication & Capstone Launch" → ["Professional Communication", "& Capstone Launch"].
  const clean = weekTitle(week.title);
  const cut = clean.search(/\s(&|and)\s/);
  const words = clean.split(" ");
  const title: [string, string] =
    cut > 0 ? [clean.slice(0, cut), clean.slice(cut + 1)] : words.length > 1 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : [clean, ""];

  const dated = activities.filter((a) => a.due);
  const nextDue = (dated.find((a) => !a.done) ?? dated[dated.length - 1])?.due ?? null;
  const name = (opts.displayName ?? "").trim().split(/\s+/)[0] || null;

  return {
    slug,
    n: week.n,
    total,
    title,
    topic: topics[week.n - 1] ?? clean,
    preview: week.n > currentWeek,
    firstName: name,
    hours: Math.round(activities.reduce((s, a) => s + a.hours, 0)),
    deliverables: activities.filter((a) => DUE_DAY[a.kind]).length,
    nextDue,
    rows,
    allRows: allRows.length,
    doneRows,
    current,
    phases,
    route,
    currentWeek,
    routeFill,
    coach,
    milestones,
    resources,
    courseResources,
  };
}
