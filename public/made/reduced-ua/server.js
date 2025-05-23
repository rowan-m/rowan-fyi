const express = require('express');
const app = express();

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
  app.set('view cache', true);
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

app.get(['/', '/index.html'], (req, res) => {
  res.render('index');
});

app.get(['/embed', '/embed.html'], (req, res) => {
  res.render('embed');
});

app.get('/server-side', (req, res) => {
  const oldUA = req.get('user-agent');
  const chromeUAs = /^Mozilla\/5\.0 \(((?<platform>Lin|Win|Mac|X11; C|X11; L)+[^\)]+)\) AppleWebKit\/537.36 \(KHTML, like Gecko\) Chrome\/(?<major>\d+)[\d\.]+(?<mobile>[ Mobile]*) Safari\/537\.36$/;
  const matched = chromeUAs.exec(req.get('user-agent'));

  if (matched) {
    const unifiedPlatform = {
      'Lin': 'Linux; Android 10; K',
      'Win': 'Windows NT 10.0; Win64; x64',
      'Mac': 'Macintosh; Intel Mac OS X 10_15_7',
      'X11; C': 'CrOS x86_64 14541.0.0',
      'X11; L': 'X11; Linux x86_64',
    };
    req.headers['user-agent'] = `Mozilla/5.0 (${unifiedPlatform[matched.groups.platform]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${matched.groups.major}.0.0.0${matched.groups.mobile} Safari/537.36`;
  }

  res.render('server-side', {didReduce: matched ? 'Yes' : 'No', oldUA: oldUA, newUA: req.get('user-agent')});
});

app.get('/proxied', (req, res) => {
  const oldUA = req.get('user-agent');
  res.render('server-side', {oldUA: oldUA});
});

// By default, fall back to serving from the `public` directory
app.use(express.static('public'));

/*
 * Cache static files in production
 * Again, could turn this on by default when code is stable for Glitch
 */
// if (app.get('env') === 'production') {
  app.use(express.static('public', { maxAge: '1s' }));
// }

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);

  if (app.get('env') === 'development') {
    console.log('If you are running locally, try http://localhost:' + listener.address().port);
  }
});
