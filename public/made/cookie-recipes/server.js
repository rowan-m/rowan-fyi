const express = require('express');
const app = express();

if (app.get('env') === 'production') {
  app.set('view cache', true);
}

// Allow server to run correctly behind a proxy
app.enable('trust proxy');

/*
 * Redirect requests to HTTPS by default and set the HSTS header.
 * You will need to disable or modify this if your demo requires plain HTTP
 */
app.use(function (req, res, next) {
  // Allow http://localhost
  if (req.secure === false && req.hostname === 'localhost') {
    return next();
  }

//   // Set the HSTS header if we're already on HTTPS
  if (req.secure) {
//     res.set('Strict-Transport-Security', 'max-age=63072000; inlcudeSubdomains; preload');
    return next();
  }

  // Otherwise redirect to HTTPS
  res.redirect(301, 'https://' + req.headers.host + req.url);
});

// By default, fall back to serving from the `public` directory
app.use(express.static('public'));

// Cache static files in production
// if (app.get('env') === 'production') {
//   app.use(express.static('public', { maxAge: '1d' }));
// }

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);

  if (app.get('env') === 'development') {
    console.log('If you are running locally, try http://localhost:' + listener.address().port);
  }
});
