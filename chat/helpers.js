var request = require('request');


module.exports = {
    handle_special: function(data) {
        if (data.message == "/human") {

            //TODO reward
            request({
                url: 'http://turingtest.io/api/reward', //URL to hit
                qs: {
                    user: 'TODO user or session',
                    time: +new Date()
                },
                body: "TODO reward info?"
            });
            return true;
        } else if (data.message == "/machine") {
            //TODO punish
            request({
                url: 'http://turingtest.io/api/punish', //URL to hit
                qs: {
                    user: 'TODO user or session',
                    time: +new Date()
                },
                body: "TODO punishment info?"
            });
            return true;
        }
        return false;
    },
    message: function(person, role, message) {
        return {
            'person': person,
            'role': role,
            'message': message
        };
    },
    get_reply: function(data, callback) {
        request({
            //TODO abstract into a secure settings file?
            url: 'http://turingtest.io/api/conversation', //URL to hit
            qs: {
                user: 'TODO user or session',
                time: +new Date()
            },
            body: data.message
        }, function(error, response, body) {
            if (error) {
                console.log("error in api - didn't connect?: " + error);
                callback("failure", error);
            } else {
                //console.log(response.statusCode, body);
                try {
                    var dat = JSON.parse(body);
                    var role = null;
                    if (data.role == "Inquisitor") {
                        role = "Subject";
                    } else {
                        role = "Inquisitor";
                    }
                    callback("success", module.exports.message('Alan', role, dat["response"]));
                } catch (err) {
                    //TODO smoother error handling
                    callback("failure", err);
                    console.log("Error in api - not JSON: " + err)
                }
            }
        });
    }
};

//http://stackoverflow.com/questions/5797852/in-node-js-how-do-i-include-functions-from-my-other-files
//help from http://blog.modulus.io/node.js-tutorial-how-to-use-request-module
//http://stackoverflow.com/questions/2190850/create-a-custom-callback-in-javascript




