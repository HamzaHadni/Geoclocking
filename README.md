# GEOCLOCKING — MVP (Next.js + Supabase + WhatsApp)

MVP complet de pointage **géolocalisé + photo** avec **QR WhatsApp** par site.

## ⚙️ Setup rapide

1) **Supabase**
   - Crée le projet et note: `URL`, `anon key`, `service role key`.
   - Storage → bucket **checkin-photos** (Public pour MVP).
   - SQL → exécute `supabase/schema.sql`.

2) **WhatsApp Cloud API**
   - App Meta → récupère **PHONE_NUMBER_ID** et **ACCESS_TOKEN**.
   - Choisis un **WHATSAPP_VERIFY_TOKEN** (libre).
   - Plus tard: Webhook URL = `https://<ton-domaine>/api/whatsapp` (GET/POST).

3) **Variables d'env**
   - Copie `.env.example` vers `.env.local` en dev, ou configure sur la plateforme (Vercel/Netlify).

4) **Lancer en local**
   ```bash
   npm i
   cp .env.example .env.local
   npm run dev
   ```

5) **Déploiement**
   - **Vercel (recommandé)**: importe ce repo → ajoute les env vars → déploie.
   - **Netlify**: ce repo contient `netlify.toml` + `@netlify/plugin-nextjs`. Ajoute les env vars puis build.

## 🧭 Flux utilisateur

- **Affiche QR par site**: `/location/<uuid>/print` → imprime et colle sur place.
- Employé **scanne** → WhatsApp s’ouvre avec message prérempli `START LOC:<uuid>`.
- Le **webhook** lit `LOC` et renvoie **2 liens** (Arrivée/ Départ).
- La page **/checkin** demande **caméra + GPS** → envoie vers `/api/checkin`.
- En base: une ligne **checkins** + photo dans **Storage**.

## 🔐 Notes sécurité (MVP)
- Token **par employé** stocké en base → liens signés dans WhatsApp.
- Pour prod: activer **RLS** sur les tables + durcir policies, ajouter **face match** si besoin.

## 🧪 Test
1. Insère 1 `location` (lat/lng réels, rayon 50–100m).
2. Insère 1 `employee` (`+2126…`) + `binding` (lien employé ↔ location).
3. Scanne le QR `/location/<uuid>/print` ou écris à ton numéro WhatsApp Business `START LOC:<uuid>`.
4. Clique sur un lien (Arrival/Departure) → autorise caméra + GPS → **OK ✅**.

Bon build !
