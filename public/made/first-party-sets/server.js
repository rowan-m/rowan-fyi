const express = require("express");
const app = express();

const cp = require("cookie-parser");
app.use(cp());

const mustacheExpress = require("mustache-express");
app.engine("html", mustacheExpress());
app.set("view engine", "html");
app.set("views", __dirname + "/public");

// app.set('view cache', true);
app.set("view cache", false);

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
      "max-age=63072000; includeSubdomains; preload",
    );
    return next();
  }

  // Otherwise redirect to HTTPS
  res.redirect(301, "https://" + req.headers.host + req.url);
});

// TODO - if you need any server-side routes, add them here
app.get("/", (req, res) => {
  res.redirect(301, "https://rowan.fyi/made/related-website-sets/");
  // res.cookie('sameSite', Date.now(), {sameSite: 'lax', secure: true});
  // res.cookie('crossSite', Date.now(), {sameSite: 'none', secure: true});
  // res.render('index');
});

app.get("/getcookies.json", (req, res) => {
  // console.log(req.cookies);
  res.set("Access-Control-Allow-Credentials", "true");
  res.set("Access-Control-Allow-Origin", "https://rowan.fyi/made/fps-member-1");
  res.json(req.cookies);
});

app.get("/request-storage-access-for.html", (req, res) => {
  res.render("request-storage-access-for", req.cookies);
});

app.get("/request-storage-access.html", (req, res) => {
  // console.log(req.cookies);
  res.render("request-storage-access", req.cookies);
});

// By default, fall back to serving from the `public` directory
// app.use(express.static('public'));

// app.use(express.static('public', { maxAge: '1d' }));
app.use(express.static("public", { maxAge: "1s" }));

const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);

  if (app.get("env") === "development") {
    console.log(
      "If you are running locally, try http://localhost:" +
        listener.address().port,
    );
  }
});
