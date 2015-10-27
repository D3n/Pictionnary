/**
 * Created by denis on 22/01/2014.
 */

(function() {

    // Vars
    var socket = io.connect('');

    var color = "#000";
    var painting = false;
    var started = false;
    var width_brush = 5;
    var canvas = document.getElementById('paint');
    var cursorX, cursorY;
    var inputPencil = document.getElementById('pencil');
    var inputEraser = document.getElementById('eraser');
    var btnClear = document.getElementById('clear');
    var titleRoom = document.getElementById('titleRoom');
    var divScores = document.getElementById('divScores');
    var divTools = document.getElementById('divTools');
    var btnReady = document.getElementById('ready');
    var divBelowScores = document.getElementById('divBelowScores');
    var colorSaved = false ;
    var context = canvas.getContext('2d');
    var rect = canvas.getBoundingClientRect();

    var formWord = document.getElementById('formWord');
    var inputWord = document.getElementById('inputWord');
    var divChooseWord = document.getElementById('divChooseWord');

    context.lineJoin = 'round';
    context.lineCap = 'round';

    socket.emit('imNewInThisRoom', function(){
        socket.on('alreadyPlaying', function(){
            window.location.href = '/listRooms';
        })
    });

    // ---------------- LISTENERS FOR THE TOOLS ----------------
    inputEraser.addEventListener('click',function(){
        colorSaved = color ;
        color = '#ffffff';
        document.getElementById('paint').style.cursor = 'cell';
        document.getElementById('divColors').style.display = 'none';
    });

    inputPencil.addEventListener('click',function(){
        color = colorSaved ;
        document.getElementById('paint').style.cursor = 'pointer';
        document.getElementById('divColors').style.display = '';
    });

    btnClear.addEventListener('click', function(){
        clear_canvas();
        socket.emit('clear');
    });

    // Listener of the ready button
    btnReady.addEventListener('click', function(){
        socket.emit('imReadyToPlay');
        divBelowScores.innerHTML = "<button class='btn btn-sm btn-info'><span class='glyphicon glyphicon-search'></span> Attente des autres joueurs...</button>";
    });

    // Configure the colors in the tools
    var linksColors = document.querySelectorAll("#colors>li>a");
    var linksColorsLength = linksColors.length ;
    for (var i=0; i <= linksColorsLength ; i++) {
        (function(i) {
            if(linksColors[i]){
                linksColors[i].style.background = linksColors[i].getAttribute('data-color');

                linksColors[i].addEventListener('click', function() {
                    color = this.getAttribute('data-color');

                    var actives = document.querySelectorAll(".active");
                    var activesLength = actives.length ;
                    for(var j = 0 ; j <= activesLength ; j++){
                        if(actives[j]){
                            actives[j].removeAttribute('class');
                        }
                    }
                    this.setAttribute('class','active');

                });
            }
        }(i));

    }

    // Configure the inputs of the brush size
    var inputsSize = document.getElementsByName('size');
    var inputsSizeLength = inputsSize.length ;
    for (var i=0; i <= inputsSizeLength ; i++) {
        (function(i) {
            if(inputsSize[i]){
                // Add the listener to every input 'size' --> change the size of the pencil
                inputsSize[i].addEventListener('click', function() {
                    width_brush = this.getAttribute('value');
                });
            }
        }(i));
    }

    // ********************** GAME SYSTEM **********************

    formWord.onsubmit = function() {

        if(inputWord.value.trim() != ""){
            divChooseWord.style.display = 'none';
            socket.emit('chooseTheWord', { word : inputWord.value.trim() });
            inputWord.value = "";
        }
        return false;
    };

    socket.on('gameBegins', function(){
        divBelowScores.innerHTML = '<button class="btn btn-sm btn-success"><span class="glyphicon glyphicon-play"></span> Le jeu est en cours !</button>';
    });

    socket.on('chooseTheWord', function(){
        clear_canvas();
        divChooseWord.style.display = '';
    });

    socket.on('yourTurnToDraw', function(){
        clear_canvas();
        allowPainting();
        socket.emit('imDrawing');
    });

    socket.on('wordGuessed', function(data){
        disablePainting();
        clear_canvas();
        updateScores(data.listPlayers);
    });

    socket.on('secondes', function(data){
        document.getElementById('seconds').innerHTML = data.secondes;
    });

    socket.on('timesUp', function(data){
        disablePainting();
        clear_canvas();
    });


    socket.on('gameFinished', function(data){
        updateScores(data.listPlayers);
        disablePainting();
        clear_canvas();

        window.onbeforeunload = null;
        alert('La partie est fini, vous allez être redirigé vers la liste des salons !');
        window.location.href = '/listRooms';
    });

    // ---------- RECEIVE THE PAINTING ----
    socket.on('paintingON', function(data){
        painting = data.data.painting;
        started = data.data.started;
        cursorX = data.data.cursorX;
        cursorY = data.data.cursorY;
        color = data.data.color;
        width_brush = data.data.width_brush;

        drawLine();

    });

    socket.on('paintingOFF', function(data){
        painting = data.data.painting;
        started = data.data.started;
        cursorX = data.data.cursorX;
        cursorY = data.data.cursorY;
        color = data.data.color;
        width_brush = data.data.width_brush;

    });

    socket.on('clear', function(){
        clear_canvas();
    });


    // When the user leaves the page
    window.onbeforeunload = function (e) {
        var message = "Si vous quittez cette page, cela fermera le salon !",
            e = e || window.event;
        // For IE and Firefox
        if (e) {
            e.returnValue = message;
        }

        return message;
    };

    window.onunload = function () {
        socket.emit('leaveRoom');
    };

    socket.on('roomClosed', function(){
        window.onbeforeunload = null;
        alert('Désolé, un joueur a quitté le salon, vous allez être redirigé vers la liste des salons !');
        window.location.href = '/listRooms';

    });


    socket.on('imNewInThisRoom', function(data){
        titleRoom.innerHTML += " "+ data.nameRoom;

        updateScores(data.listPlayers);
    });


    // ---------------  FUNCTIONS ----------------

    function drawLine() {

        if (!started) {
            context.beginPath();
            context.moveTo(cursorX, cursorY);
            started = true;
        }
        else {
            context.lineTo(cursorX, cursorY);
            context.strokeStyle = color;
            context.lineWidth = width_brush;
            context.stroke();
        }
    }

    function clear_canvas() {
        context.clearRect(0,0, canvas.width, canvas.height);
    }

    function allowPainting() {

        resetVars();

        canvas.onmousedown = function(){
            painting = true;
        };

        document.onmouseup = function(){
            painting = false;
            started = false;

            if(painting && started){
                var data = {
                    painting: painting,
                    started: started,
                    cursorX: cursorX,
                    cursorY: cursorY,
                    color: color,
                    width_brush: width_brush
                }
                socket.emit('paintingOFF', { data : data });
            }
        };

        canvas.onmousemove = function(e){
            if (painting) {
                cursorX = e.pageX - rect.left;
                cursorY = e.pageY - rect.top;

                var data = {
                    painting: painting,
                    started: started,
                    cursorX: cursorX,
                    cursorY: cursorY,
                    color: color,
                    width_brush: width_brush
                }

                drawLine();

                socket.emit('paintingON', { data : data });
            }
        };

        divTools.style.display = '';
    }

    function disablePainting(){

        divTools.style.display = 'none';

        canvas.onmousedown = null ;

        document.onmouseup = null ;

        canvas.onmousemove = null ;

    }

    function updateScores(listPlayers){

        if(Object.keys(listPlayers).length !== 0){
            divScores.innerHTML = "" ;
            for (var key in listPlayers) {
                if (listPlayers.hasOwnProperty(key)) {
                    var name = listPlayers[key].username;
                    var score = listPlayers[key].score;

                    if(score == 0 || score == 1){
                        divScores.innerHTML += "<b>"+ name +"</b> --> "+score+" point <br />";
                    }else{
                        divScores.innerHTML += "<b>"+ name +"</b> --> "+score+" points <br />";
                    }
                }
            }
        }

    }

    function resetVars(){
        color = "#000";
        painting = false;
        started = false;
        width_brush = 5;
        cursorX = null ;
        cursorY = null ;
        colorSaved = false;
    }


})();