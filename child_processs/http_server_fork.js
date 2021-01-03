const http = require('http');
const { fork } = require('child_process');

const server = http.createServer();

server.on('request', (req, res) => {
  if (req.url === '/compute') {
    console.log(`${req.method} ${req.url}`);

    const compute = fork('compute.js');
    console.log('#parent: sending message to child');
    compute.send('start');
    console.log('#parent: message sent to child');
    compute.on('message', (sum) => {
      console.log('#parent: message from child:', sum);
      return res.end(`Sum is ${sum}`);
    });
    console.log('#parent: waiting for forked process work to finish');
  } else {
    res.end('Ok');
  }
});

server.listen(3000);
