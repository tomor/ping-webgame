
var Ball = function() {
    // List of variables only the object can see (private variables).
    var margin = 32;
    var ballSize = 74;
    var position = [500, 500];
    var velocity = [-1, -1];
    var element = $('#ball');
    var paused = false;
    var owner = undefined;


    // Method which checks if ball passed any player
    function checkScored() {
        if (position[0] <= 0) {
            pause();
            $(document).trigger('ping:opponentScored');
        }

        if (position[0] >= innerWidth) {
            pause();
            $(document).trigger('ping:playerScored');
        }
    }

    // Method that moves the ball based on its velocity. This method is only used
    // internally and will not be made accessible outside of the object.
    function move(t) {
        // If there is an owner, move the ball to match the owner's position.
        if (owner !== undefined) {
            var ownerPosition = owner.getPosition();

            position[1] = ownerPosition[1] + ballSize;
            if (owner.getSide() === 'left') {
              position[0] = ownerPosition[0] + owner.getWidth();
            } else {
              position[0] = ownerPosition[0];
            }
        // Otherwise, move the ball using physics. Note the horizontal bouncing
        // has been removed -- ball should pass by a player if it
        // isn't caught.
        } else {
            // If the ball hits the top or bottom, reverse the vertical speed.
            if (position[1] - margin <= 0 || position[1] + margin >= innerHeight) {
              velocity[1] = -velocity[1];
            }
            position[0] += velocity[0] * t;
            position[1] += velocity[1] * t;
        }

        element.css('left', (position[0] - margin) + 'px');
        element.css('top',  (position[1] - margin) + 'px');
    }

    // Update the state of the ball, which for now just checks
    // if the play is paused and moves the ball if it is not.
    // This function will be provided as a method on the object.
    function update(t) {
        // First the motion of the ball is handled
        if(!paused) {
            move(t);
        }

        // check if anybody scored
        checkScored();

        // The ball is under control of a player, no need to update.
        if (owner !== undefined) {
            return;
        }

        // First, check if the ball is about to be grabbed by the player.
        var playerPosition = player.getPosition();
        if (position[0] <= player.getHeight() &&
              position[1] >= playerPosition[1] &&
              position[1] <= playerPosition[1] + player.getWidth()) {
          
            console.log("Grabbed by player!");
            owner = player;
        }

        // Then the opponent...
        var opponentPosition = opponent.getPosition();
        if (position[0] >= innerWidth - opponent.getHeight() &&
              position[1] >= opponentPosition[1] &&
              position[1] <= opponentPosition[1] + opponent.getWidth()) {
            console.log("Grabbed by opponent!");
            owner = opponent;
        }
    }

    // Pause the ball motion.
    function pause() {
        paused = true;
    }

    // Start the ball motion.
    function start() {
        paused = false;
    }

    // Now explicitly set what consumers of the Ball object can use.
    // Right now this will just be the ability to update the state of the ball,
    // and start and stop the motion of the ball.
    return {
        update:      update,
        pause:       pause,
        start:       start,
        getOwner:    function()        { return owner; },
        setOwner:    function(player)  { owner = player; },
        setVelocity: function(veloc)   { velocity = veloc; },
        getPosition: function()        { return position; }
    };
};

var Player = function (elementName, side) {
    var playerWidth = 170;
    var playerHeight = 132;
    var position = [0, 0];
    var element = $('#' + elementName);
    var aim = 0;

    var move = function(y) {
        // Adjust the player's position.
        position[1] += y;

        // If the player is off the edge of the screen, move it back.
        if (position[1] <= 0)  {
            position[1] = 0;
        }

        // The height of the player is 128 pixels, so stop it before any
        // part of the player extends off the screen.
        if (position[1] >= innerHeight - playerHeight) {
            position[1] = innerHeight - playerHeight;
        }

        // If the player is meant to stick to the right side, set the player position
        // to the right edge of the screen.
        if (side === 'right') {
            position[0] = innerWidth - playerWidth;
        }

        // Finally, update the player's position on the page.
        element.css('left', position[0] + 'px');
        element.css('top', position[1] + 'px');
    };

    var fire = function() {
        // Safety check: if the ball doesn't have an owner, don't not mess with it.
        if (ball.getOwner() !== this) {
            return;
        }

        var v = [0,0];
        // Depending on the side the player is on, different directions will be thrown.
        // The ball should move at the same speed, regardless of direction --
        // with some math you can determine that moving .707 pixels on the
        // x and y directions is the same speed as moving one pixel in just one direction.

        if (side === 'left') {
            switch(aim) {
            case -1:
                v = [.707, -.707];
                break;
            case 0:
                v = [1,0];
                break;
            case 1:
                v = [.707, .707];
            }
        } else {
            switch(aim) {
            case -1:
                v = [-.707, -.707];
                break;
            case 0:
                v = [-1,0];
                break;
            case 1:
                v = [-.707, .707];
            }
        }

        ball.setVelocity(v);

        // Release control of the ball.
        ball.setOwner(undefined);
    };

    return {
      move:         move,
      fire:         fire,
      getSide:      function()  { return side; },
      setAim:       function(a) { aim = a; },
      getPosition:  function()  { return position; },
      getWidth:     function()  { return playerWidth; },
      getHeight:    function()  { return playerHeight; }
    };
};

function AI(playerToControl) {
    var ctl = playerToControl;

    var State = {
      WAITING: 0,
      FOLLOWING: 1,
      AIMING: 2
    };
    
    var currentState = State.FOLLOWING;

    // method which follows the ball
    function moveTowardsBall() {
        // Move the same distance the player would move, to make it fair.
        if(ball.getPosition()[1] >= ctl.getPosition()[1] + 74) {
          ctl.move(distance);
        } else {
          ctl.move(-distance);
        }
    };

    // function which is called regularly
    function update() {
        switch (currentState) {
            case State.FOLLOWING:
                moveTowardsBall();
                currentState = State.WAITING;
                break;
            case State.WAITING:
                // check if AI is the owner, if yes, shoot
                if (ball.getOwner() === opponent) {
                    currentState = State.AIMING;
                    return;
                }

                setTimeout(function() {
                    currentState = State.FOLLOWING;
                }, 400);
                break;
            case State.AIMING:
                aimAndFire();
                break;
        }
    };

    // repeat something cb-times and then start cbFinal method
    function repeat(cb, cbFinal, interval, count) {
        var timeout = function() {
          repeat(cb, cbFinal, interval, count-1);
        };
        
        if (count <= 0) {
            cbFinal();
        } else {
            cb();
            setTimeout(function() {
              repeat(cb, cbFinal, interval, count-1);
            }, interval);
        }
    }

    function aimAndFire() {
        // Repeat the motion action 5 to 10 times.
        var numRepeats = Math.floor(5 + Math.random() * 5);

        function randomMove() {
            if (Math.random() > .5) {
              ctl.move(-distance);
            } else {
              ctl.move(distance);
            }
        }

        function randomAimAndFire() {
            var d = Math.floor( Math.random() * 3 - 1 );
            opponent.setAim(d);
            opponent.fire();

            // Finally, set the state to FOLLOWING.
            currentState = State.FOLLOWING;
        }

        repeat(randomMove, randomAimAndFire, 250, numRepeats);
    }

    return {
      update: update
    };
}


// game variables
var ball;
var player;
var opponent;
var ai;
var lastUpdate;
var distance = 24;  // The amount to move the player each step.
var score = [0, 0];


// method for updating the ball position
function update(time) {
    var t = time - lastUpdate;
    lastUpdate = time;
    ball.update(t);
    ai.update();
    requestAnimationFrame(update);
}


// START the fun
$(document).ready(function() {
    lastUpdate = 0;
    ball = Ball();

    // players
    player = Player('player', 'left');
    player.move(0);
    opponent = Player('opponent', 'right');
    opponent.move(0);

    // create AI
    ai = AI(opponent);

    // allow to move the player - use handjs polyfil
    // pointerdown is the universal event for all types of pointers -- a finger,
    // a mouse, a stylus and so on.
    $('#up')    .bind("pointerdown", function() { player.move(-distance);});
    $('#down')  .bind("pointerdown", function() { player.move(distance);});
    $('#left')  .bind("pointerdown", function() {player.setAim(-1);});
    $('#right') .bind("pointerdown", function() {player.setAim(1);});

    // clear the aim when touch is released
    $('#left')  .bind("pointerup",   function() {player.setAim(0);});
    $('#right') .bind("pointerup",   function() {player.setAim(0);});

    // fire the ball when screen is touched anywhere
    $('body')   .bind("pointerdown", function() {player.fire();});

    requestAnimationFrame(update);
});

// make keyboard controll the game
$(document).keydown(function(event) {
    var event = event || window.event;

    // This code converts the keyCode (a number) from the event to an uppercase
    // letter to make the switch statement easier to read.
    switch(String.fromCharCode(event.keyCode).toUpperCase()) {
        case 'A':
            player.move(-distance);
            break;
        case 'Z':
            player.move(distance);
            break;
        case 'K':
            player.setAim(-1);
            break;
        case 'M':
            player.setAim(1);
            break;
        case ' ':
            player.fire();
            break;
    }
    return false;
});

// clear aim when key is released
$(document).keyup(function(event) {
    var event = event || window.event;
    switch(String.fromCharCode(event.keyCode).toUpperCase()) {
        case 'K':
        case 'M':
          player.setAim(0);
          break;
    }

    return false;
});

// listen to events
$(document).on('ping:playerScored', function(e) {
    console.log('player scored!');
    score[0]++;
    $('#playerScore').text(score[0]);
    ball.setOwner(opponent);
    ball.start();
});

$(document).on('ping:opponentScored', function(e) {
    console.log('opponent scored!');
    score[1]++;
    $('#opponentScore').text(score[1]);
    ball.setOwner(player);
    ball.start();
});