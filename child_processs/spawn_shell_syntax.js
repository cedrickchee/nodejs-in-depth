const { spawn } = require('child_process');

// Make the spawned child process inherit the standard IO objects of its parents.
// Make the `spawn` function use the shell syntax as well.
const child = spawn('find . -type f | wc -l', {
  stdio: 'inherit',
  shell: true,
  cwd: '/home/neo/Downloads',
});

// const child = spawn('echo "$UID"', {
//   stdio: 'inherit',
//   shell: true,
//   env: { UID: 'abc123' },
// });

child.on('exit', (code, signal) => {
  console.log('child process exited with ' + `code ${code} and signal ${signal}`);
});

child.on('error', (err) => {
  console.error(`child err:\n${err}`);
});

process.stdout.on('data', (data) => {
  console.log(`Number of files ${data}`);
});

process.stderr.on('data', (data) => {
  console.error(`child stderr:\n${data}`);
});
