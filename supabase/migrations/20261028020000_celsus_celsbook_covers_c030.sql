-- C-030: the real CelsUS CelsBook covers (Episodio 1–5), uploaded unchanged to public-assets/covers/celsus/
-- (1400 × 1812 JPGs, Cache-Control max-age=31536000). Applied 2026-10-28.
update public.ebooks set cover_path = 'storage://public-assets/covers/celsus/celsus-celsbook-ep-0' || right(slug,1) || '.jpg'
where slug in ('celsus-celsbook-episode-1','celsus-celsbook-episode-2','celsus-celsbook-episode-3','celsus-celsbook-episode-4','celsus-celsbook-episode-5');
