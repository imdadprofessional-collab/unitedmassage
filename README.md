# United Massage

Website for United Massage, 3100 Godby Rd, College Park, GA 30349. It has an admin panel for editing the content. There are no npm dependencies; it needs Node 18+.

## Run
```
npm start            # http://localhost:3000
```
On first start an admin account is created and the password is printed once.
To choose your own, set `ADMIN_USER` and `ADMIN_PASSWORD` before the first start.
Log in at `/admin`. You can edit the address, phone, hours, payment text, **booking/payment link**, services and prices, and the home page text. You can also change your login and moderate reviews there.

## Booking link
`bookingUrl` is a placeholder. Replace it in Admin → Contact & business info and every "Book" button updates.

## Reviews
Visitors can submit reviews. They stay hidden until you approve them in the admin panel. No sample reviews are shipped; only real guest feedback should be published.

## Hosting
GitHub Pages is static-only, so the admin login needs a Node host (Render, Railway, Fly.io, a VPS). Set `SESSION_SECRET`, `ADMIN_USER` and `ADMIN_PASSWORD`, and give `data/` a persistent disk. Content lives in `data/content.json`.

## Test
`npm test`

## Deploy
See [DEPLOY.md](DEPLOY.md) for GoDaddy (cPanel Node.js app or VPS) and Docker. Vercel is also supported (Blob storage) but not required.
