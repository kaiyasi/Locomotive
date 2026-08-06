# Locomotive Parking Bot

一個用 Telegram 私聊記錄機車停車位置的 Bot。停好車後分享目前位置，回程時即可從 Bot 取得 Telegram 地圖位置與 Google 地圖連結。

## 需要的環境

- Node.js 20 或更新版本
- Telegram 帳號
- 從 [@BotFather](https://t.me/BotFather) 建立 Bot 並取得 token

## 本機執行

```bash
cp .env.example .env
```

編輯 `.env`，至少填入 `BOT_TOKEN`：

```dotenv
BOT_TOKEN=123456:replace-with-your-token
ALLOWED_USER_IDS=123456789
```

`ALLOWED_USER_IDS` 建議填入自己的 Telegram user ID，使用逗號分隔；留空則任何人都能在私聊使用自己的位置紀錄。群組訊息永遠不會被處理。

啟動：

```bash
npm start
```

開發期間可使用：

```bash
npm run dev
```

## 使用方式

1. 在 Telegram 開啟 Bot，輸入 `/start`。
2. 停好車後按「📍 記錄停車位置」，分享目前位置。
3. 回來時按「🔎 查詢我的位置」。
4. 需要時按「📝 編輯備註」，記下樓層、柱號或附近地標。

也支援 `/save`、`/where`、`/note`、`/delete` 與 `/help`。輸入 `/note 內容` 可以直接設定備註；輸入 `/note 清除` 可以清除備註。

## 資料與隱私

預設資料會寫入 `data/parking.json`。資料檔不會提交到 Git，並會以暫存檔加重新命名的方式寫入，避免寫入中斷留下半份 JSON。每位 Telegram user ID 只會看到自己的紀錄。

若要部署到伺服器，請將 `.env` 與 `DATA_FILE` 放在持久化磁碟，並讓程序持續執行。這個版本使用 Telegram long polling，不需要公開 HTTP 網址或憑證。

## 測試

```bash
npm test
```
## Locomotive

This repository is the default starter template for the Serelix GitLab platform.

### What This Platform Does

The platform builds one Docker image from your repository and deploys it through the host-managed pipeline.

You control:
- `Dockerfile`
- your application source code
- `service.config.yml`

The platform controls:
- `.gitlab-ci.yml`
- deployment port allocation
- production `docker compose` rendering
- service network naming
- service stop / cleanup flow

Production deployment does not read your repository's `docker-compose.yml`.

### Deployment Model

For each repository:
- CI builds a single image from the repository root `Dockerfile`
- CI validates `service.config.yml`
- CI tests every `expose: true` app service
- deploy renders a host-side compose file into `/srv/services/<user>/<project>/docker-compose.yml`
- every app service runs the same built image with a different `start` command
- every `expose: true` app service gets its own allocated host port

Naming rules:
- project path: `/srv/services/<user>/<project>/`
- container name: `<user>-<project>-<service>`
- network name: `<user>-<project>-net`

### Deploy Access And Port Pools

Deploy access is controlled by platform policy, not by repository code.

The platform syncs deploy policy from the GitLab admin-visible user `note` field into:
- `/srv/platform/state/deploy-policies.json`

Deploy policy resolution order:
- group description policy by namespace (most specific group, then parent groups)
- project creator user policy
- if neither matches, run a ci fallback deploy test, then auto cleanup and release test ports

Supported admin note keys:
- `serelix-port-range: 12000-12999`
- `serelix-namespaces: kaiyasi,serelix-studio,scaict`
- `serelix-runner-tag: deploy`
- `serelix-deploy: true`

Minimal example:

```text
serelix-port-range: 12000-12999
serelix-namespaces: kaiyasi,serelix-studio,scaict
```

Notes:
- `serelix-port-range` is the key that actually grants deploy access
- `serelix-namespaces` maps multiple namespaces onto the same deploy user and port pool
- group description policy has higher priority than creator user policy
- if `serelix-runner-tag` is omitted, the platform uses `deploy`
- current legacy users still have compatibility defaults, but new users should use note-based policy

### Supported `service.config.yml`

Use the `services:` format.

App runtimes:
- `node`
- `python`
- `go`
- `static`

Platform-managed sidecars:
- `postgres`
- `redis`
- `meilisearch`

Rules:
- app services must set `name`, `port`, `runtime`, `start`
- app services may set `expose: true` or `false`
- sidecars must set `name`, `port`, `runtime`
- sidecars must use `expose: false`
- only one managed `postgres`, one managed `redis`, and one managed `meilisearch` are supported per project
- service names are normalized to lowercase slug format

Example:

```yaml
services:
  - name: frontend
    port: 3000
    runtime: node
    start: /app/bin/start-frontend.sh
    expose: true

  - name: backend
    port: 8000
    runtime: python
    start: /app/bin/start-backend.sh
    expose: false

  - name: postgres
    port: 5432
    runtime: postgres
    expose: false

  - name: redis
    port: 6379
    runtime: redis
    expose: false

  - name: meilisearch
    port: 7700
    runtime: meilisearch
    expose: false
```

### How To Structure Your Image

Because all app services share one image, your `Dockerfile` should produce one image containing everything needed by all app processes.

Typical pattern:
- install frontend dependencies and build frontend assets
- install backend dependencies
- copy both frontend and backend into the final image
- add one start script per app service

Example:
- `/app/bin/start-frontend.sh`
- `/app/bin/start-backend.sh`
- `/app/bin/start-worker.sh`

Each script should read `APP_PORT` when possible.

### How To Convert Your `docker-compose.yml`

Take each compose service and classify it.

If it is your application process:
- convert it to one app service entry in `service.config.yml`
- move its startup command into `start`
- keep its internal listening port in `port`
- set `expose: true` only if it should be reachable from outside

If it is PostgreSQL, Redis, or Meilisearch:
- convert it to a managed sidecar entry
- remove its custom image / command / volume / port mapping from repo-side compose

If it is another infrastructure service:
- this platform does not natively manage it right now
- either bake the needed functionality into your app image, use an external managed service, or extend the platform first

### Compose Mapping Guide

This is the intended mapping from a normal `docker-compose.yml` into platform config.

Compose:

```yaml
services:
  frontend:
    build: .
    command: /app/bin/start-frontend.sh
    ports:
      - "3000:3000"

  backend:
    build: .
    command: /app/bin/start-backend.sh
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine

  redis:
    image: redis:7-alpine
```

Platform version:

```yaml
services:
  - name: frontend
    port: 3000
    runtime: node
    start: /app/bin/start-frontend.sh
    expose: true

  - name: backend
    port: 8000
    runtime: python
    start: /app/bin/start-backend.sh
    expose: false

  - name: postgres
    port: 5432
    runtime: postgres
    expose: false

  - name: redis
    port: 6379
    runtime: redis
    expose: false
```

What changes when moving from compose to this platform:
- remove repository-side `ports` host bindings
- remove repository-side production `depends_on`
- remove repository-side production `container_name`
- remove repository-side production `networks`
- remove repository-side production `restart`
- remove repository-side production `volumes` for managed sidecars
- keep only app startup intent and internal ports

### What The Platform Automatically Wires

App services automatically receive:
- `APP_PORT`
- `SERVICE_NAME`
- `PROJECT_NAME`
- `PROJECT_PATH`

If `postgres` exists:
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`

If `redis` exists:
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_URL`

If `meilisearch` exists:
- `MEILI_HOST`
- `MEILI_PORT`
- `MEILI_URL`
- `MEILI_MASTER_KEY`

### What Is Not Supported

Do not expect these compose features to carry over directly:
- arbitrary extra sidecar images beyond the managed set
- custom production host port numbers
- custom production network names
- custom production volume bindings
- privileged mode
- host networking
- mounting `/var/run/docker.sock`
- production `docker-compose.yml` from the repository

### Files In This Template

Edit these:
- `Dockerfile`
- `service.config.yml`
- `app/`

Platform helper files:
- `.gitlab-ci.yml`
- `.platform/validate-service-config.sh`
- `.platform/service-config.py`
- `docker-compose.template.yml`

### Practical Workflow

1. Build one image that contains everything your app services need.
2. Add one start script per app service.
3. Declare app services in `service.config.yml`.
4. Declare `postgres`, `redis`, or `meilisearch` only if you want platform-managed sidecars.
5. Push to `main`.
6. After deploy, check the allocated host port from the job log or `/srv/services/<user>/<project>/service.meta`.

### Security Notes

- Do not add production volume mounts in repository config.
- Do not use host networking.
- Do not request privileged mode.
- Do not mount `/var/run/docker.sock` into your app.
- Do not depend on repo-side production compose files.
