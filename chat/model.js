var request = require('request');


module.exports = {
    handle_special: function(data) {
        if (data.message == "/human") {
            module.exports.reward(data);
            return true;
        } else if (data.message == "/machine") {
            module.exports.punish(data);
            return true;
        }
        return false;
    },
    
    message: function(person, role, message, transcript) {
        return {
            'person': person,
            'role': role,
            'message': message,
            'transcript': transcript
        };
    },
    
    get_reply: function(data, callback) {
        request({
            //TODO abstract into a secure settings file?
            url: 'http://turingtest.io/api/response', //URL to hit
            qs: {
                user: 'TODO user or session',
                time: +new Date(),
            },
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
            //TODO abstract into a secure settings file?
            url: 'http://turingtest.io/api/question', //URL to hit
            qs: {
                user: 'TODO user or session',
                time: +new Date()
            },
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
                    console.log("Error in api - not JSON: " + err);
                }
            }
        });
    },
    
    reward: function(data) {
        request({
            url: 'http://turingtest.io/api/reward', //URL to hit
            qs: {
                user: 'TODO user or session',
                time: +new Date()
            },
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
            qs: {
                user: 'TODO user or session',
                time: +new Date()
            },
            body: JSON.stringify(data.transcript)
        }, function(error, response, body) {
            if (error) {
                console.log("error in punish api - didn't connect?: " + error);
            }
        });
    }
};

//http://stackoverflow.com/questions/5797852/in-node-js-how-do-i-include-functions-from-my-other-files
//help from http://blog.modulus.io/node.js-tutorial-how-to-use-request-module
//http://stackoverflow.com/questions/2190850/create-a-custom-callback-in-javascript




