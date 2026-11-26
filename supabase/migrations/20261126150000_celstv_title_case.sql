-- CelsTV: episode titles in title case, as the quizzes and the new CelsBook covers already write them.
update public.modules m set title = v.t, title_en = case when m.title_en is null then null else v.t end
from (values (4, 'Episode 5: My Basic Needs'), (5, 'Episode 6: Let''s Eat'), (9, 'Episode 10: Let''s Go Shopping'), (10, 'Episode 11: Let''s Go to Work')) v(s, t)
where m.course_id = '0928ee68-d20b-4cdf-8e4b-5489ce16b4a3' and m.sort_order = v.s;

update public.content_blocks b set data = jsonb_set(b.data, '{cover,title_en}', to_jsonb(v.t))
from public.lessons l, public.modules m, (values (4, 'Episode 5: My Basic Needs'), (5, 'Episode 6: Let''s Eat')) v(s, t)
where l.id = b.lesson_id and m.id = l.module_id and m.course_id = '0928ee68-d20b-4cdf-8e4b-5489ce16b4a3'
  and m.sort_order = v.s and b.block_type = 'celsbook';
