var express = require('express');
var server = express();
var BinaryServer = require('binaryjs').BinaryServer;
var base64 = require('base64-stream');
var Stream = require('stream');
var redis = require("redis");

//audio
var audioServer = new BinaryServer({server: server, path: '/audio-server', port:4702});
var audioClient = new BinaryServer({server: server, path: '/audio-client', port:4703});

//video
var videoServer = new BinaryServer({server: server, path: '/video-server', port:4705});
var videoClient = new BinaryServer({server: server, path: '/video-client', port:4706});

var audioPublisher = redis.createClient();
var audioSubscriber = redis.createClient();
var videoPublisher = redis.createClient();
var videoSubscriber = redis.createClient();

var SERVER_PORT = 3701;

audioSubscriber.subscribe("audio");
videoSubscriber.subscribe("video");

//GET VIDEO FROM BROWSER AND PUBLISH TO REDIS
videoServer.on('connection', function(client){
  console.log('Binary Server connection started');

  client.on('stream', function(stream, meta) {
    console.log('>>>Incoming Video stream');
    stream.on("data",function(chunk){
      videoPublisher.publish("video",chunk.toString('base64'));
    });

    stream.on('end', function() {
      console.log('||| Video stream ended');
    });
  });
});

//GET VIDEO FROM REDIS AND PUBLISH TO CLIENT BROWSER
videoClient.on('connection', function(client) {
 videoSubscriber.on("message", function(channel, data) {
      var responseStream = client.createStream('fromserver');
      var bufferStream = new Stream();
      bufferStream.pipe(responseStream);
      bufferStream.emit('data',new Buffer(data,'base64'));
    }); 
});


audioServer.on('connection', function(client){
  console.log('Binary Server connection started');

  client.on('stream', function(stream, meta) {
    console.log('>>>Incoming audio stream');
    stream.on("data",function(chunk){
      audioPublisher.publish("audio",chunk.toString('base64'));
    }); 

    stream.on('end', function() {
      console.log('||| Audio stream ended');
    });
  });
}); 

audioClient.on('connection', function(client){
  console.log(">>>Incoming audio client");
  audioSubscriber.on("message", function(channel, data) {
    console.log("data received");

    var send = client.createStream();
    var bufferStream = new Stream();
    bufferStream.pipe(send);
    bufferStream.emit('data',new Buffer(data,'base64'));
    
  }); 

});

server.listen(SERVER_PORT);
