var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var bodyParser = require('body-parser')


app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/chat', function(req, res) {
    console.log(req.params)
    res.render('chat');
});

app.post('/chat', function(req, res) {
    var namei = req.body.logalog
    res.locals.name = namei
    
    res.render('chat', {
        name: namei,
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

//TODO I'm sure there's some better way to do this but...we're kinda hacking
//probably with redis
var rooms = {
    "human-human": {},
    "human-machine": {},
    "machine-human": {},
};


io.on('connection', function(socket) {
    
    socket.on('client_chat', function(msg) {
        
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
                body: msg['message']
            }, function(error, response, body) {
                if (error) {
                    console.log("error: " + error);
                    io.emit('error', error);
                }
                else {
                    console.log(response.statusCode, body);

                    try {
                        var data = JSON.parse(body);
                        var item = {
                            'person': 'Alan',
                            'message': data["response"]
                        }
                        io.emit('display_message', item);
                    } catch (err) {
                        //TODO smoother error handling
                        io.emit('error', body);
                    }
                }
            });
        }
    });
    
    
    socket.on('request_room', function(cookie) {
        console.log('joining room', cookie);
        //socket.join(room);
    });

    socket.on('send message', function(data) {
        console.log('sending room post', data.room);
        socket.broadcast.to(data.room).emit('conversation private post', {
            message: data.message
        });
    });
    
});






//http://stackoverflow.com/questions/6873607/socket-io-rooms-difference-between-broadcast-to-and-sockets-in
//http://stackoverflow.com/questions/23619015/creating-a-private-chat-between-a-key-using-a-node-js-and-socket-io
//http://stackoverflow.com/questions/30497245/expressjs-error-body-parser-deprecated
//http://stackoverflow.com/questions/14093736/i-cant-get-post-data-when-i-use-express
//http://stackoverflow.com/questions/23595282/error-no-default-engine-was-specified-and-no-extension-was-provided
