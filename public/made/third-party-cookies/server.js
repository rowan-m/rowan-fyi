const express = require('express');
const app = express();


/*
 * Glitch appears to run in "development" mode, but this is useful if you're moving the code elsewhere
 * Could also enable by default when the code is stable for performance
 */
// app.set('view cache', false);
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

  // Set the HSTS header if we're already on HTTPS
  if (req.secure) {
    res.set('Strict-Transport-Security', 'max-age=63072000; includeSubdomains; preload');
    // Doesn't do much, but more a reminder to actually do one for a real project
    res.set('Content-Security-Policy',
            `script-src https: 'unsafe-inline'; `
            + `object-src 'none'; `
            + `base-uri 'none'; `
            + `frame-ancestors 'self' *; `
           );
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return next();
  }

  // Otherwise redirect to HTTPS
  res.redirect(301, 'https://' + req.headers.host + req.url);
});

// By default, fall back to serving from the `public` directory
app.use(express.static('public'));

/*
 * Glitch appears to run in "development" mode, but this is useful if you're moving the code elsewhere
 * Could also enable by default when the code is stable for performance
 */
// app.use(express.static('public', { maxAge: '1s' }));
if (app.get('env') === 'production') {
  app.use(express.static('public', { maxAge: '1d' }));
}

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);

  if (app.get('env') === 'development') {
    console.log('If you are running locally, try http://localhost:' + listener.address().port);
  }
});
