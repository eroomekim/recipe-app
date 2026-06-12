// Custom Node server for Phusion Passenger (cPanel "Setup Node.js App").
//
// cPanel's Node app feature runs the app under Passenger, which loads this
// file as the "Application startup file" and supplies the listening port via
// process.env.PORT. We hand every request to Next.js's request handler so
// middleware, App Router, and API routes all work exactly as in `next start`.
//
// Prerequisite: the app must already be built (`npm run build`) so that the
// `.next` production output exists alongside this file.

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res, parse(req.url, true));
    }).listen(port, () => {
      console.log(`> Recipe Book ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start Next.js server:", err);
    process.exit(1);
  });
