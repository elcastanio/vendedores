# App de Vendedores – El Castaño

App web (instalable como app en el celular) para que los vendedores carguen
pedidos, vean su objetivo y comisión, registren mercadería de más, y
consulten sus rendiciones — todo desde el teléfono.

## Cómo está armado (importante)

Hay dos partes de datos distintas:

1. **Supabase** (una base de datos propia, gratis): guarda vendedores,
   catálogo de productos, objetivos mensuales, clientes y el registro de
   stock extra.
2. **Tu planilla de Google Sheets de cada vendedor**: ahí es donde
   quedan los **pedidos** (la app escribe ahí directo) y las
   **rendiciones** (las cargás vos ahí como siempre, y la app las lee para
   mostrárselas al vendedor). Para esto hay un "puente" (Google Apps
   Script) que le da permiso a la app de leer y escribir en las planillas.

## 1. Base de datos (Supabase)

1. supabase.com → crear proyecto gratis.
2. **SQL Editor** → **New query** → pegá todo `supabase-setup.sql` → **Run**.
3. **Settings → API Keys** → copiá **Project URL** y **Publishable key**.

## 2. Puente con Google Sheets (Apps Script)

1. Andá a **script.google.com** → **Proyecto nuevo**.
2. Borrá el código de ejemplo y pegá todo el contenido de
   `apps-script/Code.gs` (está en esta carpeta).
3. En la primera línea del código, cambiá `CAMBIAR_ESTE_TOKEN_SECRETO_123`
   por una palabra/clave secreta inventada por vos (sin espacios). Anotala,
   la vas a necesitar en el paso 4.
4. **Implementar** (arriba a la derecha) → **Nueva implementación** → ⚙️
   elegí tipo **"Aplicación web"**:
   - Ejecutar como: **Yo** (tu cuenta)
   - Quién tiene acceso: **Cualquier usuario**
5. Te va a pedir autorizar permisos la primera vez — es tu propia cuenta de
   Google autorizando a su propio script, es seguro. Aceptá.
6. Copiá la **URL** que te da (termina en `/exec`).

## 3. Configurar el proyecto localmente

1. [Node.js](https://nodejs.org) instalado (18+).
2. Copiá `.env.example` a `.env` y completá los 5 valores:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (paso 1)
   - `VITE_ADMIN_PASSWORD` (la que quieras)
   - `VITE_SHEETS_API_URL` (la URL `/exec` del paso 2)
   - `VITE_SHEETS_TOKEN` (el mismo secreto que pusiste en el script)
3. `npm install`
4. `npm run dev` — abrí la URL que te da (`http://localhost:5173`).

## 4. Publicarla (Vercel, gratis)

Subí esta carpeta a GitHub, importala en vercel.com, cargá ahí las mismas 5
variables de entorno del `.env`, y tocá "Deploy".

## 5. Instalarla como app en el celular (PWA)

**Android (Chrome)**: entrar a la URL → ⋮ → "Instalar aplicación".
**iPhone (Safari)**: entrar a la URL → ícono de compartir → "Agregar a
pantalla de inicio".

## Cómo usarla

**Dar de alta un vendedor**: en el panel de admin, además de usuario y
contraseña, pegále el **link de su planilla de Google Sheets** (la
trimestral, tipo "NOMBRE - Q4 - 2026"). Sin ese link, esa persona no va a
poder cargar pedidos ni ver rendiciones.

**Catálogo**: el nombre de cada producto tiene que coincidir EXACTO con
como figura en la solapa "Datos - Activos" de las planillas — es el texto
que se va a escribir en la columna Producto de cada pedido.

**Pedidos**: el vendedor carga cliente + categoría + producto + unidades;
la app calcula el precio según el catálogo y escribe la línea directo en
la solapa del mes correspondiente (Julio, Agosto, etc.) de SU planilla. Las
fórmulas de Total y Acumulado de la planilla siguen funcionando solas,
porque ya están precargadas en esas filas.

**Despachado / Faltante**: se agregan automáticamente dos columnas nuevas
(J y K) en cada solapa mensual la primera vez que se usa. Vos las marcás
desde la pestaña "Pedidos" del panel de admin (sin tener que abrir la
planilla), y el vendedor lo ve reflejado en su app.

**Rendiciones**: las seguís cargando vos directo en la solapa Rendiciones
de la planilla, como siempre. La app solo las lee para mostrárselas al
vendedor (columna K = A/B/C se traduce a verde/amarillo/rojo en la app).

**Objetivo y Stock**: siguen viviendo en la app (Supabase), no tocan la
planilla. El objetivo se carga mes a mes desde "Objetivos" en el panel de
admin (a mano o con Excel masivo).

## Sobre la seguridad

Autenticación simple (usuario + contraseña en la base de datos, sin
cifrar) — suficiente para uso interno diario. El Apps Script ejecuta con
tu cuenta de Google y queda protegido por el token secreto que vos
elegiste — no lo compartas fuera de esta app.
