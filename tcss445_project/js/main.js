window.requestAnimFrame = (function () {
    return (window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            });
})();

window.requestFullScreen = function () {
    //check to see if fullscreen is enabled.
    if (document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled) {

        var i = document.getElementById("canvasWrapper");

        // go full-screen
        if (i.requestFullscreen) {              //W3 standard
            i.requestFullscreen();
        } else if (i.webkitRequestFullscreen) { //Chrome/Safari
            i.webkitRequestFullscreen();
        } else if (i.mozRequestFullScreen) {    //Mozilla Firefox
            i.mozRequestFullScreen();
        } else if (i.msRequestFullscreen) {     //Internet Explorer
            i.msRequestFullscreen();
        }
    } else {
        console.log("Full screen is disabled.");
    }
};

//Prevent the browser from handling keydown events.
window.addEventListener("keydown", function (e) {
    switch (e.keyCode) {
        case 32: //Spacebar
        case 37: case 38: case 39: case 40: //left up right down
        case 83: case 87: //s, w
            e.preventDefault();
        default:
            //proceed as normal.
    }
}, false);



function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = {};
    this.downloadQueue = [];
}

AssetManager.prototype.queueDownload = function (path) {
    this.downloadQueue.push(path);
}

AssetManager.prototype.isDone = function () {
    return (this.downloadQueue.length == this.successCount + this.errorCount);
}

AssetManager.prototype.downloadAll = function (callback) {
    console.log("downloading all assets");
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function () {
            that.successCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.addEventListener("error", function () {
            that.errorCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.src = path;
        this.cache[path] = img;
    }
}

AssetManager.prototype.getAsset = function (path) {
    return this.cache[path];
}


/*
Notes:
setInterval() and setTimeout() may be used to run the game in the background.
requestAnimationFrame(callback, element) is used to only run the game if the tab it resides in has focus.
*/

function GameEngine() {
    this.timer = new Timer();
    this.entities = [];
    this.ctx = null;
    this.camera = null;
    this.clockTick = null;

    this.mouseClick = null;
    this.mouseMove = null;
    this.keyboardState = [];
}

GameEngine.prototype.startInput = function () {
    var that = this;

    var getXandY = function (e) {
        var rect = that.ctx.canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        return {x:x, y:y};
    }

    //https://developer.mozilla.org/en-US/docs/Web/Reference/Events/click
    this.ctx.canvas.addEventListener("click", function (e) {
        console.log("mouse click event: (" + e.clientX + "," + e.clientY + ")");
        that.mouseClick = e;
    }, false);
    //https://developer.mozilla.org/en-US/docs/Web/Reference/Events/mousemove
    this.ctx.canvas.addEventListener("mousemove", function (e) {
        //console.log("mouse move event: (" + e.clientX + "," + e.clientY + ")");
        that.mouseMove = e;
    }, false);

    //http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
    //https://developer.mozilla.org/en-US/docs/Web/Reference/Events/keydown
    this.ctx.canvas.addEventListener("keydown", function (e) {
        if (!that.keyboardState[e.keyCode]) {
            console.log("key down event: " + e.keyCode);
        }
        if (e.keyCode === 70) {
            requestFullScreen();
        }
        that.keyboardState[e.keyCode] = true;
    }, false);
    //https://developer.mozilla.org/en-US/docs/Web/Reference/Events/keyup
    this.ctx.canvas.addEventListener("keyup", function (e) {
        console.log("key up event: " + e.keyCode);
        that.keyboardState[e.keyCode] = false;
        that.keyboardUp = e;
    }, false);
    
    var thatCanvas = this.ctx.canvas;
    var fsEvent = function (e) {
        console.log("fullscreen event fired!");

        var width;
        var height;

        if (document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement) {
            //var rect = document.getElementById("canvasWrapper").getBoundingClientRect();
            //width = rect.width;
            //height = rect.height;

            // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
            if (typeof window.innerWidth != 'undefined') {
                width = window.innerWidth,
                height = window.innerHeight
            }

                // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
            else if (typeof document.documentElement != 'undefined'
                && typeof document.documentElement.clientWidth !=
                'undefined' && document.documentElement.clientWidth != 0) {
                width = document.documentElement.clientWidth,
                height = document.documentElement.clientHeight
            }

                // older versions of IE
            else {
                width = document.getElementsByTagName('body')[0].clientWidth,
                height = document.getElementsByTagName('body')[0].clientHeight
            }
        } else {
            width = 1000;
            height = 600;
        }

        console.log("new window dimensions: (" + width + "," + height + ")");

        thatCanvas.width = width;
        thatCanvas.height = height;
    }

    this.ctx.canvas.parentNode.addEventListener("fullscreenchange", fsEvent, false);       //W3 standard
    this.ctx.canvas.parentNode.addEventListener("webkitfullscreenchange", fsEvent, false); //Chrome
    this.ctx.canvas.parentNode.addEventListener("mozfullscreenchange", fsEvent, false);    //Mozilla Firefox
    this.ctx.canvas.parentNode.addEventListener("MSFullscreenChange", fsEvent, false);     //Internet Explorer

    console.log("input events set up");
}

GameEngine.prototype.getXandY = function (e) {
    return {x: e.clientX, y: e.clientY};
}

GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.startInput();
}

GameEngine.prototype.start = function () {
    console.log("start game");
    var that = this;
    (function gameLoop () {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
}

GameEngine.prototype.loop = function () {
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    this.clearInputs();
}

GameEngine.prototype.draw = function (callback) {
    this.ctx.beginPath();
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
}

GameEngine.prototype.update = function () {
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].update();
        if (this.entities[i].dispose) {
            this.dispose(this.entities[i]);
        }
    }
}

GameEngine.prototype.clearInputs = function () {
    this.mouseClick = null;
    this.mouseMove = null;
}

GameEngine.prototype.addEntity = function (entity) {
    this.entities.push(entity);
}



function Timer() {
    this.gameTime = 0;
    this.maxTick = 0.05; // 20 fps
    this.wallLastTimeStamp = 0;
}

Timer.prototype.tick = function () {
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimeStamp) / 1000;
    this.wallLastTimeStamp = wallCurrent;

    var gameDelta = Math.min(this.maxTick, wallDelta);
    this.gameTime += gameDelta;
    return gameDelta;
}




function Entity(game, image, x, y, a) {
    this.game = game; //required
    this.img = image;
    this.x = x;
    this.y = y;
    this.a = a; //radians
    this.dispose = false; //set this to true to remove the entity from the game.
}

//Not a robust cache function.  Work on it in the future.
Entity.prototype.rotateAndCache = function (image) {
    var offscreenCanvas = document.createElement('Canvas');
    var offscreenCtx = offscreenCanvas.getContext('2d');

    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;

    offscreenCtx.translate(size / 2, size / 2);
    offscreenCtx.rotate(this.a * Math.PI / 2);
    offscreenCtx.drawImage(image, -(image.width / 2), -(image.height / 2));

    return offscreenCanvas;
}

Entity.prototype.draw = function (ctx) {
    this.game.ctx.drawImage(this.img, this.x - this.game.camera.x - this.img.width / 2, (this.y - this.game.camera.y - this.img.height / 2) * tileMapHeight / tileMapWidth);
}

Entity.prototype.update = function () {
    //nothing
}

Entity.prototype.isOutsideScreen = function () {
    return (this.x > this.game.ctx.canvas.width || this.x + this.img.width < 0 ||
        this.y > this.game.ctx.canvas.height || this.y + this.img.height < 0);
}

Entity.prototype.wrapAroundScreen = function () {
    if (this.x > this.game.ctx.canvas.width) { this.x -= this.game.ctx.canvas.width + this.img.width; }
    else if (this.x + this.img.width < 0) { this.x += this.game.ctx.canvas.width + this.img.width; }
    else if (this.y > this.game.ctx.canvas.height) { this.y -= this.game.ctx.canvas.height + this.img.height; }
    else if (this.y + this.img.height < 0) { this.y += this.game.ctx.canvas.height + this.img.height; }
}

Entity.prototype.removeFromGame = function() {
    this.dipose = true;
}



function Camera(game, player) {
    Entity.call(this, game, null);
    this.player = player;
    //the top left corner of the screen
    this.x = player.x - game.ctx.canvas.width / 2;
    this.y = player.y - game.ctx.canvas.height / 2;
    //the point at which the camera's center attempts to follow, relative to the player
    var distance = Math.max(player.speed * 0.25 - 100, 0);
    this.centerX = this.game.ctx.canvas.width / 2 + distance * Math.cos(this.player.a);
    this.centerY = this.game.ctx.canvas.height / 2 + distance * Math.sin(this.player.a);
    //the point at which the camera's center is at, relative to the player
    this.actualX = this.centerX; 
    this.actualY = this.centerY;

    this.speed = 0;
    this.maxSpeed = 10;
    this.acceleration = 0.875;
}
Camera.prototype = new Entity();
Camera.prototype.constructor = Camera;

Camera.prototype.draw = function (ctx) {
    if (!debugMode) {
        return;
    }
    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.arc(this.centerX - this.x, this.centerY - this.y, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "aqua";
    ctx.arc(this.actualX - this.x, this.actualY - this.y, 45, 0, Math.PI * 2);
    ctx.stroke();
}

Camera.prototype.update = function () {
    var distance = Math.max(this.player.speed * 0.25, this.player.groundSpeed * 0.125);
    this.centerX = this.player.x + distance * Math.cos(this.player.a);
    this.centerY = this.player.y + distance * Math.sin(this.player.a);
    var dx = this.centerX - this.actualX;
    var dy = this.centerY - this.actualY;
    this.a = Math.atan2(dy, dx);
    this.speed = Math.min(this.speed + this.acceleration, (dx * dx + dy * dy) / 169 + 0.25); //Math.min(speed + acc, center delta / 13 + 0.25);
    if (this.speed > this.maxSpeed) {
        this.speed = this.maxSpeed;
    }
    if (dx >= 0) {
        this.actualX += Math.min(this.speed * Math.cos(this.a), dx);
    } else {
        this.actualX += Math.max(this.speed * Math.cos(this.a), dx);
    }
    if (dy >= 0) {
        this.actualY += Math.min(this.speed * Math.sin(this.a), dy);
    } else {
        this.actualY += Math.max(this.speed * Math.sin(this.a), dy);
    }
    this.x = this.actualX - this.game.ctx.canvas.width / 2;
    this.y = this.actualY - this.game.ctx.canvas.height / 2;
}



function Player(game, sprite, shadowSprite, x, y) {
    Entity.call(this, game, sprite, x, y, 0);
    this.shadowImg = shadowSprite;
    this.groundHeightOffset = 10;
    this.h = this.groundHeightOffset;
    this.speed = 200;
    this.groundSpeed = 200;
    this.flySpeed = 500;
    this.flySpeedMin = this.groundSpeed / 2;
    this.flySpeedHeight = 120;
    this.flyAcceleration = 5;
    this.angleSpeed = 3 * Math.PI / 180;
    this.isFlying = false;
    this.heightOffset = -0.65; //pixels per height
    this.shadowOffsetX = 0.5; //pixels per height
    this.shadowOffsetY = 0.25;  //pixels per height
}
Player.prototype = new Entity();
Player.prototype.constructor = Player;

Player.prototype.draw = function (ctx) {
    var groundX = this.x - this.game.camera.x;
    var groundY = this.y - this.game.camera.y;
    var spriteX = this.x - this.game.camera.x;
    var spriteY = this.y - this.game.camera.y + this.h * this.heightOffset;
    var shadowX = this.x - this.game.camera.x + this.h * this.shadowOffsetX;
    var shadowY = this.y - this.game.camera.y + this.h * this.shadowOffsetY;

    //Draw the ground indicator
    var gradient = ctx.createLinearGradient(this.x, this.y, spriteX, spriteY);
    gradient.addColorStop(0, "orange");
    gradient.addColorStop(0.7, "rgba(255, 165, 0, 0.0)");
    ctx.strokeStyle = gradient;
    ctx.moveTo(groundX, groundY);
    ctx.lineTo(spriteX, spriteY);
    ctx.stroke();

    ctx.beginPath();
    gradient = ctx.createLinearGradient(this.x, this.y, shadowX, shadowY);
    gradient.addColorStop(0, "blue");
    gradient.addColorStop(1, "rgba(255, 165, 0, 0.0)");
    ctx.strokeStyle = gradient;
    ctx.moveTo(groundX, groundY);
    ctx.lineTo(shadowX, shadowY);
    ctx.stroke();

    var r = 10;
    ctx.beginPath();
    if (this.isFlying) {
        ctx.strokeStyle = "rgba(0,255,0,0.5)";
    } else {
        ctx.strokeStyle = "rgba(255,0,0,0.5)";
    }
    ctx.arc(spriteX, spriteY, r, 0, Math.PI * 2);
    ctx.moveTo(spriteX, spriteY);
    ctx.lineTo(spriteX + r * Math.cos(this.a), spriteY + r * Math.sin(this.a));
    ctx.stroke();

    //Draw the player shadow
    ctx.drawImage(this.shadowImg,
                  0, 0,
                  this.shadowImg.width, this.shadowImg.height,
                  shadowX, shadowY,
                  this.shadowImg.width, this.shadowImg.height);

    //Draw the player sprite
    ctx.drawImage(this.img,
                  0, 0,
                  this.img.width, this.img.height,
                  spriteX, spriteY,
                  this.img.width, this.img.height);

    if (debugMode) {
        ctx.fillText("X: " + this.x.toFixed(2), 10, 15);
        ctx.fillText("Y: " + this.y.toFixed(2), 10, 30);
        ctx.fillText("H: " + this.h.toFixed(2), 10, 45);
        ctx.fillText("A: " + (this.a * 180 / Math.PI).toFixed(2) + "\u00B0", 10, 60);
        ctx.fillText("S: " + this.speed.toFixed(2), 10, 75);
        ctx.fillText("Misc: " + this.x.toFixed(2) + " " + this.game.camera.actualX.toFixed(2) + " " + this.game.camera.x.toFixed(2), 10, 90);
    }
}

Player.prototype.update = function () {
    var dx = 0;
    var dy = 0;
    if (this.game.keyboardState[37]) { dx -= 1; } //left
    if (this.game.keyboardState[38]) { dy -= 1; } //up
    if (this.game.keyboardState[39]) { dx += 1; } //right
    if (this.game.keyboardState[40]) { dy += 1; } //down

    if (this.isFlying) {
        var dh = 0;
        //Descend or land
        if (this.game.keyboardState[83]) {//s
            dh = -Math.min(this.flySpeedHeight * this.game.clockTick * 2, this.h - this.groundHeightOffset);
            if (dh === 0) {
                this.speed -= Math.min(this.flyAcceleration, this.speed - this.flySpeedMin);
                if (this.speed <= this.groundSpeed) {
                    this.isFlying = false;
                }
            } else {
                this.speed += Math.min(this.flyAcceleration, this.flySpeed - this.speed);
            }
        } else {
            this.speed += Math.min(this.flyAcceleration, this.flySpeed - this.speed);
        }
        //Ascend
        if (this.game.keyboardState[87]) {//w
            dh = this.flySpeedHeight * this.game.clockTick;
        }
        this.h += dh;

        //Calculate direction, velocity, and location
        var dist = this.speed * this.game.clockTick;
        var angle = 0;
        if (dx !== 0 || dy !== 0) {
            angle = Math.atan2(dy, dx);
            if (angle < 0) angle += Math.PI * 2;
            var da = this.a - angle;
            if (da < 0) da += Math.PI * 2;
            var actualDa = Math.min(this.angleSpeed, Math.abs(this.a - angle));
            if (da < -Math.PI || (da >= 0 && da < Math.PI)) { //turn left
                this.a -= actualDa;
                if (this.a < 0) this.a += Math.PI * 2;
            } else { //turn right
                this.a += actualDa;
                this.a %= Math.PI * 2;
            }
        }
        this.move(dist * Math.cos(this.a), dist * Math.sin(this.a));
    }

    else {
        var dist = this.speed * this.game.clockTick;
        if (dx !== 0 || dy !== 0) {
            this.a = Math.atan2(dy, dx);
            this.move(dist * Math.cos(this.a), dist * Math.sin(this.a));
        }

        //Take off
        if (this.game.keyboardState[87]) { //w
            this.speed = this.groundSpeed * 0.5;
            this.isFlying = true;
        }
    }
}

Player.prototype.move = function (dx, dy) {
    this.x += dx;
    // this.playerSprite.x += dx;
    // this.shadow.x += dx;

    this.y += dy;
    // this.playerSprite.y += dy;
    // this.shadow.y += dy;
}

function Enemy(game, sprite, shadowSprite, x, y, z) {
    Entity.call(this, game, sprite, x, y, 0);
    this.shadowImg = shadowSprite;
    this.groundHeightOffset = 10;
    this.h = z;
    this.speed = 200;
    this.groundSpeed = 200;
    this.flySpeed = 500;
    this.flySpeedMin = this.groundSpeed / 2;
    this.flySpeedHeight = 120;
    this.flyAcceleration = 5;
    this.angleSpeed = 3 * Math.PI / 180;
    this.isFlying = true;
    this.heightOffset = -0.65; //pixels per height
    this.shadowOffsetX = 0.5; //pixels per height
    this.shadowOffsetY = 0.25;  //pixels per height
}

Enemy.prototype = new Entity();
Enemy.prototype.constructor = Enemy;
Enemy.prototype.draw = function (ctx) {
    var groundX = this.x - this.game.camera.x;
    var groundY = this.y - this.game.camera.y;
    var spriteX = this.x - this.game.camera.x;
    var spriteY = this.y - this.game.camera.y + this.h * this.heightOffset;
    var shadowX = this.x - this.game.camera.x + this.h * this.shadowOffsetX;
    var shadowY = this.y - this.game.camera.y + this.h * this.shadowOffsetY;

    //Draw the ground indicator
    var gradient = ctx.createLinearGradient(this.x, this.y, spriteX, spriteY);
    gradient.addColorStop(0, "orange");
    gradient.addColorStop(0.7, "rgba(255, 165, 0, 0.0)");
    ctx.strokeStyle = gradient;
    ctx.moveTo(groundX, groundY);
    ctx.lineTo(spriteX, spriteY);
    ctx.stroke();

    ctx.beginPath();
    gradient = ctx.createLinearGradient(this.x, this.y, shadowX, shadowY);
    gradient.addColorStop(0, "blue");
    gradient.addColorStop(1, "rgba(255, 165, 0, 0.0)");
    ctx.strokeStyle = gradient;
    ctx.moveTo(groundX, groundY);
    ctx.lineTo(shadowX, shadowY);
    ctx.stroke();

    var r = 10;
    ctx.beginPath();
    if (this.isFlying) {
        ctx.strokeStyle = "rgba(0,255,0,0.5)";
    } else {
        ctx.strokeStyle = "rgba(255,0,0,0.5)";
    }
    ctx.arc(spriteX, spriteY, r, 0, Math.PI * 2);
    ctx.moveTo(spriteX, spriteY);
    ctx.lineTo(spriteX + r * Math.cos(this.a), spriteY + r * Math.sin(this.a));
    ctx.stroke();

    //Draw the player shadow
    ctx.drawImage(this.shadowImg,
                  0, 0,
                  this.shadowImg.width, this.shadowImg.height,
                  shadowX, shadowY,
                  this.shadowImg.width, this.shadowImg.height);

    //Draw the player sprite
    ctx.drawImage(this.img,
                  0, 0,
                  this.img.width, this.img.height,
                  spriteX, spriteY,
                  this.img.width, this.img.height);
    ctx.fillStyle="#FF0000";
    ctx.font="30px sans-serif";
    if (this.game.player.h === this.h) {
        ctx.fillText("●", spriteX - 5, spriteY - 5);
    } else if (this.game.player.h > this.h) {
        ctx.fillText("▼", spriteX - 5, spriteY - 5);
    } else if (this.game.player.h < this.h) {
        ctx.fillText("▲", spriteX - 5, spriteY - 5);
    }
    ctx.font="10px sans-serif";


    if (debugMode) {
        ctx.fillText("X: " + this.x.toFixed(2), 200, 15);
        ctx.fillText("Y: " + this.y.toFixed(2), 200, 30);
        ctx.fillText("H: " + this.h.toFixed(2), 200, 45);
        ctx.fillText("A: " + (this.a * 180 / Math.PI).toFixed(2) + "\u00B0", 200, 60);
        ctx.fillText("S: " + this.speed.toFixed(2), 200, 75);
        ctx.fillText("Misc: " + this.x.toFixed(2) + " " + this.game.camera.actualX.toFixed(2) + " " + this.game.camera.x.toFixed(2), 200, 90);
    }
    ctx.fillStyle="#000000";


}
Enemy.prototype.move = Player.prototype.move;
Enemy.prototype.update = function() {
    var stop_range = 2000;
    var dx = this.game.player.x - this.x;
    var dy = this.game.player.y - this.y;
    if (dx * dx + dy * dy >= stop_range * stop_range) {
        return;
    }

    var dx = 0;
    var dy = 0;
    var random_input = Math.floor(Math.random()*100);
    if (random_input <= 25) { dx -= 1; } //left
    else if (random_input <= 50) { dy -= 1; } //up
    else if (random_input <= 75) { dx += 1; } //right
    else if (random_input <= 100) { dy += 1; } //down

    if (this.isFlying) {
        // var dh = 0;
        // //Descend or land
        // if (this.game.keyboardState[83]) {//s
        //     dh = -Math.min(this.flySpeedHeight * this.game.clockTick * 2, this.h - this.groundHeightOffset);
        //     if (dh === 0) {
        //         this.speed -= Math.min(this.flyAcceleration, this.speed - this.flySpeedMin);
        //         if (this.speed <= this.groundSpeed) {
        //             this.isFlying = false;
        //         }
        //     } else {
        //         this.speed += Math.min(this.flyAcceleration, this.flySpeed - this.speed);
        //     }
        // } else {
        //     this.speed += Math.min(this.flyAcceleration, this.flySpeed - this.speed);
        // }
        // //Ascend
        // if (this.game.keyboardState[87]) {//w
        //     dh = this.flySpeedHeight * this.game.clockTick;
        // }
        // this.h += dh;

        //Calculate direction, velocity, and location
        var dist = this.speed * this.game.clockTick;
        var angle = 0;
        if (dx !== 0 || dy !== 0) {
            angle = Math.atan2(dy, dx);
            if (angle < 0) angle += Math.PI * 2;
            var da = this.a - angle;
            if (da < 0) da += Math.PI * 2;
            var actualDa = Math.min(this.angleSpeed, Math.abs(this.a - angle));
            if (da < -Math.PI || (da >= 0 && da < Math.PI)) { //turn left
                this.a -= actualDa;
                if (this.a < 0) this.a += Math.PI * 2;
            } else { //turn right
                this.a += actualDa;
                this.a %= Math.PI * 2;
            }
        }
        this.move(dist * Math.cos(this.a), dist * Math.sin(this.a));
    }

    // else {
    //     var dist = this.speed * this.game.clockTick;
    //     if (dx !== 0 || dy !== 0) {
    //         this.a = Math.atan2(dy, dx);
    //         this.move(dist * Math.cos(this.a), dist * Math.sin(this.a));
    //     }

    //     //Take off
    //     if (this.game.keyboardState[87]) { //w
    //         this.speed = this.groundSpeed * 0.5;
    //         this.isFlying = true;
    //     }
    // }
}

function Map(game, player) {
    this.player = player;
    this.offsetX = -3600;
    this.offsetY = -2600;
    Entity.call(this, game, ASSET_MANAGER.getAsset("images/map.gif"),
        player.x + this.offsetX, player.y + this.offsetY, 0);
}

Map.prototype = new Entity();
Map.prototype.constructor = Map;
Map.prototype.update = function () {
    this.x = this.offsetX - this.player.x;
    this.y = this.offsetY - this.player.y;
}

function TileMap(game, player, x, y) {
    Entity.call(this, game, ASSET_MANAGER.getAsset("images/map_tiles.png"), x, y);
    this.player = player;
    this.imgCache = null;
    this.tilePixelWidth = 38;  //How wide an individual tile is on the sprite sheet
    this.tilePixelHeight = 27; //How high an individual tile is on the sprite sheet
    this.tileMapWidth = 38;    //How wide an individual tile is on the game canvas
    this.tileMapHeight = 20;   //How high an individual tile is on the game canvas
    this.tileMapDepth = 7;     //How deep an individual tile is on the game canvas
    this.drawInit(this.game.ctx);
}
TileMap.prototype = new Entity();
TileMap.prototype.constructor = TileMap;

//TileMap.prototype.update = function () {
//    var max = Math.max(this.tileMapWidth, this.tileMapHeight);
//    this.x = -this.player.x * this.tileMapWidth / max;
//    this.y = -this.player.y * this.tileMapHeight / max;
//}

TileMap.prototype.drawInit = function (ctx) {
    this.drawMap(ctx);
}

//var barfoo = true;
//var fobaro = true;
//var foobar = true;
//var offCanvas = null;
//TileMap.prototype.drawMap = function (ctx) {
//    var offCtx = null;
//    if (!offCanvas) {
//        offCanvas = document.createElement('Canvas');
//        offCanvas.width = ctx.canvas.width;
//        offCanvas.height = ctx.canvas.height;
//    }
//    offCtx = offCanvas.getContext('2d');
//    offCtx.clearRect(0, 0, offCtx.canvas.width, offCtx.canvas.height);
//    var count = 0;
//    //x, y for canvas coordinates
//    //i, j for tile coordinates
//    var j = this.y;
//    if (j < 0) {
//        var temp = this.tileMapHeight * gameMap.length;
//        j = gameMap.length + Math.ceil(this.y / this.tileMapHeight) % gameMap.length;
//    } else {
//        j = Math.floor(this.y / this.tileMapHeight);
//    }

//    for (var y = -this.y % this.tileMapHeight / this.tileMapHeight - 1;
//        (y - 2) * this.tileMapHeight / 2 < this.game.ctx.canvas.height;
//        y++, j++) {
//        if (barfoo) {
//            console.log("Starting y: " + y);
//            console.log("Starting lower bound: " + (y - 2) * this.tileMapHeight / 2);
//            console.log("Min tiles to cover canvas height: " + this.game.ctx.canvas.height / (this.tileMapHeight / 2));
//            barfoo = false;
//        }
//        var skew = Math.floor(j % 2) !== 0;
//        var i = this.x;
//        if (i < 0) {
//            var temp = this.tileMapWidth * gameMap[j % gameMap.length].length;
//            i = gameMap[j % gameMap.length].length + Math.ceil(this.x / this.tileMapWidth) % gameMap[j % gameMap.length].length;
//        } else {
//            i = Math.floor(this.x / this.tileMapWidth);
//        }

//        var bar = true;
//        for (var x = -this.x % this.tileMapWidth / this.tileMapWidth - 1;
//            (x - 1) * this.tileMapWidth < this.game.ctx.canvas.width;
//            x++, i++) {
//            if (fobaro) {
//                console.log("Starting x: " + x);
//                console.log("Starting lower bound: " + (x - 1) * this.tileMapWidth);
//                console.log("Min tiles to cover canvas width: " + this.game.ctx.canvas.width / this.tileMapWidth);
//                fobaro = false;
//            }

//            count++;
//            var tileID = gameMap[j % gameMap.length][i % gameMap[j % gameMap.length].length];
//            offCtx.drawImage(this.img,
//                          (tileID) * this.tilePixelWidth, 0,
//                          this.tilePixelWidth, this.tilePixelHeight,
//                          this.tileMapWidth * (skew / 2 + x - 1), (y - 1) * this.tileMapHeight / 2,
//                          this.tilePixelWidth, this.tilePixelHeight);
//        }
//        skew = !skew;
//    }
//    if (foobar) {
//        console.log("Tiles drawn: " + count);
//        foobar = false;
//    }
//    ctx.drawImage(offCanvas, 0, 0);
//}

TileMap.prototype.drawMap = function (ctx) {
    var offCtx = null;
    if (!this.imgCache) {
        this.imgCache = document.createElement('Canvas');
        this.imgCache.width = (gameMap[0].length + gameMap.length) * this.tileMapWidth / 2;
        this.imgCache.height = (gameMap.length + gameMap[0].length) * this.tileMapHeight / 2 + this.tileMapDepth;
    }
    offCtx = this.imgCache.getContext('2d');
    offCtx.clearRect(0, 0, offCtx.width, offCtx.height);

    for (var j = 0; j < gameMap.length; j++) {
        for (var i = gameMap[j].length - 1; i >= 0; i--) {
            var tileID = (gameMap[j][i] & 0xFF0000) >> 16;
            var low = gameMap[j][i] & 0xFF;
            var high = (gameMap[j][i] & 0xFF00) >> 8;
            for (var k = low; k <= high; k++) {
                offCtx.drawImage(this.img,
                              tileID * this.tilePixelWidth, 0,
                              this.tilePixelWidth, this.tilePixelHeight,
                              this.tileMapWidth / 2 * (i + j), this.tileMapHeight / 2 * (j + gameMap[j].length - i - 1) - this.tileMapDepth * k,
                              this.tilePixelWidth, this.tilePixelHeight);
            }
        }
    }
}

TileMap.prototype.draw = function (ctx) {
    ctx.drawImage(this.imgCache, this.x - this.game.camera.x, (this.y - this.game.camera.y) * tileMapHeight / tileMapWidth);
}

var gameMap = [
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],   //iiiiiiuuulll
    [0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x20400, 0x20200, 0x20200, 0x20400, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20200, 0x20100, 0x20100, 0x20200, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20000, 0x20100, 0x20300, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x20000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],   //iiiiiiuuulll
    [0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20600, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x20400, 0x20200, 0x20200, 0x20400, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20200, 0x20100, 0x20100, 0x20200, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20000, 0x20100, 0x20300, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x20000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],   //iiiiiiuuulll
    [0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20600, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x20400, 0x20200, 0x20200, 0x20400, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20200, 0x20100, 0x20100, 0x20200, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20000, 0x20100, 0x20300, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x20000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],   //iiiiiiuuulll
    [0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20600, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x20400, 0x20200, 0x20200, 0x20400, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20200, 0x20100, 0x20100, 0x20200, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20000, 0x20100, 0x20300, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x20000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],   //iiiiiiuuulll
    [0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20600, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x20400, 0x20200, 0x20200, 0x20400, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20200, 0x20100, 0x20100, 0x20200, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20000, 0x20100, 0x20300, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x20000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000],   //iiiiiiuuulll
    [0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20600, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x20400, 0x20200, 0x20200, 0x20400, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20200, 0x20100, 0x20100, 0x20200, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20200, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x20000, 0x20100, 0x20300, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20300, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20100, 0x10000, 0x10000, 0x10000, 0x10000, 0x20000, 0x20000, 0x10000, 0x10000, 0x10000, 0x20000, 0x10000, 0x10000, 0x10000, 0x10000, 0x20400, 0x10000, 0x10000, 0x10000, 0x10000, 0x20500, 0x10000],
    [0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000, 0x10000]
];



var ASSET_MANAGER = new AssetManager();
var debugMode = true;
var tileMapWidth = 38;
var tileMapHeight = 20;
var tileMapDepth = 7;

ASSET_MANAGER.queueDownload("images/test.png");
ASSET_MANAGER.queueDownload("images/test_shadow.png");
ASSET_MANAGER.queueDownload("images/map.gif");
ASSET_MANAGER.queueDownload("images/map_tiles.png");
ASSET_MANAGER.queueDownload("images/sky_bg.png");
ASSET_MANAGER.queueDownload("images/enemy.png");
ASSET_MANAGER.downloadAll(function () {
    //console.log("Assets all loaded with " + ASSET_MANAGER.successCount + " successes and " + ASSET_MANAGER.errorCount + " errors.");
    var engine = new GameEngine();
    engine.init(document.getElementById("gameWorld").getContext("2d"));
    var player = new Player(engine, ASSET_MANAGER.getAsset("images/test.png"), ASSET_MANAGER.getAsset("images/test_shadow.png"), 50, 50);
    var enemy = new Enemy(engine, ASSET_MANAGER.getAsset("images/enemy.png"), ASSET_MANAGER.getAsset("images/test_shadow.png"), 300, 300, 30);
    engine.addEntity(new Entity(engine, ASSET_MANAGER.getAsset("images/sky_bg.png"), 200, 200));
    engine.addEntity(new TileMap(engine, player, 0, 0));
    engine.addEntity(player);
    engine.addEntity(enemy);
    engine.player = player;
    engine.camera = new Camera(engine, player);
    engine.addEntity(engine.camera);
    engine.start();
});