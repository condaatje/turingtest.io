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

//for now we don't need any of the special stuff, just handle each person as independent
app.get('/', function(req, res) {
    //res.locals.name = req.body.username;
    res.render('index', {
        //name: req.body.username,
    });
});

// Start server
http.listen(3000, function() {
    console.log('listening on *:3000');
});

// TODO I'm sure there's some better way to do this but...we're kinda hacking 
// (and it's not essential for the final project scope). May eventually do w redis?
var queue = []; // Unshift and pop for queue. TODO abstract.

//For now we're just doing man-machine interactions.
io.on('connection', function(socket) {

    socket.on('Inquisitor', function(data) {
        //this is going to tell the api to update its beliefs
        if (model.handle_guess(data)) {
            // it was a special message, end the game.

            console.log("Handling user guess");
            if (data.eavesdropping == true && data.message == "/human") {
                io.sockets.in(data.room).emit('end_game', "The Inquisitor has correctly guessed that the Subject is human!");
            } else if (data.eavesdropping == true && data.message == "/machine") {
                io.sockets.in(data.room).emit('end_game', "The Inquisitor has incorrectly guessed that the Subject is a machine!");
            } else if (data.eavesdropping == false && data.message == "/human") {
                io.sockets.in(data.room).emit('end_game', "The Inquisitor has incorrectly guessed that the Subject is human!");
            } else if (data.eavesdropping == false && data.message == "/machine") { //This doesn't happen just yet. Machine-machine interaction.
                io.sockets.in(data.room).emit('end_game', "The Inquisitor has correctly guessed that the Subject is a machine!");
            }
        } else if (data.eavesdropping == false) {
            // we need a response from Alan, it's a human - machine interaction
            // normal operation with the existing model
            data.transcript.unshift(data.message); //prepend


            io.sockets.in(data.room).emit('display_message', model.message(data.person, data.role, data.message, data.transcript, data.eavesdropping));
            model.get_reply(data, function(status, msg) { //msg is straight response text
                if (status == "success") {
                    setTimeout(function() {
                        data.transcript.unshift(msg);
                        model.reward(data); // positive survival delta.
                        var response = model.message("Alan", "Subject", msg, data.transcript, data.eavesdropping);
                        io.sockets.in(data.room).emit('display_message', response);
                    }, Math.floor(Math.random() * 9000) + 1000); // wait between 1 and 10 seconds
                } else {
                    console.log("Error in getting reply: " + status + msg);
                }
            });
        } else {
            data.transcript.unshift(data.message); //prepend
            io.sockets.in(data.room).emit('display_message', model.message(data.person, data.role, data.message, data.transcript, data.eavesdropping));
        }
    });


    socket.on('Subject', function(data) {
        data.transcript.unshift(data.message); //prepend
        io.sockets.in(data.room).emit('display_message', model.message(data.person, data.role, data.message, data.transcript, data.eavesdropping));
        model.reward(data); //positive survival delta. Double when humans talking.

        if (data.eavesdropping == false) {
            // we need a response from Alan, it's a human - machine interaction
            model.get_question(data, function(status, msg) {
                //callback when we get the message back

                if (status == "success") {
                    data.transcript.unshift(msg);
                    var response = model.message("Alan", "Inquisitor", msg, data.transcript, data.eavesdropping);

                    setTimeout(function() {
                        io.sockets.in(data.room).emit('display_message', response);
                        if (model.handle_model_termination(msg)) {
                            io.sockets.in(data.room).emit('end_game', "Congrats! You convinced your inquisitor that you are Human!");
                        }
                    }, Math.floor(Math.random() * 9000) + 1000); // TODO abstract, possibly make part of the vector.
                } else {
                    console.log("Error came from the api: " + status + msg);
                }
            });
        } else {

        }

    });

    //MARK - this is where we assign people to rooms/roles. Matchmaking.
    socket.on('request_room', function(username) {
        // If I come in and there's someone waiting, we'll link up.
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
        } else {
            // If there's nobody in the queue, join the queue and start my waiting period.

            // host my room
            socket.join(username); // TODO rooms not based on username. (not essential for final project scope)
            queue.unshift(username);

            setTimeout(function() {
                // wait to see if we get paired with a human.
                // on expiry: remove myself from the queue - the waiting period is up. Just gonna talk to a robot.
                // TODO test with race conditions. Consider using dictionary-based structure to avoid issues.
                var index = queue.indexOf(username);

                if (index <= -1) {
                    // We've been paired with a human! Don't have to do anything.
                } else {
                    queue.splice(index, 1);
                    // start robo convo.

                    var role = "Inquisitor";
                    if (Math.random() >= 0.7) {
                        // less likely for now. TODO abstract
                        role = "Subject";
                    }
                    if (role == "Subject") {
                        // Set up room with human subject

                        io.sockets.in(username).emit("assign_" + username, {
                            role: "Subject",
                            room_name: username,
                            eavesdropping: false,
                        });

                        var data = {
                            'person': username,
                            'role': "Subject",
                            'message': "INITIALIZE", //TODO I guess this works but should be cleaner.
                            'room': username,
                            'transcript': ["INITIALIZE"],
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
                        // Set up room with human Inquisitor
                        io.sockets.in(username).emit("assign_" + username, {
                            role: "Inquisitor",
                            room_name: username,
                            eavesdropping: false,
                        });
                    }
                }

            }, Math.floor(Math.random() * 9000) + 1000); // TODO abstract boundaries
        }
    });

    //console.log(io.sockets.connected) // TODO good for user count
});
