const { spawn } = require('child_process');

const child = spawn('node', ['timer.js'], {
  detached: true,
  stdio: 'inherit'
});

child.unref();

// The snippet above will run effectively the same as if it had been backgrounded by the shell:
// `$ node timer.js &`
