insert into public.resorts (
  id,
  name,
  city,
  center_latitude,
  center_longitude
)
values
  ('stubai-glacier', 'Stubai Glacier', 'innsbruck', 47.083, 11.152),
  ('nordkette', 'Nordkette', 'innsbruck', 47.3247, 11.3867),
  ('axamer-lizum', 'Axamer Lizum', 'innsbruck', 47.1717, 11.2333),
  ('schlick-2000', 'Schlick 2000', 'innsbruck', 47.233, 11.198),
  ('kuehtai', 'Kühtai', 'innsbruck', 47.208, 11.017),
  ('glungezer', 'Glungezer', 'innsbruck', 47.239, 11.482),
  ('patscherkofel', 'Patscherkofel', 'innsbruck', 47.214, 11.47),
  ('bergeralm', 'Bergeralm', 'innsbruck', 47.211, 11.501),
  ('rangger-koepfl', 'Rangger Köpfl', 'innsbruck', 47.198, 11.2),
  ('hochoetz', 'Hochoetz', 'innsbruck', 47.2, 10.918),
  ('mutterer-alm', 'Mutterer Alm', 'innsbruck', 47.209, 11.376),
  ('serlesbahnen-mieders', 'Serlesbahnen Mieders', 'innsbruck', 47.162, 11.317),
  ('soelden', 'Sölden', 'innsbruck', 46.967, 11.0),
  ('saalbach-hinterglemm', 'Saalbach-Hinterglemm', 'salzburg', 47.3917, 12.6333),
  ('flachau', 'Flachau', 'salzburg', 47.333, 13.383),
  ('kitzsteinhorn', 'Kitzsteinhorn', 'salzburg', 47.2242, 12.692),
  ('zell-am-see', 'Zell am See', 'salzburg', 47.3247, 12.7969),
  ('wagrain', 'Wagrain', 'salzburg', 47.35, 13.3),
  ('bad-gastein', 'Bad Gastein', 'salzburg', 47.117, 13.133),
  ('hochkoenig', 'Hochkönig', 'salzburg', 47.4167, 13.0667)
on conflict (id) do nothing;
