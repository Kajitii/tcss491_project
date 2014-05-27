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

    this.background = [];
    this.entities = [];
    this.foreground = [];

    this.ctx = null;
    this.camera = null;
    this.clockTick = null;

    this.player = null;

    this.mouseClick = null;
    this.mouseMove = null;
    this.keyboardState = [];
    this.fire = false;
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
        if (e.keyCode === 32) {
            that.fire = true;
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
        thatCanvas.diagonal = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
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
    ctx.canvas.diagonal = Math.sqrt(Math.pow(ctx.canvas.width, 2) + Math.pow(ctx.canvas.height, 2));
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
    for (var i = 0; i < this.background.length; i++) {
        this.background[i].draw(this.ctx);
    }
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    for (var i = 0; i < this.foreground.length; i++) {
        this.foreground[i].draw(this.ctx);
    }
}

GameEngine.prototype.update = function () {
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].update();
    }
    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].dispose) {
            this.entities.splice(i, 1);
        }
    }
    for (var i = 0; i < this.background.length; i++) {
        if (this.background[i].dispose) {
            this.background.splice(i, 1);
        }
    }
    for (var i = 0; i < this.foreground.length; i++) {
        if (this.foreground[i].dispose) {
            this.foreground.splice(i, 1);
        }
    }
}

GameEngine.prototype.clearInputs = function () {
    this.mouseClick = null;
    this.mouseMove = null;
}

GameEngine.prototype.addBackground = function (entity) {
    this.background.push(entity);
}

GameEngine.prototype.addEntity = function (entity) {
    this.entities.push(entity);
}

GameEngine.prototype.addForeground = function (entity) {
    this.foreground.push(entity);
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
    ctx.drawImage(this.img,
                  this.x - this.game.camera.x - this.img.width / 2,
                  ((this.y - this.game.camera.y) * tileYRatio - this.img.height / 2));
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
    this.dispose = true;
}



function Camera(game, player) {
    Entity.call(this, game, null);
    this.player = player;
    //the top left corner of the screen
    this.x = player.x - game.ctx.canvas.width / 2;
    this.y = player.y - game.ctx.canvas.height / 2;
    //
    this.prevPlayerX = player.x;
    this.prevPlayerY = player.y;
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
    ctx.save();
    ctx.scale(1, tileYRatio);
    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.arc(this.centerX - this.x, this.centerY - this.y, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "aqua";
    ctx.arc(this.actualX - this.x, this.actualY - this.y, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

Camera.prototype.update = function () {
    var distance = Math.max(this.player.speed * 0.25, this.player.groundSpeed * 0.125);
    var centerDX = this.player.x - this.prevPlayerX;
    var centerDY = this.player.y - this.prevPlayerY;
    this.prevPlayerX = this.player.x;
    this.prevPlayerY = this.player.y;
    this.centerX = this.player.x + distance * Math.cos(this.player.a);
    this.centerY = this.player.y + distance * Math.sin(this.player.a) * tileYRatio;
    this.actualX += centerDX;
    this.actualY += centerDY;
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
    this.y = this.actualY - this.game.ctx.canvas.height / 2 / tileYRatio;
}



function Player(game, sprite, x, y) {
    Entity.call(this, game, sprite, x, y, 0);

    this.spriteSheetOffsetX = 1439;
    this.spriteSheetOffsetY = 1171;
    this.frameWidth = 72;
    this.frameHeight = 65;
    this.animationDelay = 0.375; //seconds
    this.animationTimer = 0;
    this.flapping = 0;
    this.flapFrames = 3; //Number of frames in the flapping animation
    this.flapOffset = 0; //Frame offset for the flap animation
    this.walkFrames = 4; //Number of frames in the walking animation
    this.walkOffset = 3; //Frame offset for the walk animation
    this.idleFrames = 2; //Number of frames in the idle animation
    this.idleOffset = 6; //Frame offset for the idle animation

    this.groundHeightOffset = 10;
    this.h = this.groundHeightOffset;
    this.speed = 200;
    this.groundSpeed = 200;
    this.flySpeed = 500;
    this.flySpeedMin = this.groundSpeed / 2;
    this.flySpeedHeight = 120;
    this.flyAcceleration = 5;
    this.angleSpeed = 3 * Math.PI / 180;
    this.heightOffset = -0.65; //pixels per height
    this.shadowOffsetX = 0.5; //pixels per height
    this.shadowOffsetY = 0.25;  //pixels per height

    this.isFlying = false;
    this.isIdle = true;

    this.inventory = [];
}
Player.prototype = new Entity();
Player.prototype.constructor = Player;

Player.prototype.draw = function (ctx) {
    var imgWidthOffset = this.frameWidth / 2;
    var imgHeightOffset = 47;
    var groundX = this.x - this.game.camera.x;
    var groundY = this.y - this.game.camera.y;
    var spriteX = groundX;
    var spriteY = groundY + this.h * this.heightOffset;
    var shadowX = groundX + (this.h - this.heightOffset) * this.shadowOffsetX;
    var shadowY = groundY + this.h * this.shadowOffsetY;

    //Draw the player shadow
    ctx.save();

    ctx.scale(1, tileYRatio);

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(shadowX, shadowY, 13, 0, Math.PI * 2);
    ctx.fill();

    //Draw the ground indicator
    //Ground circle and direction
    var r = 10;
    ctx.beginPath();
    if (this.isFlying) {
        ctx.strokeStyle = "rgba(0,255,0,0.5)";
    } else {
        ctx.strokeStyle = "rgba(255,0,0,0.5)";
    }
    ctx.arc(groundX, groundY, r, 0, Math.PI * 2);
    ctx.moveTo(groundX, groundY);
    ctx.lineTo(groundX + r * Math.cos(this.a), groundY + r * Math.sin(this.a));
    ctx.stroke();

    //Ground to player sprite
    var gradient = ctx.createLinearGradient(groundX, groundY, spriteX, spriteY);
    gradient.addColorStop(0, "orange");
    gradient.addColorStop(0.7, "rgba(255, 165, 0, 0.0)");
    ctx.strokeStyle = gradient;
    ctx.moveTo(groundX, groundY);
    ctx.lineTo(spriteX, spriteY);
    ctx.stroke();

    //Ground to player shadow
    ctx.beginPath();
    gradient = ctx.createLinearGradient(groundX, groundY, shadowX, shadowY);
    gradient.addColorStop(0, "blue");
    gradient.addColorStop(1, "rgba(0, 0, 255, 0.10)");
    ctx.strokeStyle = gradient;
    ctx.moveTo(groundX, groundY);
    ctx.lineTo(shadowX, shadowY);
    ctx.stroke();

    ctx.restore();

    //Draw the player sprite
    var sx = 0;
    var sy = this.spriteSheetOffsetY + Math.round(this.a * 4 / Math.PI) % 8 * this.frameHeight;
    if (this.isFlying) {
        sx = this.flapOffset;
    } else if (this.isIdle) {
        sx = this.idleOffset;
    } else {
        sx = this.walkOffset;
    }
    sx += Math.floor(this.animationTimer / this.animationDelay);
    sx *= this.frameWidth;
    sx += this.spriteSheetOffsetX;
    ctx.drawImage(this.img,
                  sx, sy,
                  this.frameWidth, this.frameHeight,
                  spriteX - imgWidthOffset, spriteY * tileYRatio - imgHeightOffset,
                  this.frameWidth, this.frameHeight);

    if (debugMode) {
        ctx.fillStyle = "black";
        ctx.fillText("X: " + this.x.toFixed(2), 10, 15);
        ctx.fillText("Y: " + this.y.toFixed(2), 10, 30);
        ctx.fillText("H: " + this.h.toFixed(2), 10, 45);
        ctx.fillText("A: " + (this.a * 180 / Math.PI).toFixed(2) + "\u00B0", 10, 60);
        ctx.fillText("S: " + this.speed.toFixed(2), 10, 75);
        var string = "Inventory: ";
        for (name in this.inventory) {
            string += name + "(" + this.inventory[name] + "), ";
        }
        ctx.fillText(string, 10, 90);
        ctx.fillText("Misc: " + Math.round(this.a * 4 / Math.PI) % 8, 10, 105);
    }
}

Player.prototype.update = function () {
    var dx = 0;
    var dy = 0;
    if (this.game.keyboardState[37]) { dx -= 1; } //left
    if (this.game.keyboardState[38]) { dy -= 1; } //up
    if (this.game.keyboardState[39]) { dx += 1; } //right
    if (this.game.keyboardState[40]) { dy += 1; } //down
    if (this.game.keyboardState[32]) { this.fire(); }

    if (this.isFlying) {
        var dh = 0;
        //Descend or land
        if (this.game.keyboardState[83]) {//s
            dh = -Math.min(this.flySpeedHeight * this.game.clockTick * 2, this.h - this.groundHeightOffset);
            if (dh === 0) {
                this.speed -= Math.min(this.flyAcceleration, this.speed - this.flySpeedMin);
                if (this.speed <= this.groundSpeed) {
                    this.isFlying = false;
                    this.animationTimer = 0;
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
            if (this.isIdle) {
                this.isIdle = false;
                this.animationTimer = 0;
            }
            this.a = Math.atan2(dy, dx);
            if (this.a < 0) this.a += Math.PI * 2;
            this.move(dist * Math.cos(this.a), dist * Math.sin(this.a));
        } else {
            if (!this.isIdle) {
                this.isIdle = true;
                this.animationTimer = 0;
            }
        }

        //Take off
        if (this.game.keyboardState[87]) { //w
            this.speed = this.groundSpeed * 0.5;
            this.isFlying = true;
            this.animationTimer = 0;
        }
    }

    this.animationTimer += this.game.clockTick;
    if (this.isIdle && this.animationTimer >= this.idleFrames * this.animationDelay) {
        this.animationTimer -= this.idleFrames * this.animationDelay;
    } else if (this.isFlying && this.animationTimer >= this.flapFrames * this.animationDelay) {
        this.animationTimer -= this.flapFrames * this.animationDelay;
    } else if (this.animationTimer >= this.walkFrames * this.animationDelay) {
        this.animationTimer -= this.walkFrames * this.animationDelay;
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

Player.prototype.fire = function () {
    if (this.game.fire) {
        console.log("X: " + this.x + " Y: " + this.y);
        var bullet = new Bullet(this.game, this.x, this.y, this.h, this.a);
        this.game.addEntity(bullet);
        this.game.fire = false;
    }
}

Player.prototype.addItem = function (name, n) {
    if (!n) {
        n = 1;
    }
    if (n < 0) {
        throw "Error: an attempt was made to add negative amounts of an item. (" + name + "," + n + ")";
    }
    if (!this.inventory[name]) {
        console.log("lmao!");
        this.inventory[name] = n;
    } else {
        console.log("rofl!");
        this.inventory[name] += n;
    }
}

Player.prototype.checkItem = function (name) {
    if (!this.inventory[name]) {
        return 0;
    } else {
        return this.inventory[name];
    }
}

Player.prototype.removeItem = function (name, n) {
    if (!n) {
        n = 1;
    }
    if (n < 0) {
        throw "Error: an attempt was made to remove negative amounts of an item. (" + name + "," + n + ")";
    }
    var removed = Math.min(n, this.inventory[name]);
    if (!this.inventory[name]) {
        console.warn("An attempt was made to remove items the player does not have.");
        removed = 0;
    } else if (this.inventory[name] < n) {
        console.warn("An attempt was made to remove more of a type of item than the player possessed.");
    }
    this.inventory[name] -= removed;
    return removed;
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
}

function Bullet(game, x, y, h, a) {
    Entity.call(this, game, null, x, y, 0);
    this.h = h;
    this.a = a;
    this.speed = 700;
    this.heightOffset = -0.65; //pixels per height
}

Bullet.prototype = new Entity();
Bullet.prototype.draw = function(ctx) {
    var groundX = this.x - this.game.camera.x;
    var groundY = this.y - this.game.camera.y;
    var spriteX = groundX;
    var spriteY = groundY + this.h * this.heightOffset;
    ctx.font="20px sans-serif";
    ctx.fillStyle="#FFA500";
    ctx.fillText("●", spriteX, spriteY * tileYRatio);
    ctx.font="10px sans-serif";
    ctx.fillStyle="#000000";
}
Bullet.prototype.update = function() {
    var dead_range = 1000;
    var dx = this.game.player.x - this.x;
    var dy = this.game.player.y - this.y;
    if (dx * dx + dy * dy >= dead_range * dead_range) {
        this.removeFromGame();
    }
    else {
        var dist = this.speed * this.game.clockTick;
        this.move(dist * Math.cos(this.a), dist * Math.sin(this.a));
    }
}
Bullet.prototype.move = Player.prototype.move;

function Map(game, player) {
    this.game = game;
    this.player = player;
    this.minimap = null;
    this.scale = 100;            //real world pixels per minimap pixel
    this.mapQuadrantWidth = 10;  //quadrants
    this.mapQuadrantHeight = 10; //quadrants
    this.quadrantWidth = 10000;  //pixels
    this.quadrantHeight = 10000; //pixels
    this.mapWidth = this.mapQuadrantWidth * this.quadrantWidth;
    this.mapHeight = this.mapQuadrantHeight * this.quadrantHeight;
    this.currentQuadrantX = 0;
    this.currentQuadrantY = 0;
    this.quadrants = [];
    this.whatever = false;
}
Map.prototype = new Entity();
Map.prototype.constructor = Map;

Map.prototype.initMap = function () {
    if (this.minimap) {
        return;
    }

    console.log("creating the map");
    this.minimap = document.createElement('Canvas');
    this.minimap.width = this.mapWidth / this.scale;
    this.minimap.height = this.mapHeight / this.scale;

    for (var i = 0; i < this.mapQuadrantHeight; i++) {
        var array = [];
        for (var j = 0; j < this.mapQuadrantWidth; j++) {
            var q = new Quadrant(j * this.quadrantWidth, i * this.quadrantHeight,
                                 this.quadrantWidth, this.quadrantHeight,
                                 10000000);
            array.push(q);
        }
        this.quadrants.push(array);
    }
}

Map.prototype.addIsland = function (island) {
    this.quadrants[island.y][island.x].islands.push(island);
}

Map.prototype.generateMap = function () {
    var ctx = this.minimap.getContext('2d');
    ctx.fillStyle = "green";
    for (var j = 0; j < this.mapQuadrantHeight; j++) {
        for (var i = 0; i < this.mapQuadrantWidth; i++) {
            var q = this.quadrants[j][i];
            q.init(this.game);
            for (var k = 0; k < q.islands.length; k++) {
                var island = q.islands[k];
                ctx.beginPath();
                ctx.arc(island.x / this.scale, island.y / this.scale, island.detectionRadius / this.scale, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

Map.prototype.draw = function (ctx) {
    ctx.drawImage(this.minimap, 0, 0);
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.arc(this.player.x / this.scale, this.player.y / this.scale, 1, 0, Math.PI * 2);
    ctx.fill();
    if (debugMode) {
        var i = this.currentQuadrantX - 1;
        if (i < 0) i += this.mapQuadrantWidth;
        var j = this.currentQuadrantY - 1;
        if (j < 0) j += this.mapQuadrantHeight;
        ctx.filleStyle = "black";
        ctx.fillText("(" + i + "," + j + ") " + this.whatever, 10, 120);
        ctx.fillText("(" + (i + 2) + "," + (j + 2) + ")", 10, 135);
    }
}

var barbar = true;
Map.prototype.update = function () {
    //if (this.player.x < 0) {
    //    this.player.x += this.mapWidth;
    //} else if (this.player.x >= this.mapWidth) {
    //    this.player.x -= this.mapWidth;
    //}
    //if (this.player.y < 0) {
    //    this.player.y += this.mapHeight;
    //} else if (this.player.y >= this.mapHeight) {
    //    this.player.y -= this.mapHeight;
    //}
    this.whatever = [1];
    this.currentQuadrantX = Math.floor(this.player.x / this.quadrantWidth);
    this.currentQuadrantY = Math.floor(this.player.y / this.quadrantHeight);
    var i = this.currentQuadrantX - 1;
    if (i < 0) i += this.mapQuadrantWidth;
    var jStart = this.currentQuadrantY - 1;
    if (jStart < 0) jStart += this.mapQuadrantHeight;
    var iStop = i + 2;
    var jStop = jStart + 2;
    for (; i <= iStop; i++) {
        for (j = jStart; j <= jStop; j++) {
            var q = this.quadrants[j % this.mapQuadrantHeight][i % this.mapQuadrantWidth];
            for (var k = 0; k < q.islands.length; k++) {
                var island = q.islands[k];
                if (island.isNearPlayer(this.player)) {
                    this.whatever.push(island);
                    if (island.dispose) {
                        island.addToGame();
                    }
                } else {
                    island.removeFromGame();
                }
            }
        }
    }
    barbar = false;
}



function Quadrant(x, y, w, h, d) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.density = d; //pixels in the quadrant per island
    this.islands = [];
}

Quadrant.prototype.init = function (game) {
    var attempts = Math.floor(this.width * this.height / this.density) - this.islands.length;
    for (var i = 0; i < attempts; i++) {
        var island = new TileMap(game, ASSET_MANAGER.getAsset("images/map_tiles.png"), 0, 0);
        var x = this.x + Math.random() * (this.width - island.detectionRadius);
        var y = this.y + Math.random() * (this.height - island.detectionRadius);
        island.x = x;
        island.y = y;
        island.init();
        this.islands.push(island);
    }
}



function TileMap(game, asset, x, y) {
    Entity.call(this, game, asset, x, y);
    this.mapData = null;
    this.imgCache = null;
    this.detectionRadius = null;
    this.mapXZero = null; //relative to x, the pixel coordinates of the top center of the tile at (0,0)
    this.mapYZero = null; //relative to y, the pixel coordinates of the top center of the tile at (0,0)
    this.tilePixelWidth = 38;  //How wide an individual tile is on the sprite sheet
    this.tilePixelHeight = 27; //How high an individual tile is on the sprite sheet
    this.tileMapWidth = 38;    //How wide an individual tile is on the game canvas
    this.tileMapHeight = 20;   //How high an individual tile is on the game canvas
    this.tileMapDepth = 7;     //How deep an individual tile is on the game canvas

    this.items = [];

    this.dispose = true;
}
TileMap.prototype = new Entity();
TileMap.prototype.constructor = TileMap;

//TileMap.prototype.update = function () {
//    var max = Math.max(this.tileMapWidth, this.tileMapHeight);
//    this.x = -this.player.x * this.tileMapWidth / max;
//    this.y = -this.player.y * this.tileMapHeight / max;
//}

TileMap.prototype.init = function () {
    this.generateMap();
    this.drawMap();
    this.addItem(new Item(this.game, ASSET_MANAGER.getAsset("images/diamond.png"), "Diamond", 0, 0), 2, 2);
}

//Randomly generate a new map.
TileMap.prototype.generateMap = function () {
    this.mapData = [
        [0x00000, 0x10000, 0x10000, 0x10000, 0x00000],
        [0x10000, 0x10000, 0x20000, 0x10000, 0x10000],
        [0x10000, 0x20000, 0x20000, 0x20000, 0x10000],
        [0x10000, 0x10000, 0x20000, 0x10000, 0x10000],
        [0x00000, 0x10000, 0x10000, 0x10000, 0x00000]
    ];
}

TileMap.prototype.drawMap = function () {
    var offCtx = null;
    if (!this.imgCache) {
        this.imgCache = document.createElement('Canvas');
        this.imgCache.width = (this.mapData[0].length + this.mapData.length) * this.tileMapWidth / 2;
        this.imgCache.height = (this.mapData.length + this.mapData[0].length) * this.tileMapHeight / 2 + this.tileMapDepth;
    }
    offCtx = this.imgCache.getContext('2d');
    offCtx.clearRect(0, 0, offCtx.width, offCtx.height);

    for (var j = 0; j < this.mapData.length; j++) {
        for (var i = this.mapData[j].length - 1; i >= 0; i--) {
            var tileID = (this.mapData[j][i] & 0xFF0000) >> 16;
            var low = 0;//this.mapData[j][i] & 0xFF;
            var high = 0;//(this.mapData[j][i] & 0xFF00) >> 8;
            for (var k = low; k <= high; k++) {
                offCtx.drawImage(this.img,
                              tileID * this.tilePixelWidth, 0,
                              this.tilePixelWidth, this.tilePixelHeight,
                              this.tileMapWidth / 2 * (i + j), this.tileMapHeight / 2 * (j + this.mapData[j].length - i - 1) - this.tileMapDepth * k,
                              this.tilePixelWidth, this.tilePixelHeight);
            }
        }
    }

    this.detectionRadius = Math.max(this.imgCache.width, this.imgCache.height) / 2 * Math.SQRT2;
    this.mapXZero = (this.tileMapWidth - this.imgCache.width) / 2;
    this.mapYZero = (-(this.mapData.length + this.mapData[0].length) / 2 * this.tileMapWidth + this.tileMapWidth * this.mapData[0].length) / 2;
}

TileMap.prototype.draw = function (ctx) {
    ctx.drawImage(this.imgCache,
                  this.x - this.game.camera.x - this.imgCache.width / 2,
                  ((this.y - this.game.camera.y) * tileYRatio - (this.imgCache.height - this.tileMapDepth) / 2));
    if (debugMode) {
        var centerX = this.x - this.game.camera.x;
        var centerY = this.y - this.game.camera.y;
        ctx.fillText(this.mapXZero.toFixed(2) + " " + this.mapYZero.toFixed(2), 10, 500);
        ctx.save();
        ctx.scale(1, tileYRatio);
        ctx.translate(0, this.tileMapDepth);
        ctx.strokeStyle = "black";
        ctx.fillStyle = "black";
        for (var i = 10; i < this.detectionRadius; i *= Math.log(i * 7)) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, i, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.detectionRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(this.x - this.game.camera.x - this.imgCache.width / 2, (this.y - this.game.camera.y) * tileYRatio - (this.imgCache.height - this.tileMapDepth) / 2);
        ctx.rect(this.x - this.game.camera.x - this.imgCache.width / 2, (this.y - this.game.camera.y) * tileYRatio - (this.imgCache.height - this.tileMapDepth) / 2,
                 this.imgCache.width, this.imgCache.height);
        ctx.stroke();
    }
}

TileMap.prototype.addItem = function (item, x, y) {
    this.items.push(item);
    item.x = this.x + this.mapXZero + this.tileMapWidth / 2 * (x + y);
    item.y = this.y + this.mapYZero + this.tileMapWidth / 2 * (y - x);
}

TileMap.prototype.addToGame = function () {
    this.game.addBackground(this);
    for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        if (!item.collected) {
            item.dispose = false;
            this.game.addEntity(item);
        }
    }
    this.dispose = false;
}

TileMap.prototype.removeFromGame = function () {
    for (var i = 0; i < this.items.length; i++) {
        this.items[i].dispose = true;
    }
    this.dispose = true;
}

//sqrt(dx^2 + dy^2) <= (island radius + player radius) + canvas diagonal distance
//dx^2 + dy^2 <= r^2 + 2r * sqrt(d) + d
TileMap.prototype.isNearPlayer = function (player) {
    var radiusDistance = this.detectionRadius + 10; //TODO add player collision radius
    var totalDistance = Math.pow(radiusDistance, 2) + 2 * radiusDistance * this.game.ctx.canvas.diagonal + Math.pow(this.game.ctx.canvas.diagonal, 2);
    var difference = Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2);
    return difference <= totalDistance;
}



function TestMap(game, asset, x, y) {
    TileMap.call(this, game, asset, x, y);
}
TestMap.prototype = new TileMap();
TestMap.prototype.constructor = TestMap;

TestMap.prototype.init = function () {
    this.generateMap();
    this.drawMap();
    this.game.addBackground(this);
}

TestMap.prototype.generateMap = function () {
    this.mapData = gameMap;
}


function Item(game, asset, name, drawOffsetX, drawOffsetY) {
    Entity.call(this, game, asset, 0, 0);
    this.name = name;
    this.drawOffsetX = drawOffsetX;
    this.drawOffsetY = drawOffsetY;
    this.collected = false;
}
Item.prototype = new Entity();
Item.prototype.constructor = Item;

Item.prototype.draw = function (ctx) {
    Entity.prototype.draw.call(this, ctx);
    if (debugMode) {
        ctx.fillStyle = "black";
        ctx.fillText(this.x.toFixed(2) + " " + this.y.toFixed(2), 10, 130);

        ctx.save();
        ctx.scale(1, tileYRatio);
        var centerX = this.x - this.game.camera.x;
        var centerY = this.y - this.game.camera.y;
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 19, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

Item.prototype.update = function () {
    if (Math.pow(this.game.player.x - this.x, 2) + Math.pow(this.game.player.y - this.y, 2) <= Math.pow(19, 2)) {
        this.collected = true;
        this.dispose = true;
        this.game.player.addItem(this.name);
    }
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
var tileYRatio = tileMapHeight / tileMapWidth;

ASSET_MANAGER.queueDownload("images/test.png");
ASSET_MANAGER.queueDownload("images/test_shadow.png");
ASSET_MANAGER.queueDownload("images/map.gif");
ASSET_MANAGER.queueDownload("images/map_tiles.png");
ASSET_MANAGER.queueDownload("images/sky_bg.png");
ASSET_MANAGER.queueDownload("images/enemy.png");
ASSET_MANAGER.queueDownload("images/diamond.png");
//Pokemon Mystery Dungeon sprite sheet
ASSET_MANAGER.queueDownload("images/PMD_sprites.png");
ASSET_MANAGER.downloadAll(function () {
    //console.log("Assets all loaded with " + ASSET_MANAGER.successCount + " successes and " + ASSET_MANAGER.errorCount + " errors.");
    var engine = new GameEngine();
    engine.init(document.getElementById("gameWorld").getContext("2d"));
    var player = new Player(engine, ASSET_MANAGER.getAsset("images/PMD_sprites.png"), 50, 50);
    var enemy = new Enemy(engine, ASSET_MANAGER.getAsset("images/enemy.png"), ASSET_MANAGER.getAsset("images/test_shadow.png"), 300, 300, 30);
    engine.player = player;
    engine.addBackground(new Entity(engine, ASSET_MANAGER.getAsset("images/sky_bg.png"), 200, 200));
    engine.addEntity(player);
    engine.addEntity(enemy);
    engine.player = player;
    engine.camera = new Camera(engine, player);
    engine.addEntity(engine.camera);
    var testMap = new TestMap(engine, ASSET_MANAGER.getAsset("images/map_tiles.png"), 0, 0);
    testMap.init();
    var miniMap = new Map(engine, player);
    miniMap.initMap();
    miniMap.addIsland(testMap);
    miniMap.generateMap();
    engine.addEntity(miniMap);
    testMap.addItem(new Item(engine, ASSET_MANAGER.getAsset("images/diamond.png"), "Diamond", 0, 0), 1, 0);
    testMap.addItem(new Item(engine, ASSET_MANAGER.getAsset("images/diamond.png"), "Diamond", 0, 0), 0, 0);
    testMap.addItem(new Item(engine, ASSET_MANAGER.getAsset("images/diamond.png"), "Diamond", 0, 0), 0, 1);
    testMap.addItem(new Item(engine, ASSET_MANAGER.getAsset("images/diamond.png"), "Diamond", 0, 0), 0, 2);
    engine.start();
});