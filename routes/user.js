
/*
 * GET users listing.
 */

function trim (myString)
{
    return myString.replace(/^\s+/g,'').replace(/\s+$/g,'')
}

var sanitize = require('validator');

exports.adduser = function(req, res){

    var name = sanitize.escape(trim(req.body.signinPseudo)) ;
    var password = trim(req.body.signinPassword);
    var confirmation = trim(req.body.signinConfirmation);
    var lang = req.body.signinLang;

    var User = require('../models/User.js').User;
    var passwordHash = require('password-hash');
    var hashedPassword = passwordHash.generate(password);

    var options = { "username": name, "lang" : lang, "errors": [] };

    // DO VERIFICATIONS
    if(typeof name == "string" && name==""){
        options.errors.push('Vous devez saisir un pseudo.');

    }else if(password=="" || confirmation==""){
        options.errors.push('Vous devez saisir un mot de passe et le confirmer.');

    }else if(password != confirmation){
        options.errors.push('Le mot de passe et la confirmation doivent être les mêmes.');

    }

    // If form ok, check if the pseudo exists
    // Then add the user to the DB and create the session
    // Else redirect with errors
    if(options.errors.length == 0){

        User.findOne({ name: name }, function(err, usr) {
            if (err) {
                return console.error(err);

            }else if(usr){
                options.errors.push('Le pseudo ' + name + ' est déjà utilisé.');
                return res.render('index', { optionsRegister : options } );

            }else{
                // Create the objet user
                var usr = new User({
                    "name" : name,
                    "password" : hashedPassword,
                    "lang" : lang
                });

                usr.save(function(error, user) {
                    if(error){
                        console.log(error);
                    }else{
                        console.log(usr.name + " ajouté !");
                    }
                });

                req.session.isLogged = true;
                req.session.user = usr ;
                res.redirect('/');

            }
        });

    }else{
        res.render('index', { optionsRegister : options });

    }

};


exports.login = function(req, res) {

    var name = trim(req.body.loginPseudo) ;
    var password = trim(req.body.loginPassword) ;

    var User = require('../models/User.js').User;
    var passwordHash = require('password-hash');

    var options = { "username": name, "errors": [] };

    // DO FORM VERIFICATIONS
    if(typeof name != "string" || name==""){
        options.errors.push('Vous devez saisir un pseudo.');

    }else if(typeof password != "string" || password==""){
        options.errors.push('Vous devez saisir un mot de passe.');

    }

    // If form ok, check if the pseudo exists
    // Then test the passwords, create the session and redirect
    // Else redirect with errors
    if(options.errors.length == 0){

        User.findOne({ name: name }, function(err, usr) {
            if (err) {
                return console.error(err);

            }else if(usr){

                if(passwordHash.verify(password, usr.password)) {
                    req.session.isLogged = true;
                    req.session.user = usr ;
                    res.redirect('/');

                }else{
                    options.errors.push('Le mot de passe est incorrect.');
                    return res.render('index', { optionsLogin : options } );

                }

            }else{
                options.errors.push('Ce compte n\'existe pas.');
                res.render('index', { optionsLogin : options } );

            }
        });

    }else{
        res.render('index', options);

    }

}

exports.logout = function(req,res){
    req.session.isLogged = false;
    req.session.destroy();
    res.redirect('/');

}