# CelsTV Ep 18 — approved content (Cowork → Claude Code)

**Status:** ✅ approved by Matt (Nov 26, 2026). Build only ep 18 for now; 19–24 come later, one at a time.
Source of truth: project doc `claude/celsu-celstv-ep18-24-contenido.md` (this file is the ep 18 section, copied as is).

## Build notes
- Same standard and process as 9–17: card Spanish → audio (`audio_jobs` + `generate-audio`, Amy `OZxMHsGaBmV5pjMIDIn0`, Brian `nPczCjzI2devNBz1zQrb`) → CelsBook v2 → Grammar v2 → CelsCast → quiz (10 + matching, explicit `build`).
- **Longer from here on (Matt):** the reading is ~85 words and the CelsCast ~2.5 min (12 dialogue lines). Keep every line.
- **Credits:** ElevenLabs is low. If ep 18 can't be fully generated, don't publish it half-done; report how far it got.
- **Photos** are already in `course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/quiz-photos/` as `.png`. Compress them to `.jpg` like 9–17, then delete the `.png` originals.
  - **Q1 "Choose the picture of Skyscrapers."** · correctAnswer **2** · images: 0 `houses` · 1 `tower` · 2 `skyscrapers` ✓ · 3 `church`
  - **Q5 "Choose the picture for To build."** · correctAnswer **1** · images: 0 `sitting-park` · 1 `building` ✓ · 2 `eating-restaurant` · 3 `shopping.jpg` (already exists, from ep 10)
- Quiz Q3 ("fire station") and Q7 ("I am looking for the theater.") reuse card audio.

## Decisions already made for later episodes (don't apply yet)
- Ep 20: card "On Sundays we go to the mosque." → **"On Fridays we go to the mosque."** (text + new card audio; ES: Los viernes vamos a la mezquita.)
- Ep 23: module title "Going to Vacation" → **"Episode 23: Going on Vacation"**.

---

# EPISODE 18 — Life in the City

**Grammar layer:** **going to** + base verb (plans and intentions).
- It's compared with the other two futures: *will* (14) and the progressive for arranged plans (15).
- Key point for Spanish speakers: *I'm going **to the** airport* (I'm going to a place) vs *I'm going **to visit*** (I'm going to do something).

## Cards: Spanish
| English | Today | **New** |
|---|---|---|
| Farmers market | Mercado agropecuario | **Mercado de productores (tianguis)** |
| To look | Mirar | **Ver / Mirar** |
| To shop | Comprar | **Ir de compras** |
| *I am driving on the wrong side of the road.* | Estoy conduciendo en el lado equivocado del camino | **Estoy manejando en el lado equivocado de la calle.** |
| *I am buying at the mall.* | …en la tienda departamental | **Estoy comprando en el centro comercial.** |
| The other phrases | (no period) | add the final period |

## CelsBook
- **Cover:** *Episode 18: Life in the City* · *Places, plans and getting around town.* · *Lugares, planes y cómo moverte en la ciudad.*
- **Words**
  - g1 **PARA PASEAR** / Sightseeing: Monument, Museum, Theater, Zoo, Tower
  - g2 **COMER Y COMPRAR** / Eat & shop: Restaurant, Coffee shop, Market, Store, Bookshop, Grocery store, Farmers market
  - g3 **SERVICIOS** / Services: Hospital, Police station, Fire station, Library, Church
  - g4 **ESCUELAS** / Schools: Elementary school, High school, College
  - g5 **EDIFICIOS** / Buildings: Houses, Skyscrapers
- **Verbs (going to)**

| Verb | ES | example_en | example_es |
|---|---|---|---|
| To eat | Comer | We are going to eat at a restaurant downtown. | Vamos a comer en un restaurante del centro. |
| To visit | Visitar | I'm going to visit the museum on Saturday. | Voy a visitar el museo el sábado. |
| To drive | Manejar | She is going to drive to the market. | Ella va a manejar al mercado. |
| To ask | Preguntar | I'm going to ask the police officer. | Le voy a preguntar al policía. |
| To look | Ver / Mirar | Look at the skyscrapers! | ¡Mira los rascacielos! |
| To look for | Buscar | They are going to look for a coffee shop. | Van a buscar una cafetería. |
| To sit | Sentarse | Are you going to sit in the park? | ¿Te vas a sentar en el parque? |
| To walk | Caminar | We are going to walk to the zoo. | Vamos a caminar al zoológico. |
| To shop | Ir de compras | My sister is going to shop at the mall. | Mi hermana va a ir de compras al centro comercial. |
| To live | Vivir | I'm going to live in the city next year. | El próximo año voy a vivir en la ciudad. |
| To build | Construir | They are going to build a new library. | Van a construir una biblioteca nueva. |

- **Review:**
  1. ¿Cómo se dice «Rascacielos»? → **Skyscrapers** · Towers · Houses · Monuments
  2. «I ___ going to visit the museum.» → **am** · is · are · be
  3. ¿Qué significa «Library»? → Librería · **Biblioteca** · Laboratorio · Museo *(a false friend!)*

## Grammar: Going to
- topic_es: *El futuro con going to (voy a…)* · hl: `\b(am|is|are|'m|'re|'s) going to\b`
- **s1 build:** *I am going to visit the museum.*
  - para es: *Usamos **am/is/are + going to + verbo base** para hablar de planes e intenciones: lo que ya decidimos hacer. Es igual que «voy a…» en español.*
  - examples: *I'm going to visit the zoo.* · *She is going to eat downtown.* · *We are going to walk to the park.*
- **s2 choose:** She going to visit the museum. · She is going to visits the museum. · She is going visit the museum. · **She is going to visit the museum.** ✓
  - why_es: *is + going to + verbo base. No olvides «is» ni «to».*
- **s3 fill:** I ___ going to shop downtown. (**am**/is/are) · They ___ going to build a library. (am/is/**are**) · ___ you going to take the bus? (**Are**/Is/Do)
- **s4 choose (place or action?, new):** Which sentence is a plan to DO something? → I'm going to the museum. · **I'm going to visit the museum.** ✓
  - why_es: *«Going to + lugar» = voy a ese lugar. «Going to + verbo» = voy a hacer algo.*
  - para es (the three futures): ***Will***: lo decides ahorita (*I'll help you*). ***Going to***: ya es tu intención (*I'm going to visit the museum*). ***Am + -ing***: está arreglado, con día y hora (*I'm meeting Ana at 5*).
- **s5 reading (~85 words):**
  > *This weekend, my family is going to explore the city. On Saturday morning, we are going to visit the museum and the old tower downtown. My dad is going to drive, but my mom wants to walk. At noon, we are going to eat at a small restaurant near the market. My little brother is going to see the animals at the zoo. On Sunday, I'm going to the library to look for a new book. Then we are going to sit in the park and look at the skyscrapers. What are you going to do this weekend?*
- **s6 phonics:**
  - **Short A vs long A:** backpack · snack · rack /æ/ — bake · cake · lake /eɪ/
  - **"Gonna":** in fast speech, *going to* + verb sounds like /ˈgʌnə/ (*I'm gonna eat*). But it's never used with a place: *I'm going to the airport.*
  - es: *Lo vas a escuchar muchísimo en películas y series.*

## CelsCast Ep 18 (~2.5 min)
- **Bienvenida:** the standard opening, episode 18. Amy: *Hoy paseamos por la ciudad.*
- **Planes en la ciudad**
  - Brian: Amy, what are you going to do this weekend?
  - Amy: I'm going to explore the city! I'm going to visit the museum.
  - Brian: Nice. Which museum?
  - Amy: The history museum, next to the old tower. Then I'm going to eat at a coffee shop.
  - Brian: I'm going to the farmers market on Saturday morning.
  - Amy: What are you going to buy?
  - Brian: Fruit, vegetables and fresh bread. Then I'm going to look for a new book at the bookshop.
  - Amy: Are you going to drive?
  - Brian: No, I'm going to walk. The city is beautiful in the morning.
  - Amy: Great idea. Can you help me find the grocery store on the map?
  - Brian: Sure! It's near the library.
  - Amy: Perfect. Let's meet at the park on Sunday!
- **Lo que escuchaste**
  - Amy: *I'm going to visit*: «voy a visitar». Pero *I'm going to the farmers market*: «voy al mercado».
  - Amy: ¡Ojo! *Bookshop* es «librería» y *library* es «biblioteca». Son falsos amigos.
  - Amy: *Skyscrapers* son «rascacielos».
- **Repite conmigo:** Museum… Library… Bookshop… Skyscrapers… / I'm going to visit the museum… What are you going to do this weekend?
- **¿Cómo se dice?**
  - «Voy a visitar el museo» → *I'm going to visit the museum.*
  - «Biblioteca» → *Library.*
  - «¿Qué vas a hacer este fin de semana?» → *What are you going to do this weekend?*
- **Hasta la próxima:** Amy: *Practica hoy: di tres planes para este fin de semana con «I'm going to…».* · Brian: See you next time. Bye! · Amy: *¡Nos vemos en el episodio diecinueve!*

## Quiz Ep 18
1. **select-image** (Words): Choose the picture of **Skyscrapers** → skyscrapers ✓ · houses · tower · church
2. **select-text** (Words): Where can you borrow books for free? → **Library** ✓ · Bookshop · Museum · Market
3. **listen-and-select** (Words): *"fire station"* → **Fire station** ✓ · Police station · Hospital · Theater
4. **select-text** (Verbs): "They are going to ___ for a coffee shop." → **look** ✓ · sit · build · live
5. **select-image** (Verbs): **To build** → building ✓ · sitting on a bench · eating at a restaurant · shopping *(reused)*
6. **select-text** (Phrases): "Voy al aeropuerto." → **I am going to the airport.** ✓ · I am going to fly. · I am looking for the airport. · I go airport.
7. **listen-and-select** (Phrases): *"I am looking for the theater."* → …the museum · **…the theater** ✓ · …the market · …the zoo
8. **select-text** (Grammar): Which is correct? → **She is going to visit the museum.** ✓ · She going to visit… · She is going to visits… · She is going visit…
9. **select-text** (Grammar): Which is a plan to DO something? → **I'm going to visit the zoo.** ✓ · I'm going to the zoo.
10. **build:** *going to / We / are / eat downtown* → **We are going to eat downtown.**

**New photos:** skyscrapers, houses, tower, church, construction workers building, person sitting on a park bench, people eating at a restaurant. That's 7.

---

