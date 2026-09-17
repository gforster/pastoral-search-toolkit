# Run and deploy

Use Node.js 22.13 or newer (Node 24 LTS is also suitable) and npm.

```sh
npm ci
npm run dev
```

Development uses Vite. For the production build:

```sh
npm run build
npm run preview
```

The local static preview listens on `http://127.0.0.1:4173`. Set `PORT` if needed. Keep the same host/port to retain the same browser-storage origin. Do not open the entrypoint with `file://`.

GitHub Pages is the selected feedback host: https://gforster.github.io/pastoral-search-toolkit/. Select GitHub Actions as the repository Pages source. A push to `main` or a manual workflow dispatch runs clean install, formatting, lint, typecheck, domain tests, production build and browser checks before uploading `dist/` and deploying it. Forks can use the same workflow; relative asset URLs and hash routes do not require a hard-coded repository name.

Any HTTPS static host can serve `dist/`. No backend, database, secrets or login service is needed. `_headers` is available for hosts supporting that convention; GitHub Pages instead receives the entrypoint’s content security policy. Hosting logs may still record ordinary file requests. Preview-server headers are not a claim about production hosting controls.

Moving to another origin does not move projects. Export backups first, then import them at the new host. A local static server must stay reachable to load the app; no service-worker offline cache is currently included.

The browser suite deliberately serves the build under `/pastoral-search-toolkit/` to check repository-subpath routing. Run `CHROME_CHANNEL=chrome npm run test:browser` when using installed Chrome, or install Playwright Chromium for the default run.
