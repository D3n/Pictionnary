
/*
 * GET home page.
 */

exports.index = function(req, res){

    if (req.session.isLogged) {
        // User is authenticated, let him choose the room
        res.redirect('/listRooms');

    } else {
        res.render('index', { title: 'SupGame - Pictionnary Online' });

    }
};

exports.play = function(req, res){

    if (req.session.isLogged && req.app.locals.myRoom(req.session.user.name)) {
        // User is authenticated, let him choose the room
        res.render('game', { title: 'SupGame - Pictionnary Online', usr: req.session.user });

    } else {
        res.redirect('/');

    }
};

exports.listRooms = function(req, res){

    if (req.session.isLogged) {
        // User is authenticated, let him choose the room
        res.render('listRooms', { title: 'SupGame - Pictionnary Online', usr: req.session.user  });

    } else {
        res.redirect('/');
    }


};



