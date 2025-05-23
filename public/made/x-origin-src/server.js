const TOKEN_1P = 'AqbXOCX7RXsEXrftm6IBrRkqgcl6WRWglCsC2MTsiqvvcM9SsQZxhH34sfYyhiQ0rLXF1r+i9wAkZSlJnfIugQAAAABleyJvcmlnaW4iOiJodHRwczovL3gtb3JpZ2luLXNyYy5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlByaXZhY3lTYW5kYm94QWRzQVBJcyIsImV4cGlyeSI6MTY4MDY1Mjc5OX0=';
const TOKEN_3P = 'A3tdw7TzS2AlA4x5zgXMmsd3my4wz+hfnpw/rUPq1laPbhyidvVdup0MgoCxcNyNNaaGyZUh77GibylbsESApAgAAAB5eyJvcmlnaW4iOiJodHRwczovL3gtb3JpZ2luLXNyYy5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlByaXZhY3lTYW5kYm94QWRzQVBJcyIsImV4cGlyeSI6MTY4MDY1Mjc5OSwiaXNUaGlyZFBhcnR5Ijp0cnVlfQ==';

const express = require('express');
const cp = require("cookie-parser");

const app = express();
app.use(cp());

/*
 * If you need basic templating, Mustache is enabled
 * Personal preference is just to "upgrade" existing HTML files with templated variables
 * Enable the view cache after the demo is published
 */
const mustacheExpress = require('mustache-express');
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/public');


/*
 * Glitch appears to run in "development" mode, but this is useful if you're moving the code elsewhere
 * Could also enable by default when the code is stable for performance
 */
// if (app.get('env') === 'production') {
  app.set('view cache', false);
  // app.set('view cache', true);
// }

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
    res.set('Strict-Transport-Security', 'max-age=63072000; inlcudeSubdomains; preload');
    return next();
  }

  // Otherwise redirect to HTTPS
  res.redirect(301, 'https://' + req.headers.host + req.url);
});

// TODO - if you need any server-side routes, add them here
// app.get('/', (req, res) => {
//   res.render('index');
// });

app.get('/big-cookie', (req, res) => {
  const bloatedString = '😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪😅🍪';
  res.cookie("big-value", bloatedString, { sameSite: "lax" });
  res.render('big-cookie');
});


app.get('/alert', (req, res) => {
  console.log('hi!');
  const endpoint = {
    "max_age": 10886400,
    "endpoints": [{
      "url": "https://rowan.fyi/made/x-origin-src/report"
    }]
  };
  res.set('Report-To', JSON.stringify(endpoint));
  res.render('alert');
});

app.get('/report', (req, res) => {
  console.log(req);
  res.send();
});


app.get('/iframe-header-src.html', (req, res) => {
  res.set('Origin-Trial', TOKEN_1P);
  res.render('iframe-header-src');
});

app.get('/iframe-meta-src.html', (req, res) => {
  res.render('iframe-meta-src', {token_1p: TOKEN_1P});
});

app.get('/chips', (req, res) => {
  var count = 1;

console.log(req.cookies);   
console.log(parseInt(req.cookies['__Host-count'], 10));
  if (parseInt(req.cookies['__Host-count'], 10) >= 1) {
    count = parseInt(req.cookies['__Host-count'], 10);
    count++;
  }

console.log({count});
  res.set('Accept-CH', 'Sec-CH-Partitioned-Cookies');
  res.set('Set-Cookie', `__Host-count=${count}; Secure; Path=/; SameSite=None; Partitioned;`);
  res.set('Origin-Trial', 'Am1y6NbY6C9Ho2FGhfWb1eZH3QfBlpim0XpyfR82Im9vbPs81bOkZkEhIYJ6O27obIJv6HMFtp/BD85bYM5klwIAAABieyJvcmlnaW4iOiJodHRwczovL3gtb3JpZ2luLXNyYy5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlBhcnRpdGlvbmVkQ29va2llcyIsImV4cGlyeSI6MTY1NTI1MTE5OX0=');
  res.render('chips', {'count': count});
});

const ALLOWED_ORIGINS = [
  'https://rowan.fyi/made/chrome-facilitated-testing',
  'https://rowan.fyi/made/first-party-sets',
  'https://rowan.fyi/made/related-website-sets',
  'https://rowan.fyi/made/third-party-cookies',
  'https://rowan.fyi/made/3pc-dt'
];

app.get('/set-3pc.json', (req, res) => {
  const allowedOrigin = (ALLOWED_ORIGINS.includes(req.headers.origin)) ? req.headers.origin : 'https://rowan.fyi/made/x-origin-src';
  res.set(
    "Access-Control-Allow-Origin",
    allowedOrigin
  );
  res.set("Access-Control-Allow-Credentials", "true");
  const timestamp = Date.now();
  res.cookie('3pc', timestamp, {sameSite: 'none', secure: true});
  res.json(req.cookies);
});

app.get('/get-3pc.json', (req, res) => {
  const origin = req.get('origin');
  if (ALLOWED_ORIGINS.includes(origin)) {
    console.log({origin});
    res.set(
      "Access-Control-Allow-Origin",
      origin
    );
    res.set("Access-Control-Allow-Credentials", "true");    
  }
  res.json(req.cookies);
});


app.get('/set-3pc.html', (req, res) => {
  const timestamp = Date.now();
  res.cookie('3pc', timestamp, {sameSite: 'none', secure: true});
    res.render('set-3pc', {timestamp: timestamp});
});


// By default, fall back to serving from the `public` directory
app.use(express.static('public'));

/*
 * Cache static files in production
 * Again, could turn this on by default when code is stable for Glitch
 */
app.use(express.static('public', { maxAge: '1s' }));
// if (app.get('env') === 'production') {
  // app.use(express.static('public', { maxAge: '1d' }));
// }

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);

  if (app.get('env') === 'development') {
    console.log('If you are running locally, try http://localhost:' + listener.address().port);
  }
});