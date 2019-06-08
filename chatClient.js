const net = require('net');

let chatClient = net.createConnection({port: 5000}, () => {
    console.log('Connected');
});

chatClient.setEncoding('utf8');
chatClient.on('data', message => {
    console.log(message);
});


process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
    let chunk;
    // Use a loop to make sure we read all available data.
    while ((chunk = process.stdin.read()) !== null) {
        chatClient.write(chunk);
    }
});