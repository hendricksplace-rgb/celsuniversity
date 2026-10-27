-- C-017: week 1 plays Julian Treasure (TED's own stream) as the main talk; the Velazquez TEDx talk
-- (YouTube only, old id v3XJ5mC2hWQ removed) becomes a "Ver en YouTube" link to its live id 2Yw6dFQBklA.
-- Week 7's two TEDx talks exist on ted.com only as YouTube videos: embed YouTube directly so the page can
-- detect a failure and show the YouTube card. Backup: docs/backups/2026-10-27-celsbsns-reading-videos-before-C-017.json
update public.reading_content
set data = jsonb_set(
  data, '{video}',
  ((data->'video') - 'extra'::text)
    || jsonb_build_object('slug', 'julian_treasure_how_to_speak_so_that_people_want_to_listen', 'event', 'TED',
         'title', 'How to speak so that people want to listen', 'speaker', 'Julian Treasure', 'minutes', 10, 'source', 6)
    || jsonb_build_object('extra', jsonb_build_object(
         'provider', 'ted', 'slug', 'marcus_alexander_velazquez_the_art_of_effective_communication_jan_2020',
         'event', 'TEDx', 'title', 'The Art of Effective Communication', 'speaker', 'Marcus Alexander Velazquez',
         'minutes', 12, 'source', 5, 'yt', '2Yw6dFQBklA', 'youtube_only', true, 'link_only', true))
), updated_at = now()
where lesson_id = 'fef7822c-c5ba-405c-8eab-27bb39fecfe5'
  and data->'video'->>'slug' = 'marcus_alexander_velazquez_the_art_of_effective_communication_jan_2020';

update public.reading_content
set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(data,
      '{video,yt}', '"ebUh6en04Ao"'), '{video,youtube_only}', 'true'),
      '{video,extra,yt}', '"KlqT8k61xn4"'), '{video,extra,youtube_only}', 'true'),
    updated_at = now()
where lesson_id = 'dcb5b713-79ec-4db0-ae1b-6ad8307d1e50';
