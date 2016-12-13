var request = require('request');

// These are all mainly API calls.
// This is basically the controller-side interface w/ the Model
module.exports = {
    //TODO abstract URLs and Strings into a secure settings file?
    handle_guess: function(data) {
        if (data.message == "/human") {
            module.exports.reward(data);
            return true;
        } else if (data.message == "/machine") {
            module.exports.punish(data);
            return true;
        }
        return false;
    },
    
    handle_model_termination: function(msg) {
        if (msg == "/human") {
            return true;
        } else if (msg == "/machine") {
            return true;
        }
        return false;
    },
    
    message: function(person, role, message, transcript, eavesdropping) {
        return {
            'person': person,
            'role': role,
            'message': message,
            'transcript': transcript,
            'eavesdropping': eavesdropping
        };
    },
    
    get_reply: function(data, callback) {
        request({
            url: 'http://turingtest.io/api/response', //URL to hit
            body: JSON.stringify(data.transcript)
        }, function(error, response, body) {
            if (error) {callback("failure", error);}
            else {
                //console.log(response.statusCode, body);
                try {
                    var dat = JSON.parse(body);
                    callback("success", dat["response"]);
                } catch (err) {callback("failure", err);}
            }
        });
    },
    
    get_question: function(data, callback) {
        request({
            url: 'http://turingtest.io/api/question', //URL to hit
            body: JSON.stringify(data.transcript)
        }, function(error, response, body) {
            if (error) {
                console.log("error in api - didn't connect?: " + error);
                callback("failure", error);
            } else {
                //console.log(response.statusCode, body);
                try {
                    var dat = JSON.parse(body);
                    callback("success", dat["response"]);
                } catch (err) {
                    //TODO smoother error handling
                    callback("failure", err);
                    console.log("Error in question api - not JSON: " + err);
                }
            }
        });
    },
    
    reward: function(data) {
        request({
            url: 'http://turingtest.io/api/reward', //URL to hit
            body: JSON.stringify(data.transcript)
        }, function(error, response, body) {
            if (error) {
                console.log("error in reward api - didn't connect?: " + error);
            }
        });
    },
    
    punish: function(data) {
        request({
            url: 'http://turingtest.io/api/punish',
            body: JSON.stringify(data.transcript)
        }, function(error, response, body) {
            if (error) {
                console.log("error in punish api - didn't connect?: " + error);
            }
        });
    },
    
    delete: function(data) {
        request({
            url: 'http://turingtest.io/api/delete',
            body: JSON.stringify(data.transcript)
        }, function(error, response, body) {
            if (error) {
                console.log("error in delete api - didn't connect?: " + error);
            }
        });
    }
};
