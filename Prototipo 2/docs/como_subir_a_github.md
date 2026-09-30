# Cómo subir la V1 a GitHub y publicarla

## Opción A — desde la web de GitHub (sin instalar nada)
1. Entra al repositorio `Proyecto-IIC2026-Grupo22`.
2. **Add file → Upload files**. Arrastra **el contenido** de la carpeta descomprimida (no la carpeta en sí): `index.html`, `style.css`, `app.js`, `sonido.js`, `README.md`, `.nojekyll` y las carpetas `data/`, `media/`, `vendor/`, `scripts/`, `prototipos/`, `docs/`.
   - Si el repo ya tenía `index.html`, `app.js`, etc., se reemplazan (eso está bien: los antiguos quedan en el historial y copiados en `prototipos/`).
   - Si el navegador no deja arrastrar `.nojekyll` (archivo oculto), no pasa nada grave; solo evita que GitHub procese la página con Jekyll.
3. Mensaje del commit: `V1: mapa + gráfico + detalle coordinados, con sonificación`. **Commit changes**.
4. Crear el tag: **Releases → Create a new release → Choose a tag → escribir `v1` → Create new tag** → título "V1" → **Publish release**.

## Opción B — con Git en la terminal (o GitHub Codespaces)
```bash
git clone https://github.com/<usuario>/Proyecto-IIC2026-Grupo22.git
cd Proyecto-IIC2026-Grupo22
# copiar aquí el contenido del zip (reemplazando lo que exista)
git add .
git commit -m "V1: mapa + gráfico + detalle coordinados, con sonificación"
git tag v1
git push origin main --tags
```
(Si la rama se llama `master`, usar `master` en vez de `main`.)

## Activar GitHub Pages (una sola vez)
1. **Settings → Pages**.
2. *Source*: **Deploy from a branch**. *Branch*: `main` y carpeta `/ (root)` → **Save**.
3. Esperar 1–2 minutos. El link queda arriba en esa misma página: `https://<usuario>.github.io/Proyecto-IIC2026-Grupo22/`.
4. Abrirlo en otro computador o en el celular para comprobar que carga todo (mapa, video, sonido).

## Para las próximas versiones
- Suban avances **durante la semana**, no todo junto la noche anterior: la pauta penaliza el historial "escenográfico".
- Cada versión cerrada lleva su tag: `v2`, `v3`, `v4` (igual que el paso 4).
- Opcional (lo recomienda la pauta): dejar cada versión navegable copiándola en una subcarpeta (`/v1/`, `/v2/`…) para que el profesor recorra la evolución.
- Si cambian los datos o el mapa: `python scripts/preparar_datos.py` regenera `data/datos.js` y `data/mundo.js`.
