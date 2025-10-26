const express = require("express");
const app = express();

// const mustacheExpress = require('mustache-express');
// app.engine('html', mustacheExpress());

// app.set('view engine', 'html');
// app.set('views', __dirname + '/public');
// app.set('view cache', false);

app.enable("trust proxy");
app.use(function (req, res, next) {
  if (req.secure) {
    res.set(
      "Strict-Transport-Security",
      "max-age=63072000; inlcudeSubdomains; preload",
    );
    return next();
  }

  res.redirect(301, "https://" + req.headers.host + req.url);
});

app.use(express.static("public"));

const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
