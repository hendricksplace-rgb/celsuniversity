-- CelsTV Section 2, eps 10-15 (approved by Matt 2026-11-26): the CelsCards' Spanish in Mexican Spanish.
-- The English and its audio stay as in the videos; "ask for" (ep 15) waits for the card voice.

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'Toothpaste' then jsonb_set(c, '{front}', to_jsonb('Pasta de dientes'::text))
      when c->>'back' = 'Banana' then jsonb_set(c, '{front}', to_jsonb('Plátano'::text))
      when c->>'back' = 'Steak' then jsonb_set(c, '{front}', to_jsonb('Bistec'::text))
      when c->>'back' = 'Lemon' then jsonb_set(c, '{front}', to_jsonb('Limón amarillo'::text))
      when c->>'back' = 'To shop' then jsonb_set(c, '{front}', to_jsonb('Ir de compras'::text))
      when c->>'back' = 'To look' then jsonb_set(c, '{front}', to_jsonb('Ver / Mirar'::text))
      when c->>'back' = 'To keep' then jsonb_set(c, '{front}', to_jsonb('Quedarse con'::text))
      when c->>'back' = 'What is on sale?' then jsonb_set(c, '{front}', to_jsonb('¿Qué está en oferta?'::text))
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l join public.modules m on m.id = l.module_id join public.courses co on co.id = m.course_id
where l.id = b.lesson_id and co.slug = 'celstv-english-for-our-generation' and m.sort_order = 9 and b.block_type = 'flashcard';

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'Portuguese' then jsonb_set(c, '{front}', to_jsonb('Portugués'::text))
      when c->>'back' = 'Painting' then jsonb_set(c, '{front}', to_jsonb('Pintura'::text))
      when c->>'back' = 'Singing' then jsonb_set(c, '{front}', to_jsonb('Cantar'::text))
      when c->>'back' = 'Student' then jsonb_set(c, '{front}', to_jsonb('Estudiante'::text))
      when c->>'back' = 'Teacher' then jsonb_set(c, '{front}', to_jsonb('Maestro(a)'::text))
      when c->>'back' = 'Secretary' then jsonb_set(c, '{front}', to_jsonb('Secretario(a)'::text))
      when c->>'back' = 'Basketball' then jsonb_set(c, '{front}', to_jsonb('Básquetbol'::text))
      when c->>'back' = 'Soccer' then jsonb_set(c, '{front}', to_jsonb('Futbol'::text))
      when c->>'back' = 'Video games' then jsonb_set(c, '{front}', to_jsonb('Videojuegos'::text))
      when c->>'back' = 'Company' then jsonb_set(c, '{front}', to_jsonb('Empresa'::text))
      when c->>'back' = 'To exercise' then jsonb_set(c, '{front}', to_jsonb('Hacer ejercicio'::text))
      when c->>'back' = 'To promote' then jsonb_set(c, '{front}', to_jsonb('Ascender / Promover'::text))
      when c->>'back' = 'I enjoy basketball two times a week.' then jsonb_set(c, '{front}', to_jsonb('Disfruto el básquetbol dos veces por semana.'::text))
      when c->>'back' = 'I am on a soccer team.' then jsonb_set(c, '{front}', to_jsonb('Estoy en un equipo de futbol.'::text))
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l join public.modules m on m.id = l.module_id join public.courses co on co.id = m.course_id
where l.id = b.lesson_id and co.slug = 'celstv-english-for-our-generation' and m.sort_order = 10 and b.block_type = 'flashcard';

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'Pop' then jsonb_set(c, '{front}', to_jsonb('Pop'::text))
      when c->>'back' = 'Rock' then jsonb_set(c, '{front}', to_jsonb('Rock'::text))
      when c->>'back' = 'Country' then jsonb_set(c, '{front}', to_jsonb('Country'::text))
      when c->>'back' = 'Classical' then jsonb_set(c, '{front}', to_jsonb('Clásica'::text))
      when c->>'back' = 'Lyrics' then jsonb_set(c, '{front}', to_jsonb('Letra'::text))
      when c->>'back' = 'Speakers' then jsonb_set(c, '{front}', to_jsonb('Bocinas'::text))
      when c->>'back' = 'Play' then jsonb_set(c, '{front}', to_jsonb('Reproducir'::text))
      when c->>'back' = 'To turn down' then jsonb_set(c, '{front}', to_jsonb('Bajar (el volumen)'::text))
      when c->>'back' = 'To play' then jsonb_set(c, '{front}', to_jsonb('Tocar (un instrumento)'::text))
      when c->>'back' = 'To be loud' then jsonb_set(c, '{front}', to_jsonb('Hacer mucho ruido'::text))
      when c->>'back' = 'To move' then jsonb_set(c, '{front}', to_jsonb('Moverse'::text))
      when c->>'back' = 'I’m playing the radio.' then jsonb_set(c, '{front}', to_jsonb('Estoy poniendo la radio.'::text))
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l join public.modules m on m.id = l.module_id join public.courses co on co.id = m.course_id
where l.id = b.lesson_id and co.slug = 'celstv-english-for-our-generation' and m.sort_order = 11 and b.block_type = 'flashcard';

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'Grass' then jsonb_set(c, '{front}', to_jsonb('Pasto'::text))
      when c->>'back' = 'Pasture' then jsonb_set(c, '{front}', to_jsonb('Pastizal'::text))
      when c->>'back' = 'To picnic' then jsonb_set(c, '{front}', to_jsonb('Hacer un día de campo'::text))
      when c->>'back' = 'To pet' then jsonb_set(c, '{front}', to_jsonb('Acariciar'::text))
      when c->>'back' = 'I have to cut my grass.' then jsonb_set(c, '{front}', to_jsonb('Tengo que cortar el pasto.'::text))
      when c->>'back' = 'I would like to go on a picnic.' then jsonb_set(c, '{front}', to_jsonb('Me gustaría ir de día de campo.'::text))
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l join public.modules m on m.id = l.module_id join public.courses co on co.id = m.course_id
where l.id = b.lesson_id and co.slug = 'celstv-english-for-our-generation' and m.sort_order = 12 and b.block_type = 'flashcard';

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'Snacks' then jsonb_set(c, '{front}', to_jsonb('Botanas'::text))
      when c->>'back' = 'Van' then jsonb_set(c, '{front}', to_jsonb('Camioneta'::text))
      when c->>'back' = 'Car' then jsonb_set(c, '{front}', to_jsonb('Carro'::text))
      when c->>'back' = 'Fun' then jsonb_set(c, '{front}', to_jsonb('Diversión'::text))
      when c->>'back' = 'Swimming' then jsonb_set(c, '{front}', to_jsonb('Natación'::text))
      when c->>'back' = 'Hiking' then jsonb_set(c, '{front}', to_jsonb('Ir de excursión / Senderismo'::text))
      when c->>'back' = 'To drive' then jsonb_set(c, '{front}', to_jsonb('Manejar'::text))
      when c->>'back' = 'To fight' then jsonb_set(c, '{front}', to_jsonb('Pelear'::text))
      when c->>'back' = 'To hike' then jsonb_set(c, '{front}', to_jsonb('Ir de excursión'::text))
      when c->>'back' = 'Let’s plan the trip.' then jsonb_set(c, '{front}', to_jsonb('Planeemos el viaje.'::text))
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l join public.modules m on m.id = l.module_id join public.courses co on co.id = m.course_id
where l.id = b.lesson_id and co.slug = 'celstv-english-for-our-generation' and m.sort_order = 13 and b.block_type = 'flashcard';

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'Goals' then jsonb_set(c, '{front}', to_jsonb('Metas'::text))
      when c->>'back' = 'Purpose' then jsonb_set(c, '{front}', to_jsonb('Propósito'::text))
      when c->>'back' = 'Focus' then jsonb_set(c, '{front}', to_jsonb('Enfoque'::text))
      when c->>'back' = 'Planner' then jsonb_set(c, '{front}', to_jsonb('Agenda'::text))
      when c->>'back' = 'Car' then jsonb_set(c, '{front}', to_jsonb('Carro'::text))
      when c->>'back' = 'To hope' then jsonb_set(c, '{front}', to_jsonb('Esperar (tener la esperanza)'::text))
      when c->>'back' = 'What are your goals?' then jsonb_set(c, '{front}', to_jsonb('¿Cuáles son tus metas?'::text))
      when c->>'back' = 'My dream has always been to buy a car.' then jsonb_set(c, '{front}', to_jsonb('Mi sueño siempre ha sido comprar un carro.'::text))
      when c->>'back' = 'I am a police officer.' then jsonb_set(c, '{front}', to_jsonb('Soy policía.'::text))
      when c->>'back' = 'I am an engineer.' then jsonb_set(c, '{front}', to_jsonb('Soy ingeniero.'::text))
      when c->>'back' = 'I am planning my goals.' then jsonb_set(c, '{front}', to_jsonb('Estoy planeando mis metas.'::text))
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l join public.modules m on m.id = l.module_id join public.courses co on co.id = m.course_id
where l.id = b.lesson_id and co.slug = 'celstv-english-for-our-generation' and m.sort_order = 14 and b.block_type = 'flashcard';
