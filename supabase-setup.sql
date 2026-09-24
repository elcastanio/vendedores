-- Ejecutá esto en Supabase: SQL Editor > New query > pegar > Run
-- Si ya habías corrido una versión anterior, esto la reemplaza (borra y recrea).
-- NOTA: pedidos y rendiciones YA NO viven acá — viven en la planilla de Google
-- Sheets de cada vendedor. Esta base solo guarda vendedores, catálogo, objetivos,
-- clientes y el registro de stock extra.

drop table if exists stock_extra cascade;
drop table if exists objetivos cascade;
drop table if exists clientes cascade;
drop table if exists products cascade;
drop table if exists vendors cascade;

create table vendors (
  id text primary key,
  nombre text not null,
  usuario text not null unique,
  password text not null,
  comision numeric not null default 0.10,  -- ej 0.10 = 10%, fija por vendedor
  sheet_url text default ''                -- link a su planilla trimestral de Google Sheets
);

create table products (
  id text primary key,
  nombre text not null,  -- tiene que coincidir EXACTO con "Datos - Activos" de las planillas
  precio_minorista numeric default 0,
  precio_mayorista numeric default 0,
  precio_granel numeric default 0,
  precio_comercios numeric default 0
);

create table objetivos (
  vendor_id text references vendors(id) on delete cascade,
  mes text not null, -- 'YYYY-MM'
  objetivo numeric not null default 0,
  primary key (vendor_id, mes)
);

create table clientes (
  id text primary key,
  vendor_id text references vendors(id) on delete cascade,
  nombre text not null,
  telefono text, email text, dni text, domicilio text
);

create table stock_extra (
  id text primary key,
  vendor_id text references vendors(id) on delete cascade,
  fecha date not null,
  producto_id text references products(id),
  unidades numeric not null,
  estado text not null default 'Pendiente',
  observacion text default ''
);

-- ---------- Datos de ejemplo ----------
-- Pegá acá el link real de la planilla de Yanina (u otro vendedor de prueba)
-- para probar la integración con Sheets end to end.
insert into vendors (id, nombre, usuario, password, comision, sheet_url) values
  ('demo', 'Vendedor Demo', 'demo', '1234', 0.10, '');

insert into products (id, nombre, precio_minorista, precio_mayorista, precio_granel, precio_comercios) values
  ('p1', 'Nueces mariposa Ambar Light 500 g.', 11930, 9500, 8200, 9800),
  ('p2', 'Almendras Non Pareil 250 g.', 8780, 7200, 6100, 7400),
  ('p3', 'Ciruelas sin carozo 500 g.', 6500, 5300, 4500, 5500),
  ('p4', 'Mix Salado 1 kg.', 15080, 12200, 10400, 12700),
  ('p5', 'Canela en ramas 20 g.', 2320, 1900, 1600, 1950);

insert into objetivos (vendor_id, mes, objetivo) values
  ('demo', to_char(now(), 'YYYY-MM'), 1000000);

alter table vendors disable row level security;
alter table products disable row level security;
alter table objetivos disable row level security;
alter table clientes disable row level security;
alter table stock_extra disable row level security;

-- Proyectos nuevos de Supabase (desde mayo 2026) no le dan permisos
-- automáticos a las tablas nuevas, incluso con RLS desactivada. Sin esto,
-- la app tira "row-level security policy" o "permission denied" al guardar.
grant select, insert, update, delete on vendors to anon, authenticated;
grant select, insert, update, delete on products to anon, authenticated;
grant select, insert, update, delete on objetivos to anon, authenticated;
grant select, insert, update, delete on clientes to anon, authenticated;
grant select, insert, update, delete on stock_extra to anon, authenticated;

-- IMPORTANTE sobre seguridad: esta app usa la Publishable key desde el
-- navegador, así que RLS queda desactivado. Aceptable para una herramienta
-- interna; cualquiera con la URL y la key podría leer/escribir estos datos.
