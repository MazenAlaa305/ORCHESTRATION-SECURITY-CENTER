# lab_config/nginx.conf — Documentation

## File Purpose

The **Nginx web server configuration** for the frontend Docker container or a reverse proxy setup. Configures Nginx to serve the built React SPA static files, handle client-side routing (SPA history API), and optionally proxy API requests to the FastAPI backend.

## Key Configuration Blocks

### `server` Block
Configures the primary virtual server:
- `listen 80` — Accepts HTTP connections on port 80
- `root /usr/share/nginx/html` — Serves static files from the Vite build output directory
- `index index.html` — Default document

### SPA Routing Rule
```
location / {
    try_files $uri $uri/ /index.html;
}
```
The `try_files` directive first attempts to serve the requested path as a static file. If not found (which is the case for all React Router-managed routes), it falls back to serving `index.html`, allowing the React client-side router to handle the route. This is essential for any SPA using the HTML5 History API.

### API Proxy (Optional)
If present, a `location /api/` block proxies requests to the FastAPI backend container using `proxy_pass http://backend:8000/api/`. This allows the frontend to make API calls to the same origin (avoiding CORS issues in some deployment configurations).

### Caching Headers
Static assets (JS, CSS, images) are configured with long `Cache-Control: max-age` headers to leverage browser caching and improve load performance for returning users.

### Gzip Compression
`gzip on` with `gzip_types` covering `text/plain`, `text/css`, `application/javascript`, `application/json` — reduces transfer size of frontend assets.

## Dependencies

- **Docker**: Nginx container built from `./frontend/Dockerfile`
- **Vite Build Output**: Expects `dist/` directory to be built before the Docker image is assembled
