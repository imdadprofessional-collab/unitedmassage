# United Massage

Simple static website (HTML + CSS, no server, no admin login) for United Massage, 3100 Godby Rd, College Park, GA 30349.

- Pages: `index.html`, `contact.html`, `privacy.html`; styles in `assets/style.css`.
- **Booking link:** every "Book Now" button uses the placeholder `https://example.com/replace-with-real-booking-link`. Replace it everywhere:
  `sed -i 's#https://example.com/replace-with-real-booking-link#YOUR_LINK#g' *.html`
- Phone/address are plain text in the HTML files; edit them there.
- Photos: none are included. Drop images in `assets/` and reference them in `index.html`.
- Deploy: import the repo in Vercel (framework preset "Other", no build command). Add the GoDaddy domain under Settings → Domains.
