/**
 * Created by denis on 21/01/2014.
 */

var mongoose = require ('mongoose');

/*
var db = mongoose.connection;
db.on('error', console.error); */

var uristring =
    process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        'mongodb://localhost/pictionary';

//mongoose.connect('localhost','pictionnary');

mongoose.connect(uristring, function (err, res) {
    if (err) {
        console.log ('ERROR connecting to: ' + uristring + '. ' + err);
    } else {
        console.log ('Succeeded connected to: ' + uristring);
    }
});

exports.mongoose = mongoose;