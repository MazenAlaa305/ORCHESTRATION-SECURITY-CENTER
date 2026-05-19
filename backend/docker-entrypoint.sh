#!/bin/sh
# Backend entrypoint.
#
# The image is shared between the FastAPI backend (uvicorn) and the Celery
# worker. Only the backend writes uploaded avatars; only the backend should
# drop privileges to the `celery` user. The Celery worker container is
# configured with `user: root` because it needs NET_RAW for nmap.
#
# Named Docker volumes are created with root:root ownership the first time,
# which prevents the unprivileged backend from writing uploads — so this
# script chowns the upload directory before exec'ing uvicorn as celery.
set -e

# Only the backend command is `uvicorn …` — everything else (celery worker,
# shell, ad-hoc exec) keeps its current user.
if [ "$(id -u)" = "0" ] && [ "$1" = "uvicorn" ]; then
    UPLOAD_DIR="${AVATAR_UPLOAD_DIR:-/app/uploads/avatars}"
    mkdir -p "$UPLOAD_DIR" 2>/dev/null || true
    chown -R celery:celery /app/uploads 2>/dev/null || true
    exec gosu celery "$@"
fi

exec "$@"
