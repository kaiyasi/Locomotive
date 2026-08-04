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
