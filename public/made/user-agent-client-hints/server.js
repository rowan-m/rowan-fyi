const _HINTS = [
  'Sec-CH-UA',
  'Sec-CH-UA-Mobile',
  'Sec-CH-UA-Full-Version',
  'Sec-CH-UA-Full-Version-List',
  'Sec-CH-UA-Platform',
  'Sec-CH-UA-Platform-Version',
  'Sec-CH-UA-Arch',
  'Sec-CH-UA-Wow64',
  'Sec-CH-UA-Bitness',
  'Sec-CH-UA-Model',
  'CH-Save-Data',
  'Save-Data'
];

const express = require('express');
const app = express();

/*
 * If you need basic templating, you can enable Mustache here
 * Personal preference is just to "upgrade" existing HTML files with templated variables
 * Enabling the view cache after the demo is published
 */
const mustacheExpress = require('mustache-express');
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/public');

// if (app.get('env') === 'production') {
  app.set('view cache', false);
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
    res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    return next();
  }

  // Otherwise redirect to HTTPS
  res.redirect(301, 'https://' + req.headers.host + req.url);
});

app.get('/', (req, res) => {
  let displayHeader = '[not set]';

  if (req.query.noheader != 'noheader') {
    let rawCH = [];

    if (typeof req.query.uach === 'string') {
      rawCH = [req.query.uach];
    } else if (Array.isArray(req.query.uach)) {
      rawCH = req.query.uach;
    }

    const acceptCH = [];

    rawCH.forEach((uach) => {
      if (_HINTS.indexOf(uach) >= 0) {
        acceptCH.push(uach);
      }
    });

    let mergedTokens = acceptCH.join(', ');

    // Older versions of the spec did not include the 'Sec-CH-' prefix
    // during the transition, we should send both formats
    // acceptCH.forEach(hint => {
    //   mergedTokens += ', ' + hint.substring(7);
    // });

    res.set('Accept-CH', mergedTokens);
    res.set("Set-Cookie", "abc=123; SameSite=Lax; Secure");
    
    displayHeader = 'Accept-CH: ' + mergedTokens;
  }

  res.render('index', { displayHeader: displayHeader });
  //res.redirect(301, 'https://example.com');
});

app.get('/headers', (req, res) => {
  let displayHeader = '[not set]';

  if (req.query.noheader != 'noheader') {
    let rawCH = [];

    if (typeof req.query.uach === 'string') {
      rawCH = [req.query.uach];
    } else if (Array.isArray(req.query.uach)) {
      rawCH = req.query.uach;
    }

    const acceptCH = ['save-data', 'ch-save-data'];

    rawCH.forEach((uach) => {
      if (_HINTS.indexOf(uach) >= 0) {
        acceptCH.push(uach);
      }
    });

    let mergedTokens = acceptCH.join(', ');

    // Older versions of the spec did not include the 'Sec-CH-' prefix
    // during the transition, we should send both formats
    // acceptCH.forEach(hint => {
    //   mergedTokens += ', ' + hint.substring(7);
    // });

    res.set('Accept-CH', mergedTokens);
    res.set("Set-Cookie", "abc=123; SameSite=Lax; Secure");
    
    displayHeader = 'Accept-CH: ' + mergedTokens;
  }

  res.render('headers', { displayHeader: displayHeader });
});

app.get('/critical-ch', (req, res) => {
  const tokens = 'Sec-CH-UA-Full-Version';
  console.log('Request from', req.ip, '[Sec-CH-UA-Full-Version:', req.get(tokens), ' ]');
  res.set('Accept-CH', tokens);
  res.set('Critical-CH', tokens);
  res.set("Set-Cookie", "abc=123; SameSite=Lax; Secure");
  
  res.render('critical-ch');
});


app.get('/other', (req, res) => {
  res.set('Permissions-Policy', 'ch-width=(self "https://rowan.fyi/made/cdn"), ch-dpr=(self "https://rowan.fyi/made/cdn")');
  res.set('Accept-CH', 'Sec-CH-Width, Sec-CH-DPR');
  res.render('other');
});

app.get('/show-headers.json', (req, res) => {
  const uachHeaders = {};
  _HINTS.forEach((hint) => {
    uachHeaders[hint] = req.get(hint);
  })

  res.json({
    'Accept-CH': res.get('Accept-CH'),
    'Sec-CH-UA': uachHeaders,
    'User-Agent': req.get('User-Agent')
  });
});


app.get(['/javascript', '/javascript.html'], (req, res) => {
  res.redirect('/');
});

// By default, fall back to serving from the `public` directory
app.use(express.static('public'));

// Cache static files in production
// if (app.get('env') === 'production') {
//   app.use(express.static('public', { maxAge: '1h' }));
// }

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);

  if (app.get('env') === 'development') {
    console.log('If you are running locally, try http://localhost:' + listener.address().port);
  }
});
