const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});

app.use(express.static('public'));
app.use('/modules', express.static('node_modules'));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
