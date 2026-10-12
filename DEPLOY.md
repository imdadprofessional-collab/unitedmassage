# Deploying (GoDaddy or any Node host)

The app is a plain Node.js server (Node 18+). Admin edits are saved to `data/content.json`,
the admin login to `data/admin.json` — **keep the `data/` folder on persistent disk and back it up.**

Set these environment variables (before first start):
- `ADMIN_USER`, `ADMIN_PASSWORD` – first admin login (change later in /admin)
- `SESSION_SECRET` – any long random string

## A) GoDaddy cPanel hosting ("Setup Node.js App", if your plan has it)
1. cPanel → Setup Node.js App → Create Application: Node 18+, mode Production, application root `unitedmassage`, startup file `app.js`.
2. Upload this repo's files (File Manager, or `git clone` via cPanel Git Version Control) into that folder.
3. In the app screen click **Run NPM Install**, add the environment variables above, then **Restart**.
4. Point the domain/subdomain at the app (cPanel does this for you) and enable SSL (AutoSSL).

## B) GoDaddy VPS / any Linux server
```
sudo apt install -y nodejs npm nginx
git clone https://github.com/imdadprofessional-collab/unitedmassage && cd unitedmassage
npm ci --omit=dev
export ADMIN_USER=admin ADMIN_PASSWORD='choose-one' SESSION_SECRET="$(openssl rand -hex 32)"
sudo npm i -g pm2 && pm2 start server.js --name unitedmassage && pm2 save && pm2 startup
```
nginx site (`/etc/nginx/sites-available/unitedmassage`), then `sudo certbot --nginx -d yourdomain.com`:
```
server { server_name yourdomain.com www.yourdomain.com;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr; proxy_set_header X-Forwarded-Proto $scheme; } }
```
Point the GoDaddy DNS **A record** (`@` and `www`) to the server IP.

## C) Docker
`docker build -t unitedmassage . && docker run -d -p 3000:3000 -v um-data:/app/data -e ADMIN_PASSWORD=... -e SESSION_SECRET=... unitedmassage`

## Not supported: GoDaddy basic shared hosting without Node.js
It cannot run the admin login; use A, B or C instead.
