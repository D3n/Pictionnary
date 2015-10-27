/**
 * Created by denis on 22/01/2014.
 */

(function() {

    var socket = io.connect('');

    var form = document.getElementById('formChat');
    var inputMsg = document.getElementById('message');
    var divMsg = document.getElementById('messages');
    var lastmsg = false ;
    var divScores = document.getElementById('divScores');


    form.onsubmit = function() {

        if(inputMsg.value.trim() != ""){
            socket.emit('newmsg', { message : inputMsg.value.trim() });
            inputMsg.value = "";
            inputMsg.focus();
        }
        return false;
    };

    socket.on('newmsg', function(message){
        if(typeof lastmsg == "string" && lastmsg != message.username){
            divMsg.innerHTML += '<hr>';
            lastmsg = message.username;
        }
        if(message.m < 10) {
            var tmp = message.m;
            message.m = "0"+tmp;
        }
        divMsg.innerHTML += '['+message.h+':'+message.m+'] <b>' + message.username + '</b> : ' + message.message + '<br />';

        divMsg.scrollTop = divMsg.scrollHeight;

    });

    socket.on('newusr', function(user){
        divMsg.innerHTML += '<i>' + user.username + ' a rejoint le salon</i><br />';
        divScores.innerHTML += "<span id='score_"+name+"'><b>"+ user.username  +"</b> --> 0 point <br />";
        divMsg.scrollTop = divMsg.scrollHeight;
    });

    socket.on('someoneIsReady', function(data){
        divMsg.innerHTML += '<span class="glyphicon glyphicon-check"></span><b> ' + data.name + ' est prêt a jouer !</b><br />';
        divMsg.scrollTop = divMsg.scrollHeight;
    });

    socket.on('isChoosingTheWord', function(data){
        divMsg.innerHTML += '<span class="glyphicon glyphicon-search"></span><b> ' + data.name + ' choisit le mot...</b><br />';
        divMsg.scrollTop = divMsg.scrollHeight;
    });

    socket.on('someoneIsDrawing', function(data){
        divMsg.innerHTML += '<span class="glyphicon glyphicon-pencil"></span><b> ' + data.name + ' est en train de dessiner !</b><br />';
        divMsg.scrollTop = divMsg.scrollHeight;
    });

    socket.on('wordGuessed', function(data){
        divMsg.innerHTML += '<span class="glyphicon glyphicon-thumbs-up"></span><b> ' + data.name + ' a trouvé le mot en '+ (60 - data.secondes) +' secondes !</b><br />';
        divMsg.scrollTop = divMsg.scrollHeight;
    });

    socket.on('disusr', function(user){
        divMsg.innerHTML += '<i>' + user.username + ' a quitté le salon</i><br />';
        divMsg.scrollTop = divMsg.scrollHeight;
    });

    socket.on('timesUp', function(data){
        divMsg.innerHTML += '<span class="glyphicon glyphicon-thumbs-down"></span><i>Temps écoulé ! Le mot était : <b>' + data.word + '</b></i><br />';
        divMsg.scrollTop = divMsg.scrollHeight;
    });

    socket.on('gameFinished', function(data){
        divMsg.innerHTML += '<span class="glyphicon glyphicon-ok"></span><b> ' + data.name + ' a gagné la partie !</b><br />';
        divMsg.scrollTop = divMsg.scrollHeight;
    });

})();


