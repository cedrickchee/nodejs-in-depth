const { spawn } = require('child_process');

// Example 1
const child = spawn('pwd');

// Example 2
const find = spawn('find', ['.', '-type', 'f']);

// Example 3
const wc = spawn('wc', ['-l']);

process.stdin.pipe(wc.stdin);

child.on('exit', (code, signal) => {
  console.log('child process exited with ' + `code ${code} and signal ${signal}`);
});

child.stdout.on('data', (data) => {
  console.log(`child stdout:\n${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`child stderr:\n${data}`);
});

// Example 4
find.stdout.pipe(wc.stdin);

wc.stdout.on('data', (data) => {
  console.log(`Number of files ${data}`);
});
