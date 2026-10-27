-- C-016: Ludo's new thumbnails for CelsTV episodes 1–8 were uploaded over episodes/celstv/ep-0N.jpg; bump the URL
-- so browsers, the CDN and the image optimizer fetch the new file.
update public.modules
set artwork_url = artwork_url || '?v=2'
where course_id = '0928ee68-d20b-4cdf-8e4b-5489ce16b4a3'
  and artwork_url ~ '/public-assets/episodes/celstv/ep-0[1-8]\.jpg$';
