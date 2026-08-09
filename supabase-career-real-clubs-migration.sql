-- Idempotent data migration from the original fictional career catalog to
-- real club and league display names. It deliberately leaves version and
-- updated_at unchanged because this is a catalog rename, not user activity.

do $$
declare
  mapping record;
begin
  for mapping in
    select *
    from (values
      ('Torri Milano', 'Inter'),
      ('Reale Torino', 'Juventus'),
      ('Lupi Capitolini', 'Roma'),
      ('Partenope Azzurra', 'Napoli'),
      ('Giglio Firenze', 'Fiorentina'),
      ('Grifoni Genova', 'Genoa'),
      ('Emilia Calcio', 'Bologna'),
      ('Salento United', 'Lecce'),
      ('Real Castiglia', 'Real Madrid'),
      ('Catalunya Blau', 'FC Barcelona'),
      ('Atletico Manzanares', 'Atlético de Madrid'),
      ('Costa Valencia', 'Valencia CF'),
      ('Siviglia Dorada', 'Sevilla FC'),
      ('Leoni di Bilbao', 'Athletic Club'),
      ('Galizia Verde', 'RC Celta'),
      ('Isola Majorca', 'RCD Mallorca'),
      ('North London Forge', 'Arsenal'),
      ('Manchester Sky', 'Manchester City'),
      ('Mersey Reds', 'Liverpool'),
      ('West London Royal', 'Chelsea'),
      ('Tyneside Magpies', 'Newcastle United'),
      ('Birmingham Lions', 'Aston Villa'),
      ('Brighton Waves', 'Brighton & Hove Albion'),
      ('Nottingham Oaks', 'Nottingham Forest'),
      ('Bavaria Rot', 'FC Bayern München'),
      ('Rhein Schwarz', 'Borussia Dortmund'),
      ('Leipzig Falken', 'RB Leipzig'),
      ('Kieler Wellen', 'Eintracht Frankfurt'),
      ('Hanse Hamburg', 'Hamburger SV'),
      ('Stoccarda Motori', 'VfB Stuttgart'),
      ('Berlino Union', '1. FC Union Berlin'),
      ('Foresta Friburgo', 'SC Freiburg'),
      ('Paris Etoile', 'Paris Saint-Germain'),
      ('Olympique Mediterranee', 'Olympique de Marseille'),
      ('Monaco Principato', 'AS Monaco'),
      ('Lione Lumiere', 'Olympique Lyonnais'),
      ('Loira Verde', 'RC Lens'),
      ('Lilla Fiandre', 'LOSC Lille'),
      ('Riviera Nizza', 'OGC Nice'),
      ('Bretagna Armor', 'Stade Rennais FC'),
      ('Lisboa Aquile', 'SL Benfica'),
      ('Porto Draghi', 'FC Porto'),
      ('Leoni di Alvalade', 'Sporting CP'),
      ('Braga Arcivescovi', 'SC Braga'),
      ('Vitoria Castello', 'Vitória SC'),
      ('Faro Atlantico', 'FC Famalicão'),
      ('Madeira Maritima', 'Santa Clara'),
      ('Azzorre Naviganti', 'Rio Ave FC'),
      ('Amsterdam Tulipani', 'Ajax'),
      ('Rotterdam Porto', 'Feyenoord'),
      ('Eindhoven Luce', 'PSV'),
      ('Utrecht Torri', 'FC Utrecht'),
      ('Alkmaar Formaggi', 'AZ'),
      ('Arnhem Aquile', 'FC Twente'),
      ('Groninga Nord', 'FC Groningen'),
      ('Breda Baronia', 'sc Heerenveen'),
      ('Rio Rubro', 'Flamengo'),
      ('Selva Paulista', 'Palmeiras'),
      ('Baixada Oceano', 'Santos'),
      ('Metropoli Alvinegra', 'Corinthians'),
      ('Recife Sol', 'Fluminense'),
      ('Porto Alegre Tricolore', 'Grêmio'),
      ('Goias Cerrado', 'São Paulo'),
      ('Bahia Tricolore', 'Bahia'),
      ('Buenos Aires Azul', 'Boca Juniors'),
      ('Monumental Rojo', 'River Plate'),
      ('Avellaneda Diablo', 'Independiente'),
      ('Academia Celeste', 'Racing Club'),
      ('Mendoza Andes', 'Estudiantes de La Plata'),
      ('Rosario Canaglia', 'Rosario Central'),
      ('Cordoba Talleres', 'Talleres'),
      ('La Plata Bosque', 'Gimnasia La Plata'),
      ('Lega Aurora', 'Serie A'),
      ('Liga del Sol', 'LaLiga'),
      ('Albion Crown League', 'Premier League'),
      ('Bundeskrone Liga', 'Bundesliga'),
      ('Ligue Lumiere', 'Ligue 1'),
      ('Liga Navegadores', 'Primeira Liga'),
      ('Oranje Elite', 'Eredivisie'),
      ('Serie Verdeoro', 'Brasileirão Série A'),
      ('Liga del Plata', 'Liga Profesional Argentina')
    ) as catalog(old_value, new_value)
  loop
    update public.fanta_careers
    set state = replace(state::text, mapping.old_value, mapping.new_value)::jsonb
    where position(mapping.old_value in state::text) > 0;

    update public.fanta_career_seasons
    set
      club_name = case
        when club_name = mapping.old_value then mapping.new_value
        else club_name
      end,
      summary = replace(summary::text, mapping.old_value, mapping.new_value)::jsonb
    where club_name = mapping.old_value
       or position(mapping.old_value in summary::text) > 0;
  end loop;
end
$$;
