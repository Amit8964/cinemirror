# MovieHub

A self-hosted movie streaming site built with Next.js:

- **Streaming site** — home with featured hero and shelves, browse/search, title pages, My List and Continue Watching (stored in the browser, no account needed).
- **Custom player** — HLS (adaptive, with manual quality switch) and MP4, subtitles, playback speed, resume, picture-in-picture, fullscreen, keyboard shortcuts, touch controls.
- **Partner embeds** — give another website an `<iframe>` code with their own key. The key is locked to their domain(s) and can be disabled or regenerated at any time.
- **Analytics** — every play (on your site and through each partner) is counted: plays, unique viewers, watch time, completion, watching-now, per title / partner / embedding site / device / country.
- **Admin panel** — manage titles and partners, generate embed codes, see the dashboards.

> **Content:** only stream video you own, have licensed, or that is openly licensed / public domain.
> The demo catalogue that is inserted on first start contains Blender Foundation open movies (CC BY)
> and US public-domain films, streamed from their public hosts.

## Quick start

```bash
npm install
cp .env.example .env.local     # then edit it
npm run dev                    # http://localhost:3000
```

Admin panel: `http://localhost:3000/admin`.
In development, if `ADMIN_EMAIL` / `ADMIN_PASSWORD` are not set, you can sign in with
`admin@moviehub.local` / `admin123`. That fallback is disabled in production.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | in production | Admin sign-in |
| `AUTH_SECRET` | in production | Signs admin sessions and player tracking tokens (`openssl rand -base64 48`) |
| `DATABASE_URL` | no | `file:./data/moviehub.db` (default) or a `libsql://…` URL |
| `DATABASE_AUTH_TOKEN` | for hosted libSQL | Token for the hosted database |
| `SEED_DEMO` | no | `false` to skip the demo catalogue on first start |

The database tables are created automatically on first start.

## Adding films

Admin → **Titles** → **Add title**. The video source is either:

- an **HLS playlist** (`.m3u8`) on your storage/CDN — recommended, gives adaptive quality, or
- an **MP4** file URL, or
- a local file: put it in `public/media/` and use `/media/film.mp4` (this folder is git-ignored).

To turn a video file into HLS with two qualities:

```bash
ffmpeg -i film.mp4 \
  -filter_complex "[0:v]split=2[a][b];[a]scale=-2:720[v720];[b]scale=-2:360[v360]" \
  -map "[v720]" -map 0:a -map "[v360]" -map 0:a \
  -c:v libx264 -g 48 -sc_threshold 0 -b:v:0 2800k -b:v:1 800k -c:a aac -b:a 128k \
  -f hls -hls_time 4 -hls_playlist_type vod \
  -master_pl_name master.m3u8 -var_stream_map "v:0,a:0 v:1,a:1" "stream_%v.m3u8"
```

If the video is on another domain, that host must send CORS headers for HLS (`Access-Control-Allow-Origin`).

## Giving the player to another website

1. Admin → **Partners** → **New partner**. Enter their name and the domain(s) of their website.
2. Open the partner. Pick a title and copy the **embed code**; send it to them.
3. Everything played through that code shows up under the partner in the dashboard.

```html
<div style="position:relative;padding-top:56.25%">
  <iframe
    src="https://your-site.com/embed/TITLE-SLUG?key=pk_PARTNER_KEY"
    style="position:absolute;inset:0;width:100%;height:100%;border:0"
    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
    allowfullscreen
    referrerpolicy="origin"></iframe>
</div>
```

Optional URL parameters: `&autoplay=1`, `&start=90` (seconds).

How it is protected:

- The server sends a `frame-ancestors` policy listing only that partner's domains, so the browser
  refuses to show the player on any other site, even if the key is copied.
- Opening the embed URL directly (not inside an iframe) is refused for domain-restricted keys.
- All other pages of the site cannot be framed by other sites at all.
- **Active** off, or **Regenerate key**, stops a partner's embeds within seconds.
- Watch time is capped by real elapsed time on the server, so a client cannot inflate it.

Previews opened from the admin panel are not counted.

## How the numbers are defined

- **Play** — one playback session, counted when the video actually starts.
- **Unique viewers** — distinct browsers (an anonymous random id stored in the browser; falls back to a hash of IP + user agent).
- **Watch time** — seconds actually played, reported every 15 seconds.
- **Completion** — plays that reached 90% of the film.
- **Watching now** — viewers with a heartbeat in the last 40 seconds.
- **Country** — filled in only when the host/CDN sends a country header (Vercel, Cloudflare, CloudFront).

## Deploying

```bash
npm run build
npm start
```

- **VPS / Docker** — works as is; keep the `data/` folder on a persistent disk.
- **Serverless hosts (e.g. Vercel)** — the local SQLite file does not persist there. Create a hosted
  libSQL database (e.g. Turso) and set `DATABASE_URL` / `DATABASE_AUTH_TOKEN`.
- Put the site behind HTTPS; set the three required environment variables.
- The login rate limiter and the partner-key cache are in-memory (per server process).

## Project layout

```
src/app/(site)        public pages: home, browse, title, my-list
src/app/watch         full-screen player page
src/app/embed         embeddable player for partners
src/app/admin         admin panel (login, overview, titles, partners)
src/app/api/track     play start + heartbeat endpoints
src/proxy.ts          per-partner frame-ancestors policy for /embed
src/components        Player and UI components
src/lib               database, analytics, auth, tokens, helpers
```

## Player shortcuts

`Space`/`K` play-pause · `←`/`→` 5s · `J`/`L` 10s · `↑`/`↓` volume · `M` mute · `F` fullscreen · `C` subtitles · `0–9` jump
