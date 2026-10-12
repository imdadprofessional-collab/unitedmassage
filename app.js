// Entry point for hosts that expect app.js (e.g. GoDaddy cPanel "Setup Node.js App").
// Passenger sets PORT / provides the listener; locally this just starts the server.
const server = require('./server');
if (!server.listening) server.listen(process.env.PORT || 3000);
