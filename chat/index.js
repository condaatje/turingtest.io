var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});


io.on('connection', function(socket) {
    
    socket.on('inquisitor_chat', function(msg) {
        console.log(msg);
        io.emit('display_message', msg); //make sure the actual message shows up on the screen

        //check if it's a special message
        if (msg == "/human") {
            io.emit('display_message', "Bruh I'm not human");
            //TODO reward
            request({
                url: 'http://turingtest.io/api/reward', //URL to hit
                qs: {
                    user: 'TODO user or session',
                    time: +new Date()
                },
                body: "TODO reward info?"
            });
            
        } else if (msg == "/machine") {
            io.emit('display_message', "OI! You think I'm a machine??");
            //TODO punish
            request({
                url: 'http://turingtest.io/api/punish', //URL to hit
                qs: {
                    user: 'TODO user or session',
                    time: +new Date()
                },
                body: "TODO punishment info?"
            });
        } else {

            //help from http://blog.modulus.io/node.js-tutorial-how-to-use-request-module
            request({
                url: 'http://turingtest.io/api/conversation', //URL to hit
                qs: {
                    user: 'TODO user or session',
                    time: +new Date()
                },
                body: msg
            }, function(error, response, body) {
                if (error) {
                    console.log("error: " + error);
                    io.emit('error', error);
                }
                else {
                    console.log(response.statusCode, body);

                    try {
                        var data = JSON.parse(body);
                        io.emit('display_message', data["response"]);
                    } catch (err) {
                        //TODO smoother error handling
                        io.emit('error', body);
                    }
                }
            });
        }
    });
});






