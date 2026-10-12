# United Massage

Simple static website (HTML + CSS, no server, no admin login) for United Massage, 3100 Godby Rd, College Park, GA 30349.

- Pages: `index.html`, `contact.html`, `privacy.html`; styles in `assets/style.css`.
- **Booking form:** `book.html` posts to a form service. Create a free form at formspree.io (or similar) that emails you, then replace `REPLACE_WITH_YOUR_FORM_ID` in `book.html` with your form ID. Until then the form will not deliver; the Call/Text buttons work.
- Phone/address are plain text in the HTML files; edit them there.
- Photos: none are included. Drop images in `assets/` and reference them in `index.html`.
- Deploy: import the repo in Vercel (framework preset "Other", no build command). Add the GoDaddy domain under Settings → Domains.

## Reviews carousel (real reviews only)
`assets/reviews.json` is empty, so the section is hidden. Add only genuine customer reviews, with permission, e.g.:
```json
[{"name": "Jane D.", "source": "Google", "rating": 5, "text": "The review text."}]
```
Entries need `name`, `source` and `text`. The section appears automatically and slides every 5 seconds.
