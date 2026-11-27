# CelsTV Section 2 (eps 10–17) content pipeline

Each `spec-NN.mjs` is the approved Cowork content for one episode (Nov 26, 2026): CelsBook groups and verb examples,
Grammar v2 sections, the CelsCast script and the quiz. `pipe.mjs` turns a spec into `audio_jobs` rows (ElevenLabs,
Amy/Brian), then into the `celsbook`, `celscast`, grammar `data.v2` and `celstv_quiz` blocks.

    node pipe.mjs jobs  <ep>   dry run: clips, characters, card checks
    node pipe.mjs queue <ep>   insert the clips into audio_jobs (then run generate-audio)
    node pipe.mjs build <ep>   build the blocks from the finished clips
    node pipe.mjs write <ep>   join the CelsCast (concat-audio) and write the blocks (backup in ep<N>.before.json)

Needs `SUPABASE_SECRET_KEY` and `SUPABASE_ANON_JWT` in the environment, and an `index.json` of the episodes'
lessons. `cards16.mjs` rebuilt the ep 16 cards (old list: `docs/celstv-s2/ep16-cards-before.json`).
Ep 9 was built by hand with the same shapes before this pipeline existed.
