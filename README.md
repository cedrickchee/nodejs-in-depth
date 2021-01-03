# Node.js In-Depth

<!-- It's 2020. I think it's good to learn Node.js in-depth as I use it more everyday. Here are my notes from my learning. -->

## Event

_TODO_

## Stream

_TODO_

## Child Processes

Single-threaded, non-blocking performance in Node works great for a single process. But eventually, one process in one CPU is not going to be enough to handle the increasing workload of your application.

No matter how powerful your server may be, a single thread can only support a limited load.

The fact that Node runs in a single thread does not mean that we can’t take advantage of multiple processes and, of course, multiple machines as well.

Using multiple processes is the best way to scale a Node application. Node is designed for building distributed applications with many nodes. This is why it’s named Node. Scalability is baked into the platform and it’s not something you start thinking about later in the lifetime of an application.

### The Child Processes Module

We can easily spin a child process using Node’s `child_process` module and those child processes can easily communicate with each other with a messaging system.

The `child_process` module enables us to access Operating System functionalities by running any system command inside a, well, child process.

We can control that child process input stream and listen to its output stream. We can also control the arguments to be passed to the underlying OS command, and we can do whatever we want with that command’s output. For example, we can pipe the output of one command as the input to another (just like we do in Linux) as all inputs and outputs of these commands can be presented to us using Node streams.

There are four different ways to create a child process in Node: `spawn()`, `fork()`, `exec()`, and `execFile()`.

We’re going to see the differences between these four functions and when to use each.

### Spawned Child Processes

Source code: [child_processs/spawn.js](./child_processs/spawn.js)

The `spawn` function launches a command in a new process and we can use it to pass that command any arguments. For example, here’s code to spawn a new process that will execute the pwd command.

```javascript
const { spawn } = require('child_process');

const child = spawn('pwd');
```

We simply destructure the `spawn` function out of the `child_process` module and execute it with the OS command as the first argument.

The result of executing the `spawn` function (the `child` object above) is a `ChildProcess` instance, which implements the `EventEmitter` API. This means we can register handlers for events on this child object directly. For example, we can do something when the child process exits by registering a handler for the `exit` event:

```javascript
child.on('exit', (code, signal) => {
  console.log('child process exited with ' + `code ${code} and signal ${signal}`);
});
```

The handler above gives us the exit `code` for the child process and the `signal`, if any, that was used to terminate the child process. This signal variable is null when the child process exits normally.

The other events that we can register handlers for with the `ChildProcess` instances are `disconnect`, `error`, `close`, and `message`.
- The `disconnect` event is emitted when the parent process manually calls the `child.disconnect` method.
- The `error` event is emitted if the process could not be spawned or killed.
- The `close` event is emitted when the `stdio` streams of a child process get closed.
- The `message` event is the most important one. It’s emitted when the child process uses the `process.send()` function to send messages. This is how parent - child processes can communicate with each other. We’ll see an example of this below.

Every child process also gets the three standard `stdio` streams, which we can access using `child.stdin`, `child.stdout`, and `child.stderr`.

When those streams get closed, the child process that was using them will emit the `close` event. This `close` event is different than the `exit` event because multiple child processes might share the same `stdio` streams, so one child process exiting does not mean that the streams got closed.

Since all streams are event emitters, we can listen to different events on those `stdio` streams that are attached to every child process. Unlike in a normal process though, in a child process the `stdout/stderr` streams are readable streams while the stdin stream is a writable one. This is basically the inverse of those types found in a main process. The events we can use for those streams are the standard ones. Most importantly, on the readable streams we can listen to the data event, which will have the output of the command or any error encountered while executing the command:

```javascript
child.stdout.on('data', (data) => {
  console.log(`child stdout:\n${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`child stderr:\n${data}`);
});
```

The two handlers above will log both cases to the main process `stdout` and `stderr`. When we execute the `spawn` function above, the output of the `pwd` command gets printed and the child process exits with code `0`, which means no error occurred.

We can pass arguments to the command that’s executed by the `spawn` function using the second argument of the `spawn` function, which is an array of all the arguments to be passed to the command. For example, to execute the `find` command on the current directory with a `-type f` argument (to list files only), we can do:

```javascript
const child = spawn('find', ['.', '-type', 'f']);
```

If an error occurs during the execution of the command (for example, if we give find an invalid destination above) the `child.stderr` data event handler will be triggered and the `exit` event handler will report an exit code of 1, which signifies that an error has occurred. The error values actually depend on the host OS and the type of error.

A child process `stdin` is a writable stream. We can use it to send a command some input. Just like any writable stream, the easiest way to consume it is using the `pipe` function. We simply pipe a readable stream into a writable stream. Since the main process `stdin` is a readable stream, we can pipe that into a child process `stdin` stream. For example:

```javascript
const { spawn } = require('child_process');

const child = spawn('wc');

process.stdin.pipe(child.stdin);

child.stdout.on('data', (data) => {
  console.log(`child stdout:\n${data}`);
});
```

In the example above, the child process invokes the `wc` command, which counts lines, words, and characters in Linux. We then pipe the main process `stdin` (which is a readable stream) into the child process `stdin` (which is a writable stream). The result of this combination is that we get a standard input mode where we can type something, and when we hit `Ctrl+D` what we typed will be used as the input of the `wc` command.

We can also pipe the standard input/output of multiple processes on each other, just like we can do with Linux commands. For example, we can pipe the `stdout` of the `find` command to the `stdin` of the `wc` command to count all the files in the current directory:

```javascript
const { spawn } = require('child_process');

const find = spawn('find', ['.', '-type', 'f']);
const wc = spawn('wc', ['-l']);

find.stdout.pipe(wc.stdin);

wc.stdout.on('data', (data) => {
  console.log(`Number of files ${data}`);
});
```

I added the `-l` argument to the `wc` command to make it count only the lines. When executed, the code above will output a count of all files in all directories under the current one.

### Shell Syntax and the exec Function

Source code: [child_processs/exec.js](./child_processs/exec.js)

By default, the `spawn` function does not create a shell to execute the command we pass into it. This makes it slightly more efficient than the `exec` function, which does create a shell. The `exec` function has one other major difference. It **buffers** the command’s generated output and passes the whole output value to a callback function (instead of using streams, which is what `spawn` does).

Here’s the previous `find | wc` example implemented with an `exec` function.

```javascript
const { exec } = require('child_process');

exec('find . -type f | wc -l', (err, stdout, stderr) => {
  if (err) {
    console.error(`exec error: ${err}`);
    return;
  }

  console.log(`Number of files ${stdout}`);
});
```

Since the `exec` function uses a shell to execute the command, we can use the shell syntax directly here, making use of the shell **pipe** feature.

> :warning: Note that using the shell syntax comes with a security risk if you’re executing any kind of dynamic input provided externally. A user can simply do a command injection attack using shell syntax characters like ; and $ (for example, `command + '; rm -rf ~'` )

The `exec` function buffers the output and passes it to the callback function (the second argument to `exec`) as the `stdout` argument there. This `stdout` argument is the command’s output that we want to print out.

The `exec` function is a good choice if you need to use the shell syntax and if the size of the data expected from the command is small. (Remember, `exec` will buffer the whole data in memory before returning it.)

The `spawn` function is a much better choice when the size of the data expected from the command is large because that data will be streamed with the standard IO objects.

We can make the spawned child process inherit the standard IO objects of its parents if we want to, but more importantly, we can make the `spawn` function use the shell syntax as well. Here’s the same `find | wc` command implemented with the `spawn` function:

```javascript
const child = spawn('find . -type f | wc -l', {
  stdio: 'inherit',
  shell: true,
});
```

Source code: [child_processs/spawn_shell_syntax.js](./child_processs/spawn_shell_syntax.js)

Because of the `stdio: 'inherit'` option above, when we execute the code, the child process inherits the main process `stdin`, `stdout`, and `stderr`. This causes the child process data events handlers to be triggered on the main `process.stdout` stream, making the script output the result right away.

Because of the `shell: true` option above, we were able to use the shell syntax in the executed command, just like we did with `exec`. But with this code, we still get the advantage of the streaming of data that the spawn function gives us. This is really the best of both worlds.

There are a few other good options we can use in the last argument to the `child_process` functions besides `shell` and `stdio`. For example, we can use the `cwd` option to change the working directory of the script. For example, here’s the same count-all-files example done with a `spawn` function using a shell and with a working directory set to my Downloads folder. The `cwd` option here will make the script count all files I have in `~/Downloads`:

```javascript
const child = spawn('find . -type f | wc -l', {
  stdio: 'inherit',
  shell: true,
  cwd: '/home/neo/Downloads',
});
```

Another option we can use is `env` to specify the environment variables that will be visible to the new child process. The default for this option is `process.env` which gives any command access to the current process environment. If we want to override that behavior, we can simply pass an empty object as the `env` option or new values there to be considered as the only environment variables:

```javascript
const child = spawn('echo $UID', {
  stdio: 'inherit',
  shell: true,
  env: { UID: 'abc123' },
});
```

The `echo` command above does not have access to the parent process’s environment variables. For example, it cannot access `$HOME`, but it can access `$ANSWER` because it was passed as a custom environment variable through the `env` option.

One last important child process option to explain here is the `detached` option, which makes the child process run independently of its parent process.

Assuming we have a file `timer.js` that keeps the event loop busy:

```javascript
setTimeout(() => {
  // keep the event loop busy
  console.log('timer runs');
}, 10000);
```

We can execute it in the background using the `detached`option:

```javascript
const { spawn } = require('child_process');

const child = spawn('node', ['timer.js'], {
  detached: true,
  stdio: 'ignore'
});

child.unref();
```

Source code: [child_processs/spawn_detached.js](./child_processs/spawn_detached.js)

The exact behavior of detached child processes depends on the OS. On Windows, they will have their own console window while on Linux they will be made the leaders of new process groups and sessions.

If the `unref` function is called on the detached process, the parent process can exit independently of the child. This can be useful if the child is executing a long-running process, but to keep it running in the background the child’s `stdio` configurations also have to be independent of the parent.

The example above will run a node script (`timer.js`) in the background by detaching and also ignoring its parent `stdio` file descriptors so that the parent can terminate while the child keeps running in the background.

# The `execFile` Function

If you need to execute a file without using a shell, the `execFile` function is what you need. It behaves exactly like the `exec` function, but does not use a shell, which makes it a bit more efficient. On Windows, some files cannot be executed on their own, like `.bat` or `.cmd` files. Those files cannot be executed with `execFile` and either `exec` or `spawn` with shell set to true is required to execute them.

# The `*Sync` Functions

The functions `spawn`, `exec`, and `execFile` from the `child_process` module also have synchronous blocking versions that will wait until the child process exits.

```javascript
const { spawnSync, execSync, execFileSync } = require('child_process');
```

Those synchronous versions are potentially useful when trying to simplify scripting tasks or any startup processing tasks, but they should be avoided otherwise.

# The `fork` Function

The `fork` function is a variation of the `spawn` function for spawning node processes. The biggest difference between spawn and `fork` is that a communication channel is established to the child process when using `fork`, so we can use the `send` function on the forked process along with the global process object itself to exchange messages between the parent and forked processes. We do this through the `EventEmitter` module interface. Here’s an example:

The parent file, `parent.js`:

```javascript
const { fork } = require('child_process');

const forked = fork('child.js');

forked.on('message', (msg) => {
  console.log('Message from child', msg);
});

forked.send({ hello: 'world' });
```

The child file, `child.js`:

```javascript
process.on('message', (msg) => {
  console.log('Message from parent:', msg);
});

let counter = 0;

setInterval(() => {
  process.send({ counter: counter++ });
}, 1000);
```

In the parent file above, we fork `child.js` (which will execute the file with the `node` command) and then we listen for the `message` event. The message event will be emitted whenever the child uses `process.send`, which we’re doing every second.

To pass down messages from the parent to the child, we can execute the `send` function on the forked object itself. Then, in the child script, we can listen to the `message` event on the global `process` object.

When executing the `parent.js` file above, it’ll first send down the `{ hello: 'world' }` object to be printed by the forked child process and then the forked child process will send an incremented counter value every second to be printed by the parent process.

Let’s do a more practical example about the `fork` function.

Let’s say we have an http server that handles two endpoints. One of these endpoints (`/compute` below) is computationally expensive and will take a few seconds to complete. We can use a long for loop to simulate that:

```javascript
const http = require('http');

const longComputation = () => {
  let sum = 0;
  for (let i = 0; i < 1e9; i++) {
    sum += i;
  }
  return sum;
};

const server = http.createServer();

server.on('request', (req, res) => {
  if (req.url === '/compute') {
    const sum = longComputation();
    return res.end(`Sum is ${sum}`);
  } else {
    res.end('Ok');
  }
});

server.listen(3000);
```

This program has a big problem; when the `/compute` endpoint is requested, the server will not be able to handle any other requests because the event loop is busy with the long for loop operation.

There are a few ways we can solve this problem depending on the nature of the long operation but one solution that works for all operations is to just move the computational operation into another process using `fork`.

We first move the whole `longComputation` function into its own file and make it invoke that function when instructed via a message from the main process:

In a new `compute.js` file:

```javascript
const longComputation = () => {
  let sum = 0;
  for (let i = 0; i < 1e9; i++) {
    sum += i;
  }
  return sum;
};

process.on('message', (msg) => {
  const sum = longComputation();
  process.send(sum);
});
```

Now, instead of doing the long operation in the main process event loop, we can `fork` the `compute.js` file and use the messages interface to communicate messages between the server and the forked process.

```javascript
const http = require('http');
const { fork } = require('child_process');

const server = http.createServer();

server.on('request', (req, res) => {
  if (req.url === '/compute') {
    const compute = fork('compute.js');
    compute.send('start');
    compute.on('message', (sum) => {
      return res.end(`Sum is ${sum}`);
    });
  } else {
    res.end('Ok');
  }
});

server.listen(3000);
```

When a request to `/compute` happens now with the above code, we simply send a message to the forked process to start executing the long operation. The main process’s event loop will not be blocked.

Once the forked process is done with that long operation, it can send its result back to the parent process using `process.send`.

In the parent process, we listen to the `message` event on the forked child process itself. When we get that event, we’ll have a `sum` value ready for us to send to the requesting user over http.

The code above is limited by the number of processes we can fork, but when we execute it and request the long computation endpoint over http, the main server is not blocked at all and can take further requests.

Node’s *cluster* module, which is the topic of the [next "Scaling Node Apps" article](./README.md#scaling-nodejs-apps), is based on this idea of child process forking and load balancing the requests among the many forks that we can create on any system.
