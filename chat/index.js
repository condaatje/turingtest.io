var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});


http.listen(3000, function() {
    console.log('listening on *:3000');
});

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });

    socket.on('c', function(msg) {
        console.log(msg);
        io.emit('c', msg);

        var request = require('request');

        //help from http://blog.modulus.io/node.js-tutorial-how-to-use-request-module
        request({
            url: 'http://turingtest.io/model', //URL to hit
            qs: {
                from: 'blog example',
                time: +new Date()
            }, //Query string data
            method: 'POST',
            headers: {
                'Content-Type': 'MyContentType',
                'Custom-Header': 'MyCustomHeader',
            },
            body: 'transcript from the socket server. Here we go.' //Set the body as a string
        }, function(error, response, body) {
            if (error) {
                console.log("error: " + error);
            } else {
                console.log(response.statusCode, body);
                io.emit('c', body);
            }
        });


    });
});
