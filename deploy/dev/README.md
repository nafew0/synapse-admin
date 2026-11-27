# Admin panel on the dev server (Imtiaz-VM)

Push to `bdren-dev` and `https://dev-chat.bdren.ai/adminpanel/` updates within
two minutes. It uses the same `deploy.sh` and `watch.sh` as the chat app (from
the synapse repo, `deploy/dev/`), pointed at `/opt/synapse-dev/admin`.

| | |
|---|---|
| Folder | `/opt/synapse-dev/admin` (`releases/<sha>`, `current`, `shared/.env`) |
| PM2 app | `synapse-admin-dev`, Bun, `172.19.0.1:3001` (see `ecosystem.config.cjs`) |
| Talks to | the dev chat app at `http://172.19.0.1:3080` (`API_SERVER_URL`) |
| Pipeline settings | `/opt/synapse-dev/admin/shared/deploy.env` |

`shared/.env` holds `SESSION_SECRET`, `VITE_BASE_PATH=/adminpanel/`,
`VITE_API_BASE_URL=https://dev-chat.bdren.ai` and `API_SERVER_URL`. The base
path is read at build time, so the file is linked in before each build.

`HOST` in `server.ts` binds the server to one address; unset, it listens on all
interfaces as before.
