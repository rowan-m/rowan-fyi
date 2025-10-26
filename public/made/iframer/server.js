const express = require("express");
const app = express();

/*
 * If you need basic templating, Mustache is enabled
 * Personal preference is just to "upgrade" existing HTML files with templated variables
 * Enable the view cache after the demo is published
 */
const mustacheExpress = require("mustache-express");
app.engine("html", mustacheExpress());
app.set("view engine", "html");
app.set("views", __dirname + "/public");

/*
 * Glitch appears to run in "development" mode, but this is useful if you're moving the code elsewhere
 * Could also enable by default when the code is stable for performance
 */
// if (app.get('env') === 'production') {
app.set("view cache", false);
// }

// Allow server to run correctly behind a proxy
app.enable("trust proxy");

/*
 * Redirect requests to HTTPS by default and set the HSTS header.
 * You will need to disable or modify this if your demo requires plain HTTP
 */
app.use(function (req, res, next) {
  // Allow http://localhost
  if (req.secure === false && req.hostname === "localhost") {
    return next();
  }

  // Set the HSTS header if we're already on HTTPS
  if (req.secure) {
    res.set(
      "Strict-Transport-Security",
      "max-age=63072000; inlcudeSubdomains; preload",
    );
    return next();
  }

  // Otherwise redirect to HTTPS
  res.redirect(301, "https://" + req.headers.host + req.url);
});

app.get("/ua-ch-js", (req, res) => {
  res.set(
    "Permissions-Policy",
    'ch-ua=(), ch-ua-platform=(), ch-ua-platform-version=(), ch-ua-full-version=(self "https://rowan.fyi/made/user-agent-client-hints")',
  );
  res.set("Accept-CH", "Sec-CH-UA-Full-Version");
  res.render("ua-ch-js");
});

// By default, fall back to serving from the `public` directory
app.use(express.static("public"));

/*
 * Cache static files in production
 * Again, could turn this on by default when code is stable for Glitch
 */
// if (app.get('env') === 'production') {
app.use(express.static("public", { maxAge: "1s" }));
// }

const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);

  if (app.get("env") === "development") {
    console.log(
      "If you are running locally, try http://localhost:" +
        listener.address().port,
    );
  }
});
