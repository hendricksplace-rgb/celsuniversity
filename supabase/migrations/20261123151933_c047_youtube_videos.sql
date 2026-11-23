-- C-047: CelsTV 9–32 and the 4 CelsGLOBAL courses move their videos to YouTube (unlisted, channel "celstv").
-- Every link was checked before loading (vidIQ video lookup: exists, title matches; CelsGLOBAL lengths match the
-- Wistia files' duration_s to ±1 s). The old URL always stays in data.media_url_legacy.
-- Idempotent: every statement matches by block / lesson / module id and only touches rows whose media_url is not
-- the new link yet, so re-running changes nothing.
-- Not touched on purpose: CelsTV 1–8 (already on these links), CelsTV 33–40 (no videos yet), Visa TN "¡WELCOME!"
-- (cac4a25a…) and Módulo 2 "YouTube Video" (88fd83ed…), and the Visa TN Módulo 1 guided step video (it plays
-- ¡WELCOME!, which has no YouTube link yet). See docs/reports/C-047-content-report.md.

-- 1. CelsTV episode 9: the old embed (c9CL6JFSBDA, not the new video) becomes a video block.
update public.content_blocks
set block_type = 'video',
    body = null,
    data = jsonb_build_object(
      'provider', 'youtube',
      'media_url', 'https://youtu.be/p7UiA5-0Fu4',
      'media_url_legacy', coalesce(data #>> '{settings,src}', data ->> 'media_url_legacy')),
    updated_at = now()
where id = 'ef0c2ab5-b1be-40b1-b917-6d52258efc8f'
  and data ->> 'media_url' is distinct from 'https://youtu.be/p7UiA5-0Fu4';

-- 2. CelsTV episodes 10–32: one video block in the (empty) CelsVideo lesson.
insert into public.content_blocks (lesson_id, block_type, data, teacher_only, offline, sort_order, language)
select v.lesson_id::uuid, 'video', jsonb_build_object('provider', 'youtube', 'media_url', v.url), false, false, 0, 'both'
from (values
  ('e5ea579c-ea91-4559-bbc9-49f64d3b9bdb', 'https://youtu.be/Ok6Cqv1nXo4'), -- Ep 10 Let's Go Shopping
  ('4ac60378-3299-4e90-8543-66fd68af40b0', 'https://youtu.be/_keMPCaV4-E'), -- Ep 11 Let's Go to Work
  ('2ff43a3f-63ca-4a97-9669-32d5a85d4a1d', 'https://youtu.be/44vs-x5RpYs'), -- Ep 12 Music and Me
  ('614bdf9f-a7c1-4fa2-8ceb-7e3abb6af38e', 'https://youtu.be/l4gLWvI9oG4'), -- Ep 13 Plants & Nature
  ('5d567909-55fb-4c6e-baa7-f9254a827330', 'https://youtu.be/UEjQYH3E_oY'), -- Ep 14 Road Trip
  ('f28207e1-e46a-462e-b6da-96d9797649e4', 'https://youtu.be/8d_rSaRx6r0'), -- Ep 15 Goals and Dreams
  ('97274485-71a4-4eff-947d-efeba3e14db7', 'https://youtu.be/rv9sRUWK1UQ'), -- Ep 16 Review 2
  ('71178a5b-a1bb-40c1-a087-b9de26cad7bc', 'https://youtu.be/iE1BYd_B090'), -- Ep 17 Hobbies Are Us
  ('59993350-c845-433d-94a0-a76d48ff2ccf', 'https://youtu.be/Yu5SvXYd2jM'), -- Ep 18 Life in the City
  ('aa56f52e-de55-4d0a-8276-52228567b2ea', 'https://youtu.be/ZR2M-b8GDD8'), -- Ep 19 Transportation
  ('e3265f0f-178f-4a59-a86e-8d7eba92f986', 'https://youtu.be/i2-TqCE8Bx4'), -- Ep 20 Religions
  ('6cc76116-8533-4b8f-bd16-bd90e2b3a1c2', 'https://youtu.be/aF-_90gngJc'), -- Ep 21 Sports
  ('d207256f-7f87-4fe8-80ce-444991ca9028', 'https://youtu.be/vDxopYcsm7M'), -- Ep 22 Education
  ('847fc00e-8285-49f2-b47e-5819bda36b8b', 'https://youtu.be/hG6BaQ3hFfM'), -- Ep 23 Going on Vacation
  ('d475a04c-0674-46a4-a0f4-c269e6e673ac', 'https://youtu.be/xe1MBBv8P1Q'), -- Ep 24 Review 3
  ('76ee6a2c-7134-464d-b8ae-9a97d82c80e0', 'https://youtu.be/Hop2j4cgb6g'), -- Ep 25 Fashion
  ('05c47e0a-87d9-4958-b5e1-d7f6b0b1360e', 'https://youtu.be/OxCNQ2JYaJo'), -- Ep 26 My Family Growing Together
  ('39a311e8-d07d-4b3f-926a-e620f64b5fc4', 'https://youtu.be/4DtPCD5J7tM'), -- Ep 27 Social Media
  ('d211e486-3c4c-43b9-baa6-a27698b32c90', 'https://youtu.be/PlnFbBM3mm4'), -- Ep 28 Going Out With My Friends
  ('ed8ec1da-d38f-46ff-b816-ebc76ef2e44b', 'https://youtu.be/yaSdZ51I1tE'), -- Ep 29 Going to the Beach
  ('609827b8-3c83-4937-ae9f-2c6370439e3a', 'https://youtu.be/oTQ7yhC5HB0'), -- Ep 30 My Home
  ('772fd3fd-336d-47ff-89dc-39304e9bdc00', 'https://youtu.be/80YzkoWf5J4'), -- Ep 31 Wild Animals
  ('1ce2e5e9-01d4-4df0-a877-707a6fab575a', 'https://youtu.be/GCMDvCZ5wKg')  -- Ep 32 Review 4
) as v(lesson_id, url)
where not exists (
  select 1 from public.content_blocks b where b.lesson_id = v.lesson_id::uuid and b.block_type = 'video'
);

-- 3. CelsTV CelsVideo lessons 9–32 are visible again.
update public.lessons l
set has_content = true, updated_at = now()
from public.modules m
where m.id = l.module_id
  and m.course_id = (select id from public.courses where slug = 'celstv-english-for-our-generation')
  and m.sort_order between 8 and 31
  and l.lesson_type = 'video' and l.title = 'CelsVideo'
  and l.has_content is distinct from true
  and exists (select 1 from public.content_blocks b where b.lesson_id = l.id and b.block_type = 'video');

-- 4. CelsGLOBAL "Module Training Video" blocks: Wistia (or storage, Visa TN 1) → YouTube, in place.
--    From CV to Resume 5 and 6 have two identical blocks each: both are updated, neither deleted (see report).
update public.content_blocks b
set data = (b.data - 'mime') || jsonb_build_object(
      'provider', 'youtube',
      'media_url', v.url,
      'media_url_legacy', coalesce(b.data ->> 'media_url', b.data ->> 'media_url_legacy'))
    -- Visa TN 1 already had a legacy link (its Base44 original): keep it next to the storage path.
    || case when b.data ? 'media_url_legacy' then jsonb_build_object('media_url_legacy_prev', b.data ->> 'media_url_legacy') else '{}'::jsonb end,
    updated_at = now()
from (values
  -- Tu Camino Con La Visa TN (Ep 1 was a storage .mp4 of 377 s = YouTube 6:17)
  ('9a7c5f21-72a6-4851-8761-2d4e6f5a1568', 'https://youtu.be/hUIJtWdqvZ8'),
  ('3106af74-c0bd-4da3-8dfc-cae6b7670f21', 'https://youtu.be/Jtez_SS9ROw'),
  ('be5e84c0-5cb5-4121-a447-c822396fd5e6', 'https://youtu.be/D2mtglKdXvQ'),
  ('28baf17c-f96f-472b-9133-f46b5a842f99', 'https://youtu.be/JY7GH5n_ggI'),
  ('0ed4aab1-1476-4d05-8102-399f54493960', 'https://youtu.be/ahyf100zr9U'),
  ('b2271e58-8b1a-46ec-ad17-9e1f2beb5759', 'https://youtu.be/8pA3XiEq6hA'),
  ('fc59dea9-349d-4b71-805e-b6e59d293c99', 'https://youtu.be/ECpE3IG6ODs'),
  ('e7d5cc70-571d-4439-85be-a8ffda7b2586', 'https://youtu.be/Gc32lpCBvjY'),
  -- From CV to U.S. Resume
  ('f93814cf-6b4e-46e9-b727-85d580495ce5', 'https://youtu.be/PYKlr5iCO00'),
  ('457b5e2b-286a-4fb4-ab2f-ea6d42f7a190', 'https://youtu.be/1MIolVainA0'),
  ('0b7a6f0e-87bd-4cdd-a27d-8b266d591edf', 'https://youtu.be/antYUH9nNdQ'),
  ('ea7faa62-9ad5-4a5f-8603-cddc8d00ef06', 'https://youtu.be/dE4hC60fp48'),
  ('83fd303e-79b4-43a3-a420-d1c968015559', 'https://youtu.be/95qXpAVJuII'),
  ('fa118f8a-7783-45fa-9cbb-77712cc37db8', 'https://youtu.be/95qXpAVJuII'),
  ('681d09ed-9ff6-41bc-9ac4-3d01e7d99ca5', 'https://youtu.be/nX7EpaKY5JE'),
  ('feb0a4f7-b53e-4cb3-a89c-c620f9ee3fde', 'https://youtu.be/nX7EpaKY5JE'),
  -- Crack the U.S. Interview Code
  ('a24006d6-1153-4d5b-a6fc-c8c21a1ea608', 'https://youtu.be/sNzosDmxn50'),
  ('ddef5e4e-5c94-4eb6-9f44-29e712f91344', 'https://youtu.be/YwDCkO8S9rU'),
  ('dc877bf1-96c7-4998-90ed-724f1f0647cc', 'https://youtu.be/CV9nrRV889E'),
  ('3e9becd9-52b2-4985-8838-3ff2457c4ca3', 'https://youtu.be/-MD-ovos07g'),
  ('9fc80869-9d16-4a00-bdbf-e93da983d6c9', 'https://youtu.be/mCCNg_HiIyI'),
  ('167ff958-fb88-46eb-aff7-10cf89c9e949', 'https://youtu.be/W3A_PnVhsFk'),
  -- Finanzas Personales en Estados Unidos
  ('5db22c2e-e2bd-43e0-b096-bb990593576a', 'https://youtu.be/dEOhe-YWjuM'),
  ('e62c4a1d-83f7-4ab2-81a7-d2cfc69c1d78', 'https://youtu.be/ak8tBTLKgbw'),
  ('8c574357-cd07-4106-9d67-53df6be12ae5', 'https://youtu.be/gYo5UoOQIhQ'),
  ('12460e48-89d8-4b6a-adeb-c38d3a4be345', 'https://youtu.be/KRdjVlGLuZQ'),
  ('d0041784-6bb8-4f4a-a84e-7e717158af0f', 'https://youtu.be/wHe-mFt8PeM'),
  ('e44b8dbc-101e-4842-91ee-394e4e489d6b', 'https://youtu.be/udmD4GgCAyY'),
  ('f91e75d8-7c73-4d49-891b-738b850f5b61', 'https://youtu.be/h4tIsRJGksA'),
  ('ec3a2f28-0a25-4f8c-b9ae-72e654fb64aa', 'https://youtu.be/J1ShF4OUNH0')
) as v(block_id, url)
where b.id = v.block_id::uuid
  and b.data ->> 'media_url' is distinct from v.url;

-- 5. What CelsGLOBAL students actually see: the guided step's main video (guided_course_steps.data.video).
--    The C-020 poster and duration_s stay; the player (GuidedStepView StepVideo) now plays YouTube on tap.
update public.guided_course_steps s
set data = jsonb_set(s.data, '{video}', (s.data -> 'video') || jsonb_build_object(
      'provider', 'youtube',
      'media_url', v.url,
      'media_url_legacy', coalesce(s.data -> 'video' ->> 'media_url', s.data -> 'video' ->> 'media_url_legacy'))),
    updated_at = now()
from (values
  -- Visa TN (Módulo 1 not here: its step plays ¡WELCOME!, which has no YouTube link)
  ('dbcf4cbc-aadf-4d67-b87a-454832b011e6', 'https://youtu.be/Jtez_SS9ROw'),
  ('214ae068-db84-4504-a181-f4a98961d236', 'https://youtu.be/D2mtglKdXvQ'),
  ('9b3da52d-23ef-4e2d-91d0-134045f80086', 'https://youtu.be/JY7GH5n_ggI'),
  ('bf50064c-0250-4d6c-a0ad-5d8091f9381b', 'https://youtu.be/ahyf100zr9U'),
  ('5f806c78-c1bb-4548-b584-c181a4eaac7d', 'https://youtu.be/8pA3XiEq6hA'),
  ('20419acf-4841-4972-911e-860873e71f4e', 'https://youtu.be/ECpE3IG6ODs'),
  ('a31877c9-788c-4361-80ca-b16d7a7cefcd', 'https://youtu.be/Gc32lpCBvjY'),
  -- From CV to U.S. Resume
  ('8c46d8ac-c661-452f-ad40-5a868da1a712', 'https://youtu.be/PYKlr5iCO00'),
  ('3ea63d9d-1f87-48fc-9f08-6cd5dc0e4382', 'https://youtu.be/1MIolVainA0'),
  ('b9a87a7f-d636-4fc2-9f4e-1b303285254a', 'https://youtu.be/antYUH9nNdQ'),
  ('8329805d-dd16-441c-bd24-3b38889d1748', 'https://youtu.be/dE4hC60fp48'),
  ('0511ec58-33be-4cff-ada8-e71ec2e87072', 'https://youtu.be/95qXpAVJuII'),
  ('5c92deba-1649-44b4-adca-d42fd18c19d7', 'https://youtu.be/nX7EpaKY5JE'),
  -- Crack the U.S. Interview Code
  ('dcf51ecb-ef3a-4c60-9671-0a1424d5a108', 'https://youtu.be/sNzosDmxn50'),
  ('e279a2f1-3264-4013-a7d2-94bb5b44dd05', 'https://youtu.be/YwDCkO8S9rU'),
  ('4fe4ff7a-b2e9-4c31-a794-27572eeb2c9b', 'https://youtu.be/CV9nrRV889E'),
  ('924602ba-09c9-43d7-8e61-329a2fd09fe6', 'https://youtu.be/-MD-ovos07g'),
  ('382a2c65-c20f-4483-a2ef-77ad66b3eb40', 'https://youtu.be/mCCNg_HiIyI'),
  ('50ab6155-9506-4174-9017-73dfd9f5bd93', 'https://youtu.be/W3A_PnVhsFk'),
  -- Finanzas Personales en Estados Unidos
  ('74b4988a-1e76-4178-8bb2-b02d51653961', 'https://youtu.be/dEOhe-YWjuM'),
  ('774cc4f1-0ad6-4a93-ade0-cdbdd2ed4538', 'https://youtu.be/ak8tBTLKgbw'),
  ('07191cfc-5414-49cb-9ce7-f0c6013c983a', 'https://youtu.be/gYo5UoOQIhQ'),
  ('3450cb12-7faf-4516-b59c-50260b9fa2a6', 'https://youtu.be/KRdjVlGLuZQ'),
  ('b6bd85bc-b12a-455f-9d25-a38cac353e76', 'https://youtu.be/wHe-mFt8PeM'),
  ('0affa973-982e-4960-8646-a5cb563d68ca', 'https://youtu.be/udmD4GgCAyY'),
  ('62439c07-243c-4002-a012-a27836f3444d', 'https://youtu.be/h4tIsRJGksA'),
  ('97be0dfc-53fc-4de4-8eda-3fa0f68b861a', 'https://youtu.be/J1ShF4OUNH0')
) as v(module_id, url)
where s.module_id = v.module_id::uuid
  and s.data -> 'video' is not null and jsonb_typeof(s.data -> 'video') = 'object'
  and s.data -> 'video' ->> 'media_url' is distinct from v.url;
