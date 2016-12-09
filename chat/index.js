var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var bodyParser = require('body-parser');
var model = require('./model');


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
    var namei = req.body.logalog;
    res.locals.name = namei;

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
};

//again, super not ok. quick hack only for balancing matchmaking.
//TODO make a full, clean matchmaker
var inquisitors = 0;
var subjects = 0;


//For now we're just doing man-machine interactions.
io.on('connection', function(socket) {

    socket.on('Inquisitor', function(data) {
        data.transcript.unshift(data.message);
        io.sockets.in(data.room).emit('display_message', model.message(data.person, data.role, data.message, data.transcript));

        //this is going to tell the api to update its beliefs
        if (model.handle_special(data, io)) {
            //it was a special message, end the game.
            console.log("Handling special");
            io.sockets.in(data.room).emit('end_game', "Your opponent was TODO (man or machine)");
        } else {
            //normal operation with the existing model
            model.get_reply(data, function(status, msg) {//msg is straight response text
                if (status == "success") {
                    data.transcript.unshift(msg);
                    var response = model.message("Alan", "Subject", msg, data.transcript);
                    io.sockets.in(data.room).emit('display_message', response);
                } else {
                    console.log("Error in getting reply: " + status + msg);
                }
            });
        }
    });


    socket.on('Subject', function(data) {
        data.transcript.unshift(data.message);
        io.sockets.in(data.room).emit('display_message', model.message(data.person, data.role, data.message, data.transcript));

        //this is going to tell the api to update its beliefs
        //TODO how do we want Alan to terminate the game?
        //For now we should have like 5 questions per session?
        //Then just have it say that he guessed you were a human
        //(which will always be right for now)
        model.reward(data);

        model.get_question(data, function(status, msg) {
            if (status == "success") {
                data.transcript.unshift(msg);
                var response = model.message("Alan", "Inquisitor", msg, data.transcript);
                io.sockets.in(data.room).emit('display_message', response);
            } else {
                console.log("Error came from the api: " + status + msg);
            }
        });
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

            var data = {
                'person': room_name,
                'role': "Subject",
                'message': "INITIALIZE", //TODO I guess this works?
                'room': room_name, 
                'transcript': []
            };

            // As the inquisitor, Alan should start the conversation
            model.get_question(data, function(status, msg) {
                if (status == "success") {
                    data.transcript.unshift(msg);
                    var response = model.message("Alan", "Inquisitor", msg, data.transcript);
                    io.sockets.in(data.room).emit('display_message', response);
                } else {
                    console.log("Error came from the api: " + status + msg);
                }
            });

        } else {
            io.sockets.in(room_name).emit("assign_" + room_name, {
                role: "Inquisitor",
                room_name: room_name
            });
            inquisitors++;
        }
    });



    //This is really good for unique info etc.
    //console.log(io.sockets.connected)

});






//http://stackoverflow.com/questions/6873607/socket-io-rooms-difference-between-broadcast-to-and-sockets-in
//http://stackoverflow.com/questions/23619015/creating-a-private-chat-between-a-key-using-a-node-js-and-socket-io
//http://stackoverflow.com/questions/30497245/expressjs-error-body-parser-deprecated
//http://stackoverflow.com/questions/14093736/i-cant-get-post-data-when-i-use-express
//http://stackoverflow.com/questions/23595282/error-no-default-engine-was-specified-and-no-extension-was-provided
