import fs from "fs";
import { get, patch } from "./db.mjs";
const mods = await get("modules?course_id=eq.0928ee68-d20b-4cdf-8e4b-5489ce16b4a3&sort_order=lte.15&select=id,sort_order");
const cardsOf = async (ep) => { const m = mods.find((x) => x.sort_order === ep - 1); const ls = await get(`lessons?module_id=eq.${m.id}&select=id`);
  const [b] = await get(`content_blocks?lesson_id=in.(${ls.map((l) => l.id).join(",")})&block_type=eq.flashcard&select=id,data`); return b; };
const plan = [
  [9, ["Beach", "Couch", "Popcorn", "To relax", "To take a break", "Can you take time for yourself?"]],
  [10, ["Shampoo", "Cheese", "To buy", "To sell", "What is on sale?", "Can you help me find the laundry soap?"]],
  [11, ["Company", "Owner", "To advance", "Education is key to success.", "I am a dentist."]],
  [15, ["Engineer"]],
  [12, ["Guitar", "Speakers", "Volume", "To turn down", "I am playing the piano."]],
  [13, ["Tree", "Horse", "Sunset", "To plant", "I would like to go on a picnic.", "I have to cut my grass."]],
  [14, ["Van", "Miles", "Snacks", "To drive", "To spend", "How much will it cost?"]],
  [15, ["Goals", "Budget", "Career", "To dream", "What are your goals?", "I am planning my future."]],
  [1, ["Hello"]], [2, ["How are you today?"]], [3, ["Breakfast"]], [4, ["Grandmother"]], [5, ["I need to drink water"]], [16, ["Let’s go !"]],
];
const fix = { "I need to drink water": "I need to drink water.", "Let’s go !": "Let's go!" };
const ep16 = await cardsOf(16);
fs.writeFileSync("/home/user/celsuniversity/docs/celstv-s2/ep16-cards-before.json", JSON.stringify(ep16.data, null, 1));
const out = []; const src = {};
for (const [ep, list] of plan) {
  const cards = ep === 16 ? ep16.data.settings : (await cardsOf(ep)).data.settings;
  for (const back of list) {
    const c = cards.find((x) => x.back === back); if (!c) throw new Error(`ep ${ep}: no card ${back}`);
    const frontFix = { "Let’s go !": "¡Vámonos!", "I need to drink water": "Necesito tomar agua." };
    const card = { ...c, back: fix[back] ?? c.back, front: frontFix[back] ?? c.front };
    out.push(card); src[card.back] = ep;
  }
}
const order = { words: 0, verbs: 1, phrases: 2 };
const sorted = out.map((c, i) => [c, i]).sort((a, b) => order[a[0].category] - order[b[0].category] || a[1] - b[1]).map(([c]) => c);
fs.writeFileSync("ep16.cards.json", JSON.stringify(sorted));
console.log(sorted.length, "cards:", Object.entries(sorted.reduce((a, c) => ((a[c.category] = (a[c.category] ?? 0) + 1), a), {})).join(" "));
console.log(sorted.map((c) => `${c.category[0]}:${c.back}=${c.front}${c.back_audio ? "" : " (NO AUDIO)"}`).join(" | "));
if (process.argv[2] === "write") console.log("written", (await patch(`content_blocks?id=eq.${ep16.id}`, { data: { ...ep16.data, settings: sorted } })).length);
