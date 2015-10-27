
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var MongoStore = require('connect-mongo')(express);
var app = express();
var sanitize = require('validator');

// Configure Session Db
var conf = {
    db: {
        db: 'sessions',
        host: 'localhost',
        port: '27017'
    },
    secret: '!YouAreNotPrepared=1',
    key: 'express.sid'
};

var uristring =
    process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        'mongodb://localhost:27017/sessions';

var mongoSession = new MongoStore({
    url : uristring,
    auto_reconnect: true
});
var cookieParser = express.cookieParser(conf.secret);


// all environments
app.set('port', process.env.PORT || 5000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
    store: mongoSession,
    secret: conf.secret,
    maxAge: new Date(Date.now() + 3600000),
    key: conf.key
}));
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Create the HTTP server
var server = http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

// Socket IO
var io = require('socket.io').listen(server);


// We configure the socket.io authorization handler (handshake)
io.set('authorization', function (data, callback) {
    if(!data.headers.cookie) {
        return callback('No cookie transmitted.', false);
    }

    // We use the Express cookieParser created before to parse the cookie
    // Express cookieParser(req, res, next) is used initialy to parse data in "req.headers.cookie".
    // Here our cookies are stored in "data.headers.cookie", so we just pass "data" to the first argument of function
    cookieParser(data, {}, function(parseErr) {
        if(parseErr) { return callback('Error parsing cookies.', false); }

        // Get the SID cookie
        var sidCookie = (data.secureCookies && data.secureCookies[conf.key]) ||
            (data.signedCookies && data.signedCookies[conf.key]) ||
            (data.cookies && data.cookies[conf.key]);

        // Then we just need to load the session from the Express Session Store
        mongoSession.get(sidCookie, function(err, session) {
            // And last, we check if the used has a valid session and if he is logged in
            if (err || !session || session.isLogged !== true) {
                callback('Not logged in.', false);
            } else {
                // If you want, you can attach the session to the handshake data, so you can use it again later
                data.session = session;

                callback(null, true);
            }
        });
    });
});

// Store every room created and the current amount of room
app.locals.rooms = {};


// Routes GET
app.get('/', routes.index);
app.get('/listRooms', routes.listRooms);
app.get('/room', routes.index);
app.get('/play', routes.play);
app.get('/logout', user.logout);

// Routes POST
app.post('/login', user.login);
app.post('/addUser', user.adduser);


// --------------------------- SOCKET.IO CONNECTIONS -------------------
io.sockets.on('connection', function(socket) {

    var hs = socket.handshake;
    var me = {
        username: hs.session.user.name,
        lang: hs.session.user.lang
    };

    // -------------------- ROOMS -----------------

    socket.on('listRooms', function(){
        socket.emit('listRooms', { rooms : listOfRooms(me.lang) });
    });

    socket.on('newRoom', function(room){
        room.nameRoom = sanitize.escape(room.nameRoom);

        if(app.locals.rooms[room.nameRoom+"_"+me.lang] == undefined){

            app.locals.rooms[room.nameRoom+"_"+me.lang] = {
                name : room.nameRoom,
                lang : me.lang,
                nbPlayers : 0,
                started: false,
                wordToGuess: false,
                listPlayers : {}
            }

            socket.emit('nbRooms', { nb : nbRooms(me.lang) });
            io.sockets.emit('newRoom', { name : room.nameRoom , langRoom: me.lang });
            socket.emit('roomCreated', { name : room.nameRoom });

        }else{
            socket.emit('roomExists', { name : room.nameRoom });
        }
    });

    socket.on('nbRooms', function(){
        socket.emit('nbRooms', { nb : nbRooms(me.lang), langUser: me.lang });
    });

    socket.on('wannaJoin', function(data){
        var indexRoom = data.indexRoom;
        var nameRoom = data.nameRoom;

        // If the player isnt already in a room
        if(app.locals.myRoom(me.username,'index') == false){
            socket.emit('youCanEnterTheRoom');

            app.locals.rooms[indexRoom].listPlayers[me.username] = {
                username : me.username,
                score : 0,
                ready: false
            }

            app.locals.rooms[indexRoom].nbPlayers++;
            io.sockets.emit('playersUpdate', {
                room : app.locals.rooms[indexRoom]
            });
        }else{
            socket.emit('alreadyInRoom');
        }

    });

    socket.on('leaveRoom', function(){

        if(app.locals.rooms[app.locals.myRoom(me.username,'index')] != undefined)
        {
            // We have to delete the room from the list
            // And the association between the user and the room
            var indexRoomLeaved = app.locals.myRoom(me.username,'index');
            var nameRoomLeaved = app.locals.myRoom(me.username,'name');
            var langRoom = app.locals.rooms[indexRoomLeaved].lang;

            delete app.locals.rooms[indexRoomLeaved] ;

            // Delete the room of every client list
            io.sockets.emit('roomDeleted', { roomName: nameRoomLeaved, langRoom: langRoom });

            socket.broadcast.emit('nbRooms', { nb : nbRooms(me.lang) });

            // Force same players of the room to leave
            io.sockets.in(indexRoomLeaved).emit('disusr', me);
            socket.broadcast.to(indexRoomLeaved).emit('roomClosed');

        }
    });

    socket.on('imNewInThisRoom', function(){

        var indexRoom = app.locals.myRoom(me.username,'index');
        /*
        if(app.locals.rooms[indexRoom].listPlayers[me.username].username === me.username ){

            socket.emit('alreadyPlaying');

        }else */
        if(app.locals.rooms[indexRoom] != undefined ) {

            socket.join(indexRoom);

            app.locals.rooms[indexRoom].listPlayers[me.username].socketID =  socket.id ;

            socket.broadcast.to(indexRoom).emit('newusr', me);
            socket.emit('imNewInThisRoom', {
                nameRoom: app.locals.myRoom(me.username,'name'),
                listPlayers: listOfPlayers(indexRoom)
            });

        }else{
            // Else tell the client its closed to redirect him
            socket.emit('roomClosed');
        }
    });


    // -------------------- CHAT  --------------------

    socket.on('newmsg', function(message){

        var indexRoom = app.locals.myRoom(me.username,'index');

        message.message = sanitize.escape(message.message);
        message.username = me.username;
        date = new Date();
        message.h = date.getHours();
        message.m = date.getMinutes();

        io.sockets.in(indexRoom).emit('newmsg', message);

        if(message.message.toLowerCase() === app.locals.rooms[indexRoom].wordToGuess){

            var userWhoWasPainting = app.locals.rooms[indexRoom].whoIsPainting ;

            if(me.username != userWhoWasPainting){
                app.locals.rooms[indexRoom].wordToGuess = false;
                clearInterval(app.locals.rooms[indexRoom].timer);
                listOfPlayers(indexRoom)[me.username].score++;
                if(listOfPlayers(indexRoom)[me.username].score == 10){
                    io.sockets.in(indexRoom).emit('gameFinished', { name: me.username , listPlayers: listOfPlayers(indexRoom)});
                }else{
                    var secondes = app.locals.rooms[indexRoom].secondes ;
                    io.sockets.in(indexRoom).emit('wordGuessed', { name: me.username, listPlayers: listOfPlayers(indexRoom), secondes: secondes });
                    io.sockets.socket(nextPlayer(userWhoWasPainting, indexRoom).socketID).emit('chooseTheWord');
                    io.sockets.in(indexRoom).emit('isChoosingTheWord', {name: nextPlayer(userWhoWasPainting, indexRoom).username});
                }
            }
        }
    });

    socket.on('disconnect', function(){
        //delete app.locals.rooms[data.nameRoom] ="";
        //delete app.locals.usersAndRooms[hs.session.user.name];

    });


    // -------------------- BROADCAST THE SKETCH --------------------


    socket.on('paintingON', function(data){
        socket.broadcast.to(app.locals.myRoom(me.username,'index')).emit('paintingON', data);
    });

    socket.on('paintingOFF', function(data){
        socket.broadcast.to(app.locals.myRoom(me.username,'index')).emit('paintingOFF', data);
    });

    socket.on('clear', function() {
        socket.broadcast.to(app.locals.myRoom(me.username,'index')).emit('clear');
    })


    // ------------------ THE GAME SYSTEM --------------------

    socket.on('imReadyToPlay', function(){
        var indexRoom = app.locals.myRoom(me.username,'index');

        app.locals.rooms[indexRoom].listPlayers[me.username].ready = true;
        io.sockets.in(indexRoom).emit('someoneIsReady', { name:me.username });

        // check if others are ready, if yes, tell the first player he can draw
        if(areOthersPlayersReady(indexRoom)){
            if(app.locals.rooms[indexRoom].nbPlayers >= 2){
                app.locals.rooms[indexRoom].started = true;
                io.sockets.emit('roomStarted', { room: app.locals.rooms[indexRoom] });
                io.sockets.socket(nextPlayer(false, indexRoom).socketID).emit('chooseTheWord');
                io.sockets.in(indexRoom).emit('isChoosingTheWord', {name: nextPlayer(false, indexRoom).username});
                io.sockets.in(indexRoom).emit('gameBegins');
            }
        }
    });

    socket.on('chooseTheWord', function(data){
        var indexRoom = app.locals.myRoom(me.username,'index');

        // Save the word to guess in the room
        app.locals.rooms[indexRoom].wordToGuess = data.word.toLowerCase();
        app.locals.rooms[indexRoom].whoIsPainting = me.username ;
        socket.emit('yourTurnToDraw');

    });

    socket.on('imDrawing', function(){
        var indexRoom = app.locals.myRoom(me.username,'index');
        var word = app.locals.rooms[indexRoom].wordToGuess ;
        var userWhoWasPainting = app.locals.rooms[indexRoom].whoIsPainting ;
        var secondes = 60;

        io.sockets.in(indexRoom).emit('someoneIsDrawing', {name: me.username, secondes: secondes});

        app.locals.rooms[indexRoom].secondes = secondes ;
        app.locals.rooms[indexRoom].timer = setInterval(function(){timer(indexRoom, word, userWhoWasPainting)}, 1000);

    });

    function timer(indexRoom, word, userWhoWasPainting) {

        if(app.locals.rooms[indexRoom].secondes > 0) {
            app.locals.rooms[indexRoom].secondes--;
            io.sockets.in(indexRoom).emit('secondes', { secondes : app.locals.rooms[indexRoom].secondes});
        }

        if(app.locals.rooms[indexRoom].secondes==0){
            clearInterval(app.locals.rooms[indexRoom].timer);
            app.locals.rooms[indexRoom].wordToGuess = false;
            io.sockets.in(indexRoom).emit('timesUp', {word: word});
            io.sockets.socket(nextPlayer(userWhoWasPainting, indexRoom).socketID).emit('chooseTheWord');
            io.sockets.in(indexRoom).emit('isChoosingTheWord', {name: nextPlayer(userWhoWasPainting, indexRoom).username});

        }

    }

});


// ----------------------  Functions   ------------------

// Return the name of user's room
// Saved in APP.LOCALS caus' it needs to be used in routes files
app.locals.myRoom = function(username, type){

    if(Object.keys(app.locals.rooms).length !== 0){
        // LOOP among the rooms
        for (var key1 in app.locals.rooms) {
            if (app.locals.rooms.hasOwnProperty(key1)) {
                if(Object.keys(app.locals.rooms[key1].listPlayers).length !== 0){

                    // LOOP among the players
                    for (var key2 in app.locals.rooms[key1].listPlayers) {
                        if (app.locals.rooms[key1].listPlayers.hasOwnProperty(key2)) {

                            var name = app.locals.rooms[key1].listPlayers[key2].username;
                            var roomName = app.locals.rooms[key1].name;

                            // If the player is the same as the one in session connected
                            if(name == username){
                                // If i want the name of the room or the index
                                if(type=='name'){
                                    return roomName;
                                }else{
                                    return key1;
                                }

                            }
                        }
                    }

                }
            }
        }
    }
    return false;
}

// Return the number or rooms in the lang of the user
function nbRooms(lang){
    var n = 0;

    if(Object.keys(app.locals.rooms).length !== 0){
        for (var key in app.locals.rooms) {
            if (app.locals.rooms.hasOwnProperty(key)) {
                if(app.locals.rooms[key].lang == lang){
                    n++;
                }
            }
        }
    }
    return n;
}

// Return the number of players of a particular room
function listOfPlayers(indexRoom){
    return app.locals.rooms[indexRoom].listPlayers;
}

// Return only the list of rooms in the language of the user
function listOfRooms(lang){
    var list = {};

    if(Object.keys(app.locals.rooms).length !== 0){
        for (var key in app.locals.rooms) {
            if (app.locals.rooms.hasOwnProperty(key)) {
                if(app.locals.rooms[key].lang == lang){
                    list[key] = app.locals.rooms[key] ;
                }
            }
        }
    }
    return list;
}


// Return true if all the players are ready to play
function areOthersPlayersReady(indexRoom) {

    var listPlayers = listOfPlayers(indexRoom);

    if(Object.keys(listPlayers).length !== 0){
        for (var key in listPlayers) {
            if (listPlayers.hasOwnProperty(key)) {
                if(listPlayers[key].ready === false){
                    return false ;
                }
            }
        }
        return true;
    }
    return false;
}

// Return the socketID of the player whose turn to play
function nextPlayer(lastPlayer, indexRoom){

    var player = {};

    var listPlayers = listOfPlayers(indexRoom);
    var keysPlayers = Object.keys(listPlayers); // Tab of key players

    if(!lastPlayer){
        // If the game just begins, the first player in the room begins to play
        player.socketID =  listPlayers[keysPlayers[0]].socketID;
        player.username = listPlayers[keysPlayers[0]].username;

    }else{
        var lengthKeys = keysPlayers.length ;
        var indexLastPlayer = keysPlayers.indexOf(lastPlayer);
        var indexNextPlayer = indexLastPlayer + 1;

        // If the lastPlayer was the last of the list, the next player is the first of the list
        if(indexNextPlayer >= lengthKeys){
            player.socketID = listPlayers[keysPlayers[0]].socketID;
            player.username = listPlayers[keysPlayers[0]].username;

        }else{
            // Otherwise return next player of the list
            player.socketID = listPlayers[keysPlayers[indexNextPlayer]].socketID;
            player.username = listPlayers[keysPlayers[indexNextPlayer]].username;
        }
    }

    return player;
}


