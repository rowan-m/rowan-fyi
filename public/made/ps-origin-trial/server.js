const TOKEN_1P =
  "AvL8mErEjQBKGLVlqC/1qszmYbE7mtvZyd7gEuxTT/bX/2qVxTaGPTLRcMrl42am+9N44A2l22iLsjOwo5iwPgYAAABoeyJvcmlnaW4iOiJodHRwczovL3BzLW9yaWdpbi10cmlhbC5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlByaXZhY3lTYW5kYm94QWRzQVBJcyIsImV4cGlyeSI6MTY4MDY1Mjc5OX0=";
const TOKEN_3P =
  "A3tdw7TzS2AlA4x5zgXMmsd3my4wz+hfnpw/rUPq1laPbhyidvVdup0MgoCxcNyNNaaGyZUh77GibylbsESApAgAAAB5eyJvcmlnaW4iOiJodHRwczovL3gtb3JpZ2luLXNyYy5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlByaXZhY3lTYW5kYm94QWRzQVBJcyIsImV4cGlyeSI6MTY4MDY1Mjc5OSwiaXNUaGlyZFBhcnR5Ijp0cnVlfQ==";
const TOKEN_3P_1P =
  "AqbXOCX7RXsEXrftm6IBrRkqgcl6WRWglCsC2MTsiqvvcM9SsQZxhH34sfYyhiQ0rLXF1r+i9wAkZSlJnfIugQAAAABleyJvcmlnaW4iOiJodHRwczovL3gtb3JpZ2luLXNyYy5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlByaXZhY3lTYW5kYm94QWRzQVBJcyIsImV4cGlyeSI6MTY4MDY1Mjc5OX0=";

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
      "max-age=63072000; includeSubdomains; preload",
    );
    return next();
  }

  // Otherwise redirect to HTTPS
  res.redirect(301, "https://" + req.headers.host + req.url);
});

// TODO - if you need any server-side routes, add them here
// app.get('/', (req, res) => {
//   res.render('index');
// });

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/header.html", (req, res) => {
  res.set("Origin-Trial", TOKEN_1P);
  res.render("header", { token_1p: TOKEN_1P });
});

app.get("/meta.html", (req, res) => {
  res.render("meta", { token_1p: TOKEN_1P });
});

app.get("/injected-meta.html", (req, res) => {
  res.render("injected-meta", { token_1p: TOKEN_1P });
});

app.get("/iframe-header.html", (req, res) => {
  res.render("iframe-header", { token_1p: TOKEN_1P });
});

app.get("/iframe-header-src.html", (req, res) => {
  res.set("Origin-Trial", TOKEN_1P);
  res.render("iframe-header-src");
});

app.get("/iframe-meta.html", (req, res) => {
  res.render("iframe-meta", { token_1p: TOKEN_1P });
});

app.get("/iframe-meta-src.html", (req, res) => {
  res.render("iframe-meta-src", { token_1p: TOKEN_1P });
});

app.get("/3p-injected-meta.html", (req, res) => {
  res.render("3p-injected-meta", { token_1p: TOKEN_3P });
});

app.get("/3p-iframe-header.html", (req, res) => {
  res.render("3p-iframe-header", { token_3p_1p: TOKEN_3P_1P });
});

app.get("/3p-iframe-meta.html", (req, res) => {
  res.render("3p-iframe-meta", { token_3p_1p: TOKEN_3P_1P });
});

app.get("/no-ot-token.html", (req, res) => {
  res.render("no-ot-token", {});
});

// By default, fall back to serving from the `public` directory
app.use(express.static("public"));

/*
 * Glitch appears to run in "development" mode, but this is useful if you're moving the code elsewhere
 * Could also enable by default when the code is stable for performance
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
