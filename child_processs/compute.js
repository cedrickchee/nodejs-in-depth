const longComputation = () => {
  let sum = 0;
  for (let i = 0; i < 1e9; i++) {
    sum += i;
  }
  return sum;
};

process.on('message', (msg) => {
  console.log('#child: message from parent:', msg);
  const sum = longComputation();
  console.log('#child: long computation done');
  process.send(sum);
});
