/**
 * Created by denis on 21/01/2014.
 */
var mongoose = require('./getMongoose.js').mongoose,

    UserSchema = mongoose.Schema({
        name        : String ,
        password    : String ,
        lang        : String
    }),

    UserModel = mongoose.model('User', UserSchema);

exports.User = UserModel;