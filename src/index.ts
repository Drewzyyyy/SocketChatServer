import * as express from "express";
import { createServer } from 'http';
import { Server, Socket } from "socket.io";
// import * as path from "path";

interface ChatData{
  name: string,
  message: string,
}

interface UserData{
  id: string,
  name: string,
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true
});

let userList: UserData[] = [];

httpServer.listen(3000, function() {
    console.log("Socket.IO server running at http://localhost:3000/");
});

io.on('connection', (socket: Socket) => {
  socket.on('message', msg => {
    socket.broadcast.emit('message', msg);
  });

  socket.on('disconnect', () => {
    const disconnectedUserIndex = userList.findIndex(user => user.id === socket.id);
    const response: ChatData = {
      name: '<Server>',
      message:`Goodbye ${userList[disconnectedUserIndex]?.name ?? ''}!`
    };
    userList.splice(disconnectedUserIndex,1);
    socket.broadcast.emit('message',response);
  })

  socket.on('userTyping', (typingUser: string) => {
    socket.broadcast.emit('typingNotice',typingUser);
  })

  socket.on('getOnlineUsers',() => {
    const currentUserIndex = userList.findIndex(user => user.id === socket.id);
    if(currentUserIndex !== -1){
      const currentUser = userList[currentUserIndex];
      userList.splice(currentUserIndex,1);
      userList.unshift(currentUser);
    }
    socket.emit('postOnlineUsers', userList);
  });

  socket.on('getData', () =>{
    const userIndex = userList.findIndex(user => user.id === socket.id);
    const currentUser: UserData = {
      id: socket.id,
      name: userList[userIndex].name,
    };
    socket.emit('postData',currentUser);
  })

  socket.on('getName', name => {
    const currentUser: UserData = {
      id: socket.id,
      name,
    };
    const response: ChatData = {
      name: '<Server>',
      message:`${name} has arrived!`
    };
    
    userList.push(currentUser);
    socket.broadcast.emit('name',response);
    io.emit('postOnlineUsers', userList);
  });

  socket.on('privateMessage', (payload) => {
    let name = userList.find((user) => user.id === socket.id).name;
    let privateMessage: ChatData = {
      name,
      message: payload.msg
    }
    socket.to(payload.recepientId).emit('privateMessage',privateMessage);
  });
});
