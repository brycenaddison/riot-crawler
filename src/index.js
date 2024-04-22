require('dotenv').config();

const app = require('express')();
require('express-ws')(app);
const Crawler = require('./crawler');

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

const connections = [];

const crawler = new Crawler({
  broadcast: (message) => connections.forEach((ws) => ws.send(message)),
});

app.ws('/', (ws) => {
  ws.send('Connected to server');

  ws.on('message', (type) => {
    if (type === 'query') {
      crawler.download();
    } else if (type === 'crawl') {
      crawler.seed('NA1_4954804129');
    } else if (type === 'cancel') {
      crawler.cancel();
    }
  });

  connections.push(ws);
});

app.listen(process.env.PORT);
