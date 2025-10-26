const express = require("express");
const app = express();

const cp = require("cookie-parser");
app.use(cp());

const mustacheExpress = require("mustache-express");
app.engine("html", mustacheExpress());
app.set("view engine", "html");
app.set("views", __dirname + "/public");

// app.set('view cache', false);
// if (app.get('env') === 'production') {
app.set("view cache", true);
// }

app.enable("trust proxy");

app.use(function (req, res, next) {
  if (req.secure === false && req.hostname === "localhost") {
    return next();
  }

  if (req.secure) {
    res.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubdomains; preload",
    );
    return next();
  }

  res.redirect(301, "https://" + req.headers.host + req.url);
});

app.get("/", (req, res) => {
  console.log(req.headers);
  const templateVars = {
    receiveCookieDeprecationCookieValue: "",
    secCookieDeprecationHeaderValue: "",
  };

  if ("receive-cookie-deprecation" in req.cookies) {
    templateVars.receiveCookieDeprecationCookieValue =
      req.cookies["receive-cookie-deprecation"];
  }

  if ("sec-cookie-deprecation" in req.headers) {
    templateVars.secCookieDeprecationHeaderValue =
      req.headers["sec-cookie-deprecation"];
  }

  res.render("index", templateVars);
});

app.get("/set-cookie", (req, res) => {
  res.set(
    "Set-Cookie",
    "receive-cookie-deprecation=1; Secure; HttpOnly; Path=/; SameSite=None; Partitioned;",
  );
  res.redirect(303, "/");
});

app.get("/expire-cookie", (req, res) => {
  res.set(
    "Set-Cookie",
    "receive-cookie-deprecation=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; Path=/; SameSite=None; Partitioned;",
  );
  res.redirect(303, "/");
});

app.use(express.static("public"));

// app.use(express.static('public', { maxAge: '1s' }));
// if (app.get('env') === 'production') {
app.use(express.static("public", { maxAge: "1d" }));
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
