var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
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
    res.locals.name = req.body.username;
    res.render('chat', {
        name: req.body.username,
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

//TODO I'm sure there's some better way to do this but...we're kinda hacking
var queue = []; //Unshift and pop for queue. TODO abstract.

//again, super not ok. quick hack only for balancing matchmaking.
//TODO make a full, clean matchmaker
var inquisitors = 0;
var subjects = 0;


//For now we're just doing man-machine interactions.
io.on('connection', function(socket) {

    socket.on('Inquisitor', function(data) {
        data.transcript.unshift(data.message); //prepend
        io.sockets.in(data.room).emit('display_message', model.message(data.person, data.role, data.message, data.transcript, data.eavesdropping));

        //this is going to tell the api to update its beliefs
        if (model.handle_guess(data)) {
            // it was a special message, end the game.
            // some of this could be abstracted, 
            // but it is kind of that frontend logic layer that doesn't belong in the model
            
            console.log("Handling user guess");
            if (data.eavesdropping == true && data.message == "/human") {
                io.sockets.in(data.room).emit('end_game', "The Inquisitor has correctly guessed that the Subject is human!");
            }
            else if (data.eavesdropping == true && data.message == "/machine") {
                io.sockets.in(data.room).emit('end_game', "The Inquisitor has incorrectly guessed that the Subject is a machine!");
            }
            else if (data.eavesdropping == false && data.message == "/human") {
                io.sockets.in(data.room).emit('end_game', "The Inquisitor has incorrectly guessed that the Subject is human!");
            }
            else if (data.eavesdropping == false && data.message == "/machine") {//This doesn't happen just yet. Machine-machine interaction.
                io.sockets.in(data.room).emit('end_game', "The Inquisitor has correctly guessed that the Subject is a machine!");
            }
        } 
        else if (data.eavesdropping == false) {// we need a response from Alan, it's a human - machine interaction
            //normal operation with the existing model
            model.get_reply(data, function(status, msg) { //msg is straight response text
                if (status == "success") {
                    data.transcript.unshift(msg);
                    var response = model.message("Alan", "Subject", msg, data.transcript, data.eavesdropping);
                    io.sockets.in(data.room).emit('display_message', response);
                } else {
                    console.log("Error in getting reply: " + status + msg);
                }
            });
        }
    });


    socket.on('Subject', function(data) {
        data.transcript.unshift(data.message); //prepend
        io.sockets.in(data.room).emit('display_message', model.message(data.person, data.role, data.message, data.transcript, data.eavesdropping));

        //this is going to tell the api to update its beliefs
        //TODO how do we want Alan to terminate the game?
        //For now we should have like 5 questions per session?
        //Then just have it say that he guessed you were a human
        //(which will always be right for now)
        model.reward(data);

        
        if (data.eavesdropping == false) {// we need a response from Alan, it's a human - machine interaction
            model.get_question(data, function(status, msg) {
                if (status == "success") {
                    data.transcript.unshift(msg);
                    var response = model.message("Alan", "Inquisitor", msg, data.transcript, data.eavesdropping);
                    io.sockets.in(data.room).emit('display_message', response);
                    if (model.handle_model_termination(msg)) {
                        io.sockets.in(data.room).emit('end_game', "Congrats! You convinced your inquisitor that you are Human!");
                    }
                } else {
                    console.log("Error came from the api: " + status + msg);
                }
            });
        }
    });

    //MARK - this is where we assign people to rooms/roles.
    //kind of a balancer.
    socket.on('request_room', function(username) {
        console.log("room requested");
        // if I come in and there's someone waiting, we'll link up.
        // Trying to get around race conditions with this.
        if (queue.length >= 1) {
            var room = queue.pop();
            socket.join(room);
            console.log("Matchmaking " + username + " with " + room);
            
            //assign the person that just joined
            io.sockets.in(room).emit("assign_" + username, {
                role: "Subject",
                room_name: room,
                eavesdropping: true,
            });

            //assign the person that was waiting
            io.sockets.in(room).emit("assign_" + room, {
                role: "Inquisitor",
                room_name: room,
                eavesdropping: true,
            });
        } else { //Otherwise, start my waiting period.
            socket.join(username); // host my room
            
            // add myself to the queue
            queue.unshift(username);
            console.log(queue);
            setTimeout(function() { //wait to see if we get selected/paired with a human.
                console.log("timeout function");
                // on expiry:
                // remove myself from the queue - the waiting period is up. Just gonna talk to a robot.
                var index = queue.indexOf(username); //TODO this is probably subject to race conditions
                if (index <= -1) { //We've been selected! don't have to do anything.
                    console.log("selected!");
                } else {
                    queue.splice(index, 1);
                    // start robo convo.
                    if (inquisitors > subjects) {
                        io.sockets.in(username).emit("assign_" + username, {
                            role: "Subject",
                            room_name: username,
                            eavesdropping: false,
                        });
                        subjects++;

                        var data = {
                            'person': username,
                            'role': "Subject",
                            'message': "INITIALIZE", //TODO I guess this works?
                            'room': username,
                            'transcript': [],
                            'eavesdropping': false,
                        };

                        // As the inquisitor, Alan should start the conversation
                        model.get_question(data, function(status, msg) {
                            if (status == "success") {
                                data.transcript.unshift(msg);
                                if (model.handle_model_termination(msg)) {
                                    io.sockets.in(data.room).emit('end_game', "TODO Alan is out of questions");
                                } else {
                                    var response = model.message("Alan", "Inquisitor", msg, data.transcript, data.eavesdropping);
                                    io.sockets.in(data.room).emit('display_message', response);
                                }
                            } else {
                                console.log("Error came from the api: " + status + msg);
                            }
                        });

                    } else {
                        io.sockets.in(username).emit("assign_" + username, {
                            role: "Inquisitor",
                            room_name: username,
                            eavesdropping: false,
                        });
                        inquisitors++;
                    }
                }

            }, 3000);
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
//http://stackoverflow.com/questions/5767325/how-to-remove-a-particular-element-from-an-array-in-javascript
