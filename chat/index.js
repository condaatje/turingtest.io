var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var bodyParser = require('body-parser')
var helpers = require('./helpers')


app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.render('index');
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
    "human-human": {}, //TODO how to deal with waiting ppl?
    "human-machine": {},
    "machine-human": {},
};

var users = {
    "user": {
        "room_id": "id",
        "role": "inquisitor"
    }
}

//again, super not ok. quick hack only for balancing matchmaking.
//TODO make a full, clean matchmaker
var inquisitors = 0;
var subjects = 0;


io.on('connection', function(socket) {

    socket.on('Inquisitor', function(data) {

        // console.log(data);
        io.sockets.in(data.room).emit('display_message', helpers.message(data.person, data.role, data.message));

        //this is going to tell the api to update its beliefs
        if (helpers.handle_special(data, io)) {
            //it was a special message, end the game.
            console.log("test");
            io.sockets.in(data.room).emit('display_message', "Bruh I'm not human");
        } else {
            //normal operation with the existing model
            helpers.get_reply(data, function(err, msg) {
                io.sockets.in(data.room).emit('display_message', msg);
            });
        }
    });

    //MARK - this is where we assign people to rooms/roles.
    //kind of a balancer.
    socket.on('request_room', function(room_name) {
        //TODO won't work with person-to-person chat yet.
        //I think the best way to do matchmaking is see if there's anyone else online,
        //and then if there is wait for them to finish their conversation then match up.
        socket.join(room_name);

        if (inquisitors > subjects) {
            io.sockets.in(room_name).emit("assign_" + room_name, {
                role: "Subject",
                room_name: room_name
            });
            subjects++;
        } else {
            io.sockets.in(room_name).emit("assign_" + room_name, {
                role: "Inquisitor",
                room_name: room_name
            });
            inquisitors++;
        }
    });

    socket.on('send message', function(data) {
        console.log('sending room post', data.room);
        socket.broadcast.to(data.room).emit('conversation private post', {
            message: data.message
        });
    });

    //This is really good for unique info etc.
    //console.log(io.sockets.connected)

});








//http://stackoverflow.com/questions/6873607/socket-io-rooms-difference-between-broadcast-to-and-sockets-in
//http://stackoverflow.com/questions/23619015/creating-a-private-chat-between-a-key-using-a-node-js-and-socket-io
//http://stackoverflow.com/questions/30497245/expressjs-error-body-parser-deprecated
//http://stackoverflow.com/questions/14093736/i-cant-get-post-data-when-i-use-express
//http://stackoverflow.com/questions/23595282/error-no-default-engine-was-specified-and-no-extension-was-provided




