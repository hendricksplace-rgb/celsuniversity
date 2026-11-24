-- C-051: a class's schedule in both languages, and classes without a partner school.
-- schedule_label = Spanish, schedule_label_en = English; the app shows the viewer's language and falls back to
-- the other one (src/lib/i18n/row.ts scheduleOf), so nothing shows empty.
alter table public.classes add column if not exists schedule_label_en text;

-- Matt's own live classes (CelsTV, CelsBSNS, CelsGLOBAL, F2F) belong to no partner organization.
alter table public.classes alter column organization_id drop not null;

-- Demo ESL: Spanish back in schedule_label, English in schedule_label_en (Cowork had put English in the first).
update public.classes set schedule_label = 'Lunes y miércoles · 7:00 pm', schedule_label_en = 'Mon & Wed · 7:00 pm'
where legacy_id = 'demo-c048-houston';
update public.classes set schedule_label = 'Martes y jueves · 6:30 pm', schedule_label_en = 'Tue & Thu · 6:30 pm'
where legacy_id = 'demo-c048-dallas';
