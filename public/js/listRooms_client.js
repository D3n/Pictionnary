/**
 * Created by denis on 23/01/2014.
 */

(function() {

    var socket = io.connect('');
    var inputName = document.getElementById('nameRoom');
    var form = document.getElementById('formNewRoom');
    var divNameRoom = document.getElementById('divNameRoom');
    var divErrors = document.getElementById('divErrors');
    var divTbody = document.getElementById('tbody');
    var tableRooms = document.getElementById('tableRooms');
    var divNoRoom = document.getElementById('divNoRoom');

    var nbRooms = 0;
    var myLang = false;

    // Check the number of rooms for the first time
    socket.emit('nbRooms');
    socket.emit('listRooms');

    socket.on('nbRooms', function(data){
        // We receive the number of rooms
        nbRooms = data.nb ;
        if(!myLang){
            myLang = data.langUser;
        }

        if(nbRooms != 0){
            // Display the table and hide the alert
            tableRooms.style.display = '';
            divNoRoom.style.display = 'none';
            // There is rooms, so add the click listener on every join button
            addListnersButtonsJoin();
        }else{
            // There is no rooms
            // Empty the table
            divTbody.innerHTML = "";
            // Hide the table and display the alert
            tableRooms.style.display = 'none';
            divNoRoom.style.display = '';
        }
    });

    socket.on('listRooms', function(data) {

        if(Object.keys(data.rooms).length !== 0){
            for (var key in data.rooms) {
                if (data.rooms.hasOwnProperty(key)) {
                    // !started && players < 4 == SUCCESS
                    // started || players == 4 == ERROR
                    var indexRoom = key ;
                    var nameRoom = data.rooms[key].name;
                    var started = data.rooms[key].started;
                    var nbPlayers = data.rooms[key].nbPlayers;

                    if(!started && nbPlayers < 4){
                        divTbody.innerHTML += "" +
                            "<tr id='"+ nameRoom +"' class='success'>" +
                            "<td><b>"+ nameRoom +"</b></td>" +
                            "<td class='text-center'><span class='badge'>" + data.rooms[key].nbPlayers + " / 4</span></td>" +
                            "<td class='text-center'><button class='btn btn-sm btn-primary' type='button' id='join' name='"+indexRoom+"' value='"+nameRoom+"' titre='Rejoindre le salon' ><span class='glyphicon glyphicon-chevron-right'></span> Rejoindre !</button></td>" +
                            "</tr>";
                    }else if(started || nbPlayers == 4){
                        divTbody.innerHTML += "" +
                            "<tr id='"+ nameRoom +"' class='danger'>" +
                            "<td><b>"+ nameRoom +"</b></td>" +
                            "<td class='text-center'><span class='badge'>" + data.rooms[key].nbPlayers + " / 4</span></td>" +
                            "<td class='text-center'><a href='#' class='btn btn-sm btn-danger'><span class='glyphicon glyphicon-remove'></span> Salon inaccessible !</a></td>" +
                            "</tr>";
                    }


                }
            }
            addListnersButtonsJoin();
        }
    });

    form.onsubmit = function() {
        var name = inputName.value;
        if(typeof name == 'string' && name.trim() != ""){
            socket.emit('newRoom', {
                'nameRoom': name
            });
            inputName.value = "";
        }
        return false;
    };


    socket.on('newRoom', function(data){
        if(data.langRoom == myLang){
            // Check the number of rooms
            socket.emit('nbRooms');
            var indexRoom = data.name + "_" + data.langRoom ;

            divTbody.innerHTML += "" +
                "<tr id='"+ data.name +"' class='success'>" +
                    "<td><b>"+ data.name +"</b></td>" +
                    "<td class='text-center'><span class='badge'>0 / 4</span></td>" +
                    "<td class='text-center'><button class='btn btn-sm btn-primary' type='button' id='join' name='"+indexRoom+"' value='"+data.name+"' titre='Rejoindre le salon' ><span class='glyphicon glyphicon-chevron-right'></span> Rejoindre !</button></td>" +
                "</tr>";

            // Add the click listener on the new room
            addListnersButtonsJoin();
        }
    });

    socket.on('roomExists', function(name){
        inputName.value = name.name;
        divNameRoom.className =  "col-md-6 form-group"
        divNameRoom.className =  divNameRoom.className  + ' has-error';

    });

    socket.on('roomCreated', function(name){
        inputName.value = "";
        divNameRoom.className =  "col-md-6 form-group"
        divNameRoom.className =  divNameRoom.className  + ' has-success';

    });

    socket.on('roomDeleted', function(data){
        if(data.langRoom == myLang){
            deleteRow(data.roomName);
        }
    });

    socket.on('playersUpdate', function(data){
        var row = document.getElementById(data.room.name);
        var cells = document.getElementById(data.room.name).cells;
        var nbPlayers = data.room.nbPlayers;

        cells[1].innerHTML = "<span class='badge'>" + nbPlayers + " / 4</span>";

        if(nbPlayers == 4){

            cells[2].innerHTML = "<a href='#' class='btn btn-sm btn-danger'><span class='glyphicon glyphicon-remove'></span> Salon inaccessible !</a>";
            row.className = "";
            row.className = "danger";
        }

    });

    socket.on('roomStarted', function(data){
        var row = document.getElementById(data.room.name);
        var cells = document.getElementById(data.room.name).cells;
        var started = data.room.started;

        if(started){

            cells[2].innerHTML = "<a href='#' class='btn btn-sm btn-danger'><span class='glyphicon glyphicon-remove'></span> Salon inaccessible !</a>";
            row.className = "";
            row.className = "danger";
        }

    });

    socket.on('youCanEnterTheRoom', function(){
        window.location.href = '/play';
    });

    socket.on('alreadyInRoom', function(){
        divErrors.innerHTML = '<a href="#" class="btn btn-default"><span class="glyphicon glyphicon-remove-sign"></span> Vous êtes déjà en train de jouer dans un salon !</a>';
    });

    //------------------ Functions -------------------

    function addListnersButtonsJoin() {
        var buttons = document.querySelectorAll('#join');
        var nbButtons = buttons.length ;
        for (var i=0; i <= nbButtons ; i++) {
            (function(i) {
                // If the button doesnt have already the click listener, add it
                if(buttons[i] && !buttons[i]._hasClickEvent){

                    buttons[i]._hasClickEvent = true;

                    buttons[i].addEventListener('click', function() {
                        var index = buttons[i].getAttribute('name');
                        var name = buttons[i].getAttribute('value');
                        socket.emit('wannaJoin', {
                            indexRoom: index,
                            nameRoom: name
                        });

                        //window.location.href = '/play';
                    });
                }
            }(i));

        }
    }

    function deleteRow(rowid)
    {
        var row = document.getElementById(rowid);
        row.parentNode.removeChild(row);
    }

})();