# PeopleDesk HR Management Portal

The frontend is plain HTML, CSS, and JavaScript. Locally, Django serves the pages and JSON API, and SQLite stores shared demo data. For deployment, Netlify serves only the frontend while Django and PostgreSQL run on Render.

## Run locally on Windows

Open PowerShell in the `PeopleDesk-HR-Portal` folder, then run:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

For a fresh setup, create and activate `.venv`, install `requirements.txt`, run `python manage.py migrate`, and run `python manage.py seed_demo_data` once. Open `http://127.0.0.1:8000/` for HR or `http://127.0.0.1:8000/employee.html` for the employee dashboard. Do not open the HTML files directly with `file://`.

The local SQLite database is `backend/db.sqlite3`. Stop the local development server with `Ctrl+C`.

## Deploy: Render backend + Netlify frontend

The deployment files are ready:

- `backend/build.sh` installs dependencies, collects Django static files, and applies migrations.
- `netlify.toml` sets Netlify's build command and publishes only `netlify-dist/`, not the Django code or database.
- `netlify-build.sh` copies the static frontend and writes the Render API origin into `netlify-dist/js/config.js`.
- `backend/peopledesk_backend/settings.py` reads production secrets/database/CORS settings from environment variables.

### 1. Push the project to a Git provider

Create a private GitHub repository. In PowerShell, from the `PeopleDesk-HR-Portal` project root, initialize Git and push the source:

```powershell
git init
git add .
git commit -m "Prepare PeopleDesk deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the GitHub URL with your repository URL. The root `.gitignore` excludes the local SQLite database and virtual environment; never commit database files, secrets, or `.env` files.

### 2. Create the production database on Render

1. In Render, create a **PostgreSQL** database.
2. Select a region and use the same region for the Django web service.
3. Keep the Render dashboard open; you will copy the database's **Internal Database URL** to the web service environment in the next step.

### 3. Deploy Django on Render

1. Create a Render **Web Service** connected to your GitHub repository.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to `bash build.sh`.
4. Set **Start Command** to `gunicorn peopledesk_backend.wsgi:application --bind 0.0.0.0:$PORT`.
5. Add these environment variables in Render:

| Key | Value |
| --- | --- |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_SECRET_KEY` | Generate a private random secret in Render; do not put it in Git |
| `DATABASE_URL` | The PostgreSQL database's **Internal Database URL** |
| `CORS_ALLOWED_ORIGINS` | Leave empty for the first deploy; set this after Netlify gives you the site URL |

Render provides `RENDER_EXTERNAL_HOSTNAME`, which Django uses for `ALLOWED_HOSTS`. After deployment, test `https://YOUR-SERVICE.onrender.com/api/health/`; it should return `{"status":"ok"}`.

### 4. Deploy the static frontend on Netlify

1. Create a Netlify site from the same GitHub repository.
2. Keep the base directory at the repository root. Netlify reads `netlify.toml`, which builds into `netlify-dist/` and publishes that directory only.
3. Add a Netlify build environment variable named `DJANGO_API_URL`, with the Render service origin, for example `https://YOUR-SERVICE.onrender.com` (no path and no trailing slash).
4. Trigger a deploy. Open the Netlify site URL and check both the HR and employee pages.

### 5. Allow the Netlify site to call the API

Copy your Netlify site origin (for example `https://YOUR-SITE.netlify.app`, without a page path) into Render's `CORS_ALLOWED_ORIGINS`. If using a custom Netlify domain, add that origin too, comma-separated. Save and redeploy the Render service, then reload Netlify.

## Data and security notes

- The Render PostgreSQL database starts separately from the local SQLite database. Local records are **not** copied automatically. Run `python manage.py seed_demo_data` from the Render Shell only if you want the sample records in the production database.
- The current API has **no login or authorization**: anyone who can reach it can read and modify records. CORS is a browser rule, not authentication. Deploy only fake/demo data until server-side login and per-role permissions are implemented.
- `netlify-dist/` contains only the built frontend. Do not change Netlify's publish directory to the project root or it may expose backend source files.
- Before using real employee data, complete Django's production deployment checklist and add authentication/authorization.
