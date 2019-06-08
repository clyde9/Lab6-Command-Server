const net = require('net');
const fs = require('fs');
const port = 5000;

class ChatRoom {
    constructor() {
        this.clients = [];
        this.log = fs.createWriteStream('./chat.log');
        this.id = 1;
        this.adminPassword = 'asdf';
    }
    
    add(socket) {
        socket.username = `Client${this.id++}`;
        for (let client of this.clients) {
            client.write(`${socket.username} has entered the chat room.`);
        }
        this.clients.push(socket);
        socket.write(`Welcome to the chat room. There are currently ${this.clients.length - 1} other people in the chat room.`);
        this.log.write(`${socket.username} has entered the chat room.\n`);
    }
    
    remove(socket) {
        this.clients.splice(this.clients.indexOf(socket), 1);
        for (let client of this.clients) {
            client.write(`${socket.username} has left the chat room.`);
        }
        this.log.write(`${socket.username} has left the chat room.\n`);
    }
    
    
    broadcastMessage(socket, message) {
        for (let client of this.clients) {
            if (client !== socket) {
                client.write(`${socket.username}: ${message}`);
            }
        }
        this.log.write(`${socket.username}: ${message}\n`);
    }
    
    whisper(socket, targetName, message) {
        if (!targetName) {
            socket.write('You need to specify a user.');
            return;
        }
        if (!message) {
            socket.write('You need to enter a message.');
            return;
        }
        if (targetName === socket.username) {
            socket.write("You really shouldn't talk to yourself like this.");
            return;
        }
        let targetUser = this.findClient(targetName);
        if (!targetUser) {
            socket.write(`User ${targetName} not found.`);
            return;
        }
        targetUser.write(`${socket.username} (whisper): ${message}`);
        this.log.write(`${socket.username} to ${targetUser.username}: ${message}\n`);
    }
    
    changeUsername(socket, newName) {
        if (!newName) {
            socket.write(`You need to specify your new username.`);
            return;
        }
        if (newName === socket.username) {
            socket.write(`That's already your username.`);
            return;
        }
        if (this.findClient(newName)) {
            socket.write(`That name is already in use.`);
            return;
        }
        for (let client of this.clients) {
            if (client !== socket) {
                client.write(`${socket.username} has changed his username to ${newName}.`);
            }
        }
        this.log.write(`${socket.username} has changed his username to ${newName}.\n`);
        socket.username = newName;
        socket.write(`Name change successful.`);
    }
    
    kick(socket, targetName, password) {
        if (!targetName) {
            socket.write('You need to specify a user to kick.');
            return;
        }
        let targetUser = this.findClient(targetName);
        if (!targetUser) {
            socket.write(`User ${targetName} not found.`);
            return;
        }
        if (targetUser === socket) {
            socket.write(`You know, you could always just leave normally.`);
            return;
        }
        if (password !== this.adminPassword) {
            socket.write(`Invalid password.`);
            return;
        }
        targetUser.write(`You have been kicked from the chat room.`);
        this.log.write(`${socket.username} has kicked ${targetUser.username} from the chat room.\n`);
        targetUser.end();
    }
    
    displayClientList(socket) {
        socket.write(`Client List:`);
        for (let client of this.clients) {
            socket.write(`\n\t${client.username}`);
        }
    }
    
    findClient(clientName) {
        for (let client of this.clients) {
            if (client.username === clientName) {
                return client;
            }
        }
        return null;
    }
}

let chatRoom = new ChatRoom();
let chatServer = net.createServer(socket => {
    chatRoom.add(socket);
    socket.on('data', data => {
        let dataString = data.toString().trim();
        if (dataString[0] === '/') {
            let dataArray = dataString.split(' ');
            let command = dataArray.shift();
            switch (command) {
                case '/w':
                    let whisperTarget = dataArray.shift();
                    let whisperMessage = dataArray.join(' ');
                    chatRoom.whisper(socket, whisperTarget, whisperMessage);
                    break;
                case '/username':
                    let newName = dataArray.join(' ');
                    chatRoom.changeUsername(socket, newName);
                    break;
                case '/kick':
                    let kickTarget = dataArray.shift();
                    let password = dataArray.join(' ');
                    chatRoom.kick(socket, kickTarget, password);
                    break;
                case '/clientlist':
                    chatRoom.displayClientList(socket);
                    break;
                default:
                    socket.write('Invalid Command');
            }
        } else {
            chatRoom.broadcastMessage(socket, dataString);
        }
    });
    socket.on('error', err => {
        if (err) console.log(err);
    });
    socket.on('close', err => {
        if (err) console.log(err);
        chatRoom.remove(socket);
    });
});

chatServer.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

