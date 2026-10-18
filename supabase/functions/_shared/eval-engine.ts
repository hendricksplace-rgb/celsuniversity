// CelsU English evaluation: item bank, adaptive engine and scoring.
// Ported verbatim from the Base44 app (src/lib/eval/bank.js + engine.js). Shared by the Next.js
// pages and the `evaluation` edge function, which replays the answers to compute the level itself.
// No imports: this file must run unchanged in both Node and Deno.

export type SectionKey = "V" | "L" | "R" | "W" | "S";
/** In every multiple-choice item, opts[0] is the right answer; screens shuffle the order. */
export type Item = {
  id: string;
  lvl: number;
  q: string;
  type?: "mc" | "unscramble" | "spot";
  opts?: string[];
  img?: string;
  audio?: string;
  passage?: string;
  words?: string[];
  ans?: string;
  bad?: number;
  fix?: string;
};
export type SpeakingPrompt = { id: string; lvl: number; prompt: string; rubric: string; band: string; image?: string; audio?: string };

export const BANK: Record<SectionKey, Item[]> = {
  V: [
    { id: 'V01', lvl: 0, q: 'Selecciona la palabra correcta para la imagen:', img: '🍎', opts: ['apple', 'orange', 'bread', 'milk'] },
    { id: 'V02', lvl: 0, q: '¿Cómo se dice «la casa» en inglés?', opts: ['house', 'home office', 'hotel', 'horse'] },
    { id: 'V03', lvl: 0, q: 'Traduce: «Yo tengo dos hermanos.»', opts: ['I have two brothers', 'I am two brothers', 'I has two brothers', 'I have two sisters'] },
    { id: 'V04', lvl: 1, q: 'Elige el opuesto de «expensive».', opts: ['cheap', 'big', 'fast', 'old'] },
    { id: 'V05', lvl: 1, q: 'Traduce: «Ella está cansada porque trabajó mucho.»', opts: ['She is tired because she worked a lot', 'She is tired because she work a lot', 'She tired because worked a lot', 'She is cansada because she worked'] },
    { id: 'V06', lvl: 1, q: "Completa: \"I need to ___ a doctor's appointment.\"", opts: ['make', 'do', 'take', 'give'] },
    { id: 'V07', lvl: 2, q: 'Completa: "The meeting was ___ until Friday."', opts: ['postponed', 'preponed', 'delated', 'suspended out'] },
    { id: 'V08', lvl: 2, q: 'Completa: "Can you ___ the kids from school today?"', opts: ['pick up', 'pick on', 'pick out', 'pick over'] },
    { id: 'V09', lvl: 2, q: '¿Cuál palabra significa lo mismo que «reliable»?', opts: ['trustworthy', 'expensive', 'friendly', 'fast'] },
    { id: 'V10', lvl: 3, q: 'Choose the word closest in meaning to "thorough":', opts: ['detailed', 'quick', 'tired', 'through'] },
    { id: 'V11', lvl: 3, q: 'Completa: "She has a strong work ___."', opts: ['ethic', 'ethics', 'etiquette', 'moral'] },
    { id: 'V12', lvl: 3, q: 'Completa: "The company decided to ___ the new policy next month."', opts: ['implement', 'impale', 'imply', 'import'] },
    { id: 'V13', lvl: 4, q: 'Completa: "His argument was compelling, albeit somewhat ___."', opts: ['flawed', 'flawless', 'perfect', 'convincing'] },
    { id: 'V14', lvl: 4, q: '"Let\'s get the ball rolling" means...', opts: ["let's start", "let's play sports", "let's cause problems", "let's finish quickly"] },
    { id: 'V15', lvl: 5, q: 'Choose the word that best describes a statement that is deliberately ambiguous:', opts: ['equivocal', 'equal', 'equitable', 'equine'] },
    { id: 'V16', lvl: 5, q: 'Which is the most formal way to say "ask for"?', opts: ['solicit', 'beg', 'bug someone for', 'hit up'] },
  ],
  L: [
    { id: 'L01', lvl: 0, audio: 'Hello! My name is Anna. I am from Mexico. I live in Monterrey.', q: 'Where is Anna from?', opts: ['Mexico', 'Spain', 'The United States', 'Monterrey, California'] },
    { id: 'L02', lvl: 0, audio: 'Please open your book to page ten.', q: 'What should you do?', opts: ['Open the book', 'Close the book', 'Read page two', 'Write your name'] },
    { id: 'L03', lvl: 1, audio: 'The store opens at nine in the morning and closes at six in the evening.', q: 'What time does the store close?', opts: ['6:00 PM', '9:00 AM', '6:00 AM', '9:00 PM'] },
    { id: 'L04', lvl: 1, audio: 'Would you like coffee or tea? ... Tea, please, with sugar.', q: 'What does the woman want?', opts: ['Tea with sugar', 'Coffee with sugar', 'Tea with milk', 'Nothing'] },
    { id: 'L05', lvl: 2, audio: "Hi, this is Mark from City Dental. I'm calling to confirm your appointment tomorrow at 2:30. Please call us back if you need to reschedule.", q: 'Why did Mark call?', opts: ['To confirm an appointment', 'To cancel an appointment', 'To sell dental insurance', 'To ask for directions'] },
    { id: 'L06', lvl: 2, audio: "To get to the bank, go straight for two blocks, then turn left at the pharmacy. It's next to the supermarket.", q: 'Where do you turn left?', opts: ['At the pharmacy', 'At the bank', 'At the supermarket', 'After three blocks'] },
    { id: 'L07', lvl: 2, audio: 'I liked the movie, but honestly, it was way too long. Two hours would have been enough.', q: "What is the speaker's main complaint?", opts: ['The movie was too long', 'The movie was boring', 'The movie was too short', 'The tickets were expensive'] },
    { id: 'L08', lvl: 3, audio: 'Due to system maintenance, the office network will be unavailable this Friday evening. Please make sure to save your work and log off before six PM.', q: 'What must employees do before 6 PM on Friday?', opts: ['Save their work and log off', 'Leave the building', 'Restart the network', 'Work from home'] },
    { id: 'L09', lvl: 3, audio: "So, how was the client meeting? ... Well... let's just say we'll be doing a lot of follow-up calls.", q: 'How did the meeting probably go?', opts: ['Not very well', 'Perfectly', 'It was cancelled', 'The client signed immediately'] },
    { id: 'L10', lvl: 3, audio: 'Local businesses are reporting a strong recovery this quarter, with restaurant sales up fifteen percent compared to last year, although retail stores continue to struggle.', q: 'What is the main idea?', opts: ['Restaurants are recovering but retail is struggling', 'All businesses are struggling', 'Retail sales are up 15%', 'Restaurants are closing'] },
    { id: 'L11', lvl: 4, audio: "Honestly, the presentation went off without a hitch — though I'll admit we were cutting it pretty close with the deadline.", q: 'How did the presentation go?', opts: ['Smoothly, though they almost missed the deadline', 'Badly, and they missed the deadline', 'It was cancelled at the last minute', 'There was a technical problem'] },
    { id: 'L12', lvl: 4, audio: 'Oh great, another meeting that could have been an email. I can hardly contain my excitement.', q: 'How does the speaker feel about the meeting?', opts: ['Annoyed', 'Genuinely excited', 'Nervous', 'Confused'] },
    { id: 'L13', lvl: 5, audio: 'While remote work clearly boosts individual productivity, we keep overlooking what it quietly erodes: the informal mentorship that junior employees absorb simply by being around experienced colleagues.', q: "What is the speaker's implicit concern?", opts: ['Junior employees lose informal learning opportunities', 'Remote work lowers productivity', 'Senior employees refuse to mentor', 'Offices are too expensive'] },
    { id: 'L14', lvl: 5, audio: "I'm not saying we shouldn't expand; I'm saying we shouldn't expand yet. ... And I'm saying that by the time we're ready, the opportunity will be gone.", q: 'What do the speakers disagree about?', opts: ['The timing of the expansion', 'Whether to expand at all', 'The cost of the expansion', 'Who will lead the expansion'] },
  ],
  R: [
    { id: 'R01', lvl: 0, passage: 'OPEN 9AM–5PM · MONDAY TO FRIDAY', q: 'Is the store open on Sunday?', opts: ['No', 'Yes', 'Only in the morning', 'Only until 5'] },
    { id: 'R02', lvl: 0, passage: "\"Hi! See you at the park at 3. Don't forget the ball! 😄\"", q: 'Where will they meet?', opts: ['At the park', 'At school', "At 3 o'clock", 'At the store'] },
    { id: 'R03', lvl: 1, passage: "Today's Special: Chicken soup $5 · Beef tacos $8 · All drinks $2 · Dessert free with any meal", q: 'How much do you pay for beef tacos and a drink?', opts: ['$10', '$8', '$12', '$7'] },
    { id: 'R04', lvl: 1, passage: '"Hi Laura, the class on Tuesday is cancelled. We will have class on Wednesday at the same time instead. See you then! — Mr. Adams"', q: 'When is the class now?', opts: ['Wednesday', 'Tuesday', 'It is cancelled completely', 'Monday'] },
    { id: 'R05', lvl: 2, passage: 'Last year, Daniela moved from Guadalajara to Chicago for a new job. At first, everything was difficult: the weather, the food, and especially the language. She understood her coworkers in meetings, but making small talk in the kitchen felt impossible. After six months, she joined a local soccer league, and that changed everything. Now she says her best English lessons happen on the field, not in a classroom.', q: "What was Daniela's biggest challenge at first?", opts: ['Informal conversation', 'Understanding meetings', 'Finding a job', 'Playing soccer'] },
    { id: 'R06', lvl: 2, passage: 'Last year, Daniela moved from Guadalajara to Chicago for a new job. At first, everything was difficult: the weather, the food, and especially the language. She understood her coworkers in meetings, but making small talk in the kitchen felt impossible. After six months, she joined a local soccer league, and that changed everything. Now she says her best English lessons happen on the field, not in a classroom.', q: 'How did Daniela improve her English?', opts: ['By joining a soccer league', 'By taking classes', 'By changing jobs', 'By moving back home'] },
    { id: 'R07', lvl: 2, passage: 'Last year, Daniela moved from Guadalajara to Chicago for a new job. At first, everything was difficult: the weather, the food, and especially the language. She understood her coworkers in meetings, but making small talk in the kitchen felt impossible. After six months, she joined a local soccer league, and that changed everything. Now she says her best English lessons happen on the field, not in a classroom.', q: 'In this text, "small talk" means...', opts: ['casual conversation', 'speaking quietly', 'short meetings', 'talking to children'] },
    { id: 'R08', lvl: 3, passage: "From: Sandra (Manager) — \"Team, the client moved the launch to the 15th. I know it's tight. Can everyone confirm their sections will be ready?\" · From: Luis — \"Mine's on track, but design hasn't sent final assets. If I get them by Monday, we're fine.\" · From: Sandra — \"Understood. I'll escalate with design today. Luis, plan for Monday.\"", q: 'Why did Sandra write the first email?', opts: ['The deadline changed and she needs confirmation', 'To cancel the launch', 'To criticize Luis', 'To hire a designer'] },
    { id: 'R09', lvl: 3, passage: "From: Sandra (Manager) — \"Team, the client moved the launch to the 15th. I know it's tight. Can everyone confirm their sections will be ready?\" · From: Luis — \"Mine's on track, but design hasn't sent final assets. If I get them by Monday, we're fine.\" · From: Sandra — \"Understood. I'll escalate with design today. Luis, plan for Monday.\"", q: 'What is blocking Luis?', opts: ['Missing design assets', 'A vacation', 'The client', 'His own delays'] },
    { id: 'R10', lvl: 3, passage: "From: Sandra (Manager) — \"Team, the client moved the launch to the 15th. I know it's tight. Can everyone confirm their sections will be ready?\" · From: Luis — \"Mine's on track, but design hasn't sent final assets. If I get them by Monday, we're fine.\" · From: Sandra — \"Understood. I'll escalate with design today. Luis, plan for Monday.\"", q: 'What does "I\'ll escalate with design" mean?', opts: ['She will pressure the design team through higher channels', 'She will fire the design team', 'She will design it herself', 'She will delay the launch'] },
    { id: 'R11', lvl: 4, passage: "The prevailing wisdom holds that bilingual employees are valuable primarily as translators — human bridges between markets. This view, while not wrong, is remarkably narrow. Research increasingly suggests that bilinguals excel at perspective-taking itself: having switched between linguistic worlds, they switch between viewpoints with similar ease. The real asset isn't the second language; it's the cognitive flexibility that came with acquiring it.", q: "What is the author's main argument?", opts: ["Bilinguals' real value is cognitive flexibility, not translation", 'Bilinguals are mainly useful as translators', 'Learning languages is too difficult for adults', 'Companies should stop hiring translators'] },
    { id: 'R12', lvl: 4, passage: "The prevailing wisdom holds that bilingual employees are valuable primarily as translators — human bridges between markets. This view, while not wrong, is remarkably narrow. Research increasingly suggests that bilinguals excel at perspective-taking itself: having switched between linguistic worlds, they switch between viewpoints with similar ease. The real asset isn't the second language; it's the cognitive flexibility that came with acquiring it.", q: '"While not wrong, is remarkably narrow" suggests the author finds the common view...', opts: ['incomplete', 'completely false', 'offensive', 'perfectly accurate'] },
    { id: 'R13', lvl: 5, passage: "We celebrate 'accent reduction' courses without pausing to ask what, precisely, is being reduced. An accent is not noise atop a signal; it is biography made audible. The market's preference for certain accents over others is not a linguistic judgment — no such neutral judgment exists — but a social one, dressed in the borrowed clothes of objectivity.", q: "What is the author's central claim?", opts: ['Preferences about accents are social judgments, not linguistic ones', 'Accent reduction courses are effective', 'Some accents are objectively clearer', 'Accents interfere with communication'] },
    { id: 'R14', lvl: 5, passage: "We celebrate 'accent reduction' courses without pausing to ask what, precisely, is being reduced. An accent is not noise atop a signal; it is biography made audible. The market's preference for certain accents over others is not a linguistic judgment — no such neutral judgment exists — but a social one, dressed in the borrowed clothes of objectivity.", q: '"Biography made audible" most nearly means an accent...', opts: ["reveals a person's life history", 'is a form of loud speech', 'should be written down', 'makes people famous'] },
  ],
  W: [
    { id: 'W01', lvl: 0, type: 'unscramble', q: 'Ordena las palabras:', words: ['This', 'is', 'my', 'sister'], ans: 'This is my sister' },
    { id: 'W02', lvl: 0, type: 'mc', q: 'Completa: "I ___ a student."', opts: ['am', 'is', 'are', 'be'] },
    { id: 'W03', lvl: 1, type: 'unscramble', q: 'Ordena las palabras:', words: ['We', 'are', 'going', 'to', 'the', 'beach', 'tomorrow'], ans: 'We are going to the beach tomorrow' },
    { id: 'W04', lvl: 1, type: 'spot', q: 'Toca la palabra incorrecta:', words: ['She', "don't", 'like', 'coffee'], bad: 1, fix: "doesn't" },
    { id: 'W05', lvl: 2, type: 'mc', q: 'Completa: "If I ___ more time, I would travel more."', opts: ['had', 'have', 'has', 'having'] },
    { id: 'W06', lvl: 2, type: 'unscramble', q: 'Ordena las palabras:', words: ['I', 'have', 'never', 'been', 'to', 'Canada'], ans: 'I have never been to Canada' },
    { id: 'W07', lvl: 2, type: 'spot', q: 'Toca la palabra incorrecta:', words: ['I', 'am', 'agree', 'with', 'you'], bad: 1, fix: '(I agree with you)' },
    { id: 'W08', lvl: 3, type: 'mc', q: 'Completa: "The report ___ by the team before the deadline."', opts: ['was completed', 'completed', 'has completing', 'complete'] },
    { id: 'W09', lvl: 3, type: 'spot', q: 'Toca la palabra incorrecta:', words: ['Despite', 'of', 'the', 'rain,', 'we', 'went', 'hiking'], bad: 1, fix: '(Despite the rain)' },
    { id: 'W10', lvl: 3, type: 'mc', q: 'Completa: "The results were poor; ___, the team remained optimistic."', opts: ['nevertheless', 'therefore', 'moreover', 'because'] },
    { id: 'W11', lvl: 4, type: 'mc', q: 'Choose the most professional way to say: "We can\'t come to the meeting."', opts: ['Unfortunately, we will be unable to attend the meeting.', "We ain't coming to the meeting.", 'The meeting is not possible for us to come.', "We don't want to go to the meeting."] },
    { id: 'W12', lvl: 5, type: 'mc', q: 'Completa: "Rarely ___ such a compelling case presented so poorly."', opts: ['have I seen', 'I have seen', 'saw I', 'I did see'] },
  ],
  S: [
    { id: 'SR01', lvl: 0, q: '☕ En un café. You want water. What do you say?', opts: ['"Water, please."', '"Give water."', '"I water."', '"You have water me."'] },
    { id: 'SR02', lvl: 1, q: '🛍️ De compras. The shirt is too big. What do you tell the employee?', opts: ['"Do you have this in a smaller size?"', '"This shirt is very shirt."', '"I am too big."', '"Give me other."'] },
    { id: 'SR03', lvl: 1, q: "🚏 Someone asks: \"Excuse me, where is the bus stop?\" You know it's near. Best response:", opts: ['"It\'s right over there, next to the bank."', '"Yes."', '"I am the bus stop."', '"Bus is good."'] },
    { id: 'SR04', lvl: 2, q: '📞 "Are you available Thursday at 10?" You have another meeting then. Best response:', opts: ['"I have a conflict at 10 — would 2 PM work instead?"', '"No."', '"Thursday is impossible for my life."', '"Maybe yes, maybe no, who knows."'] },
    { id: 'SR05', lvl: 2, q: '🍽️ Your food arrived cold. Best polite response:', opts: ['"Excuse me, I\'m sorry, but my food is cold. Could you heat it up, please?"', '"This food is a disaster. I demand a refund!"', '"Cold. Fix."', 'You say nothing and eat it cold.'] },
    { id: 'SR06', lvl: 3, q: '💼 Job interview: "What are your strengths?" Best answer:', opts: ['"I\'m very organized — in my last job I created a tracking system that cut our delivery delays in half."', '"I\'m basically good at everything, honestly."', '"I am a hardworking team player with excellent communication skills."', '"That\'s a hard question. I don\'t know."'] },
    { id: 'SR07', lvl: 3, q: '📧 You need two more days for a deadline. Best opening line:', opts: ['"I\'m writing to ask whether we could extend the Friday deadline to Tuesday — here\'s where things stand."', '"The deadline is impossible, sorry."', '"Hey!! Need more time lol."', '"As per my last email, deadlines are subjective."'] },
    { id: 'SR08', lvl: 3, q: '🫖 Small talk with a new colleague in the office kitchen. Best opener:', opts: ['"How\'s your week going? I heard your team just launched the new project."', '"How much money do you make?"', '"You look tired. Are you sick?"', '(Silence — you avoid eye contact.)'] },
    { id: 'SR09', lvl: 4, q: '🤝 A client says: "That price is higher than we expected." Best response:', opts: ['"I understand — let me walk you through what\'s included, and we can look at options that fit your budget."', '"Take it or leave it."', '"Everyone says that."', '"Fine, 50% off."'] },
    { id: 'SR10', lvl: 5, q: "🏛️ You disagree with your director's plan in a meeting. Most tactful yet clear response:", opts: ['"I see the logic there — my concern is the timeline. Could we pressure-test that assumption before committing?"', '"That plan will fail and everyone knows it."', '"Whatever you decide is fine."', '"With all due respect, that\'s the worst idea I\'ve heard this quarter."'] },
  ],
};

export const FR: Record<number, { prompt: string; band: string }> = {
  1: { prompt: 'Escribe 2 o 3 oraciones en inglés sobre tu familia.', band: 'A2' },
  2: { prompt: 'Write 3–4 sentences about your last vacation, or a place you want to visit and why.', band: 'B1' },
  3: { prompt: 'Should employees be allowed to work from home? Give your opinion in 4–5 sentences.', band: 'B2' },
  4: { prompt: 'Describe a professional decision you disagreed with and explain how you would have handled it differently. (5–6 sentences)', band: 'C1' },
};

export const SPEAKING: Record<"S1" | "S2", SpeakingPrompt> = {
  S1: {
    id: 'SP01',
    lvl: 1,
    image: 'https://pbpnhsgygwqxnkklhyuz.supabase.co/storage/v1/object/public/public-assets/eval/speaking-s1.png',
    prompt: 'Describe la imagen en inglés. ¿Qué ves? ¿Qué están haciendo las personas? Habla de 20 a 30 segundos.',
    rubric: 'task completion, basic vocabulary, sentence structure, fluency',
    band: 'A2-B1',
  },
  S2: {
    id: 'SP02',
    lvl: 3,
    audio: 'Tell me about a challenge you faced at work or school, and how you handled it.',
    prompt: 'Responde en inglés, de 30 a 45 segundos.',
    rubric: 'narrative coherence, grammatical range (past tenses, connectors), vocabulary, fluency',
    band: 'B2+',
  },
};

export const SECTIONS: { key: SectionKey; name: string; icon: string; hex: string; count: number }[] = [
  { key: 'V', name: 'Vocabulario y Traducción', icon: '🧩', hex: '#F5178C', count: 6 },
  { key: 'L', name: 'Escucha', icon: '🎧', hex: '#5B8DEF', count: 6 },
  { key: 'R', name: 'Lectura', icon: '📖', hex: '#6DC067', count: 6 },
  { key: 'W', name: 'Escritura', icon: '✍️', hex: '#FFC531', count: 6 },
  { key: 'S', name: 'Situaciones Reales', icon: '🌎', hex: '#35C3F0', count: 5 },
];

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Band = (typeof LEVELS)[number];

export const LEVEL_DESC: Record<Band, string> = {
  A1: 'Principiante: entiendes y usas expresiones básicas del día a día.',
  A2: 'Básico: puedes comunicarte en situaciones sencillas y familiares.',
  B1: 'Intermedio: puedes mantener conversaciones sobre temas conocidos.',
  B2: 'Intermedio alto: te comunicas con fluidez en la mayoría de contextos.',
  C1: 'Avanzado: usas el inglés con eficacia en contextos profesionales y sociales.',
  C2: 'Dominio: te expresas con precisión y naturalidad casi nativa.',
};

// ---------------- engine (same rules as Base44) ----------------

export type SectionResult = { correct: number[]; total: number; endLvl: number };
export type Results = Partial<Record<SectionKey, SectionResult>>;
export type AiBand = { band?: string | null } | null | undefined;
export type Product = "celstv" | "celsbsns" | "bundle";
export type Goal = "work" | "general";

export function pickItem(secKey: SectionKey, used: string[], lvl: number): Item | null {
  let best: Item | null = null;
  let bestDist = 99;
  for (const it of BANK[secKey]) {
    if (used.includes(it.id)) continue;
    const d = Math.abs(it.lvl - lvl);
    if (d < bestDist) {
      bestDist = d;
      best = it;
    }
  }
  return best;
}

export function sectionLevel(key: SectionKey, results: Results) {
  const r = results[key];
  if (!r || r.total === 0) return 1;
  if (r.correct.length) return Math.max(...r.correct);
  return r.endLvl;
}

export function globalLevel(results: Results, frResult: AiBand, speakingResult: AiBand) {
  const w: Record<SectionKey, number> = { V: 1, L: 1.2, R: 1, W: 1, S: 1.2 };
  let sum = 0;
  let tw = 0;
  for (const sec of SECTIONS) {
    sum += sectionLevel(sec.key, results) * w[sec.key];
    tw += w[sec.key];
  }
  let g = sum / tw;
  for (const ai of [frResult, speakingResult]) {
    const b = ai?.band ? LEVELS.indexOf(ai.band as Band) : -1;
    if (b >= 0) g += Math.max(-0.5, Math.min(0.5, b - g));
  }
  return Math.max(0, Math.min(5, Math.round(g)));
}

/** B1 + professional goal → the bundle; CelsBSNS needs B2 or more. */
export function recommendation(g: number, goal: Goal | null) {
  const work = goal === "work";
  const band = LEVELS[g];
  if (work && g >= 3)
    return { product: "celsbsns" as Product, emoji: "💼", name: "CelsBSNS", hex: "#5B8DEF", why: `Con tu nivel ${band} ya estás listo para el inglés profesional: juntas, correos, negociación y entrevistas.`, path: null };
  if (work && g === 2)
    return { product: "bundle" as Product, emoji: "🚀", name: "CelsTV + CelsBSNS", hex: "#FFC531", why: `Tu meta es profesional y tu nivel es B1. Este paquete usa CelsTV para llevarte a B2 mientras te preparas para dominar CelsBSNS.`, path: null };
  if (g <= 1)
    return {
      product: "celstv" as Product,
      emoji: "🌱",
      name: "CelsTV",
      hex: "#6DC067",
      why: `Tu nivel ${band} indica que lo mejor es construir una base sólida. CelsTV te lleva paso a paso desde lo esencial${work ? " — y CelsBSNS será tu siguiente paso natural" : ""}.`,
      path: work ? "Tu ruta: CelsTV → CelsBSNS" : null,
    };
  return { product: "celstv" as Product, emoji: "🎬", name: "CelsTV", hex: "#F5178C", why: `Tu nivel ${band} y tu meta de fluidez conversacional encajan perfecto con nuestros episodios: inglés real, de nuestra generación.`, path: null };
}

export const pickSpeakingPrompt = (lvl: number) => (lvl <= 2 ? SPEAKING.S1 : SPEAKING.S2);
export const frLevelFor = (lvl: number) => Math.max(1, Math.min(4, lvl));

/** What the student answered: option text (multiple choice), the built sentence (unscramble) or a word index (spot). */
export type Answer = string | number;

export function isCorrect(item: Item, answer: Answer) {
  if (item.type === "unscramble") return typeof answer === "string" && answer === item.ans;
  if (item.type === "spot") return typeof answer === "number" && answer === item.bad;
  return typeof answer === "string" && !!item.opts && answer === item.opts[0];
}

/** Adaptive state across the whole test (the level carries over from section to section). */
export type EngineState = { secIdx: number; lvl: number; streakUp: number; streakDown: number; used: string[]; asked: number; results: Results };

export const initialEngine = (): EngineState => ({ secIdx: 0, lvl: 1, streakUp: 0, streakDown: 0, used: [], asked: 0, results: {} });

/** Opens the current section and returns its first item. */
export function enterSection(s: EngineState): { state: EngineState; item: Item | null } {
  const sec = SECTIONS[s.secIdx];
  const item = pickItem(sec.key, s.used, s.lvl);
  return {
    state: {
      ...s,
      asked: 0,
      streakUp: 0,
      streakDown: 0,
      results: { ...s.results, [sec.key]: { correct: [], total: 0, endLvl: s.lvl } },
      used: item ? [...s.used, item.id] : s.used,
    },
    item,
  };
}

/** Records an answer to `item`; returns the next item of the section, or null when the section is over. */
export function answer(s: EngineState, item: Item, correct: boolean): { state: EngineState; next: Item | null } {
  const sec = SECTIONS[s.secIdx];
  const r = s.results[sec.key] ?? { correct: [], total: 0, endLvl: s.lvl };
  let { lvl, streakUp, streakDown } = s;
  if (correct) {
    streakUp += 1;
    streakDown = 0;
    if (streakUp >= 2) {
      lvl = Math.min(5, lvl + 1);
      streakUp = 0;
    }
  } else {
    streakDown += 1;
    streakUp = 0;
    if (streakDown >= 2) {
      lvl = Math.max(0, lvl - 1);
      streakDown = 0;
    }
  }
  const results = { ...s.results, [sec.key]: { correct: correct ? [...r.correct, item.lvl] : r.correct, total: r.total + 1, endLvl: lvl } };
  const asked = s.asked + 1;
  const base = { ...s, lvl, streakUp, streakDown, asked, results };
  if (asked < sec.count) {
    const next = pickItem(sec.key, s.used, lvl);
    return { state: { ...base, used: next ? [...s.used, next.id] : s.used }, next };
  }
  return { state: base, next: null };
}

export type AnswerLog = { id: string; answer: Answer }[];

/**
 * Server-side replay: walks the same adaptive path the browser walked, checking every answer
 * against the bank. Returns null if the log doesn't match the path the engine would take.
 */
export function replay(log: AnswerLog) {
  let s = initialEngine();
  let i = 0;
  // Levels at the two AI tasks: writing after Escritura (section 4), speaking after Escucha (section 2).
  let speakingLvl = 1;
  let writingLvl = 1;
  for (s.secIdx = 0; s.secIdx < SECTIONS.length; s.secIdx++) {
    let { state, item } = enterSection(s);
    s = state;
    while (item) {
      const entry = log[i++];
      if (!entry || entry.id !== item.id) return null;
      const r = answer(s, item, isCorrect(item, entry.answer));
      s = r.state;
      item = r.next;
    }
    if (s.secIdx === 1) speakingLvl = s.lvl;
    if (s.secIdx === 3) writingLvl = s.lvl;
  }
  if (i !== log.length) return null;
  return { results: s.results, speakingPrompt: pickSpeakingPrompt(speakingLvl), frLevel: frLevelFor(writingLvl) };
}

export function buildResult(results: Results, frResult: AiBand, speakingResult: AiBand, goal: Goal | null) {
  const g = globalLevel(results, frResult, speakingResult);
  const skillLevels = Object.fromEntries(SECTIONS.map((sec) => [sec.key, LEVELS[sectionLevel(sec.key, results)]])) as Record<SectionKey, Band>;
  return { g, band: LEVELS[g], skillLevels, recommendation: recommendation(g, goal) };
}
