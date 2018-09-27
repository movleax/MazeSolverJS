var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var fileLoaded = false;
var map;
var BlockWidth = 16;
var BlockHeight = 16;
var blocks = [];

function readSingleFile(evt) 
{
    //Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0]; 
    var result;
    if (f) {
      var r = new FileReader();
      r.onload = function(e) { 
          var contents = e.target.result;
        //console.log(r.result);
        result = r.result;
        map = result;
        fileLoaded = true;
        //console.log(map);
      }
      r.readAsText(f);
      
    } else { 
      alert("Failed to load file");
    }
    
    checkLoad();
}
  
document.getElementById('fileinput').addEventListener('change', readSingleFile, false);
    
function checkLoad() 
{
    if (!fileLoaded) 
    {
        console.log("waiting...");
        setTimeout("checkLoad();", 1000);
        return;
    } 
    else 
    {
        console.log("in...");
        console.log(map);
        ParseMap();
    }
}

function ParseMap()
{
    var x=0;
    var y=0;

    for(var i=0; i < map.length; i++)
    {
        if(map[i] == '\r')
        {
            y += BlockHeight;
            x = 0;
            continue;
        }
        else if(map[i] == '\n')
        {
            continue;
        }
        
        if(map[i] == 'X')
        {
            blocks.push(new Block(x, y, BlockWidth, BlockHeight, ctx));
        }
        if(map[i] == "S")
        {
            // x+(BlockWidth/4), y+(BlockWidth/4), BlockWidth-(BlockWidth/2), BlockHeight-(BlockWidth/2)
            blocks.push(new Character(x, y, BlockWidth, BlockHeight, ctx));
        }
        if(map[i] == "E")
        {
            //x+(BlockWidth/4), y+(BlockWidth/4), BlockWidth-(BlockWidth/2), BlockHeight-(BlockWidth/2)
            blocks.push(new End(x, y, BlockWidth, BlockHeight, ctx));
        }
        
        x += BlockWidth;
    }
}

class Vector2D
{
    constructor(x, y)
    {
        this.x = x == undefined ? 0 : x;
        this.y = y == undefined ? 0 : y;
    }

    GetVector2D()
    {
        return new Vector2D(this.x, this.y);
    }

    UpdateVector(x, y)
    {
        this.x = x;
        this.y = y;
    }
}

class Rectangle
{
    constructor(x, y, w, h)
    {
        this.position = new Vector2D(x, y);
        this.w = w;
        this.h = h;
    }

    UpdateRectangle(x, y, w, h)
    {
        this.position.UpdateVector(x, y);
        this.w = w;
        this.w = h;
    }

    GetRectangle()
    {
        return new Rectangle(this.x, this.y, this.w, this.h);
    }

    GetPosition()
    {
        return this.position;
    }
}

class CollisionBox extends Rectangle
{
    constructor(x, y, w, h)
    {
        super(x, y, w, h);
        this.hasCollided = false;
    }
    
    UpdateCollisionBox(x, y, w, h)
    {
        this.UpdateRectangle(x, y, w, h);
    }
}

class CollidableObject
{
    constructor(x, y, w, h)
    {
        this.cBox = new CollisionBox(x, y, w, h);
    }

    UpdateCollisionBox(x, y, w, h)
    {
        this.cBox.UpdateCollisionBox(x, y, w, h);
    }

    GetCollisionBox()
    {
        return this.cBox;
    }

    CheckCollision(otherCollisionBox)
    {
        if( this.cBox.position.x + this.cBox.w >= otherCollisionBox.position.x && this.cBox.position.x <= otherCollisionBox.position.x + otherCollisionBox.w
         && this.cBox.position.y + this.cBox.y >= otherCollisionBox.position.y && this.cBox.position.y <= otherCollisionBox.position.y + otherCollisionBox.h)
        {
            this.cBox.hasCollided = true;
            return true;
        }

        this.cBox.hasCollided = false;
        return false;
    }

    CollisionAction(callback, args)
    {
        var argumentsList = "";
        for (var i = 0; i < arguments.length; i++) 
        {
            if(i > 0 && i < arguments.length-1)
            {
                argumentsList += ", ";
            }
            argumentsList += arguments[i];
        }

        eval(String(callback) + "(" + argumentsList + ");");
    }
}

class Block extends CollidableObject
{
    constructor(x, y, w, h, ctx)
    {
        super(x, y, w, h);
        this.ctx = ctx;

        this.rect = new Rectangle(x, y, w ,h);
    }
    
    Draw()
    {
        ctx.beginPath();
        ctx.rect(this.rect.position.x, this.rect.position.y, this.rect.w, this.rect.h);
        ctx.fillStyle = "#c0c7d3";
        ctx.fill();
        ctx.closePath();
    }
    
    GetPosition()
    {
        return this.rect.GetPosition();
    }
}

class MovableBlock extends Block
{
    constructor(x, y, w, h, ctx)
    {
        super(x, y, w, h, ctx);
        this.velocity = new Vector2D(0, 0);
    }

    SetVelocity(x, y)
    {
        this.velocity.UpdateVector(x, y);
    }

    GetVelocityVector()
    {
        return this.velocity;
    }

    UpdateCollisionBoxPosition()
    {
        this.cBox.position.x = this.rect.position.x;
        this.cBox.position.y = this.rect.position.y;
    }

    Move()
    {
        this.rect.position.x += this.velocity.x;
        this.rect.position.y += this.velocity.y;

        this.UpdateCollisionBoxPosition();
    }
}

class Character extends MovableBlock
{
    constructor(x, y, w, h, ctx)
    {
        super(x, y, w, h, ctx);

        this.cBoxEast = new CollisionBox(x+w, y, w, h);
        this.cBoxWest = new CollisionBox(x-w, y, w, h);
        this.cBoxNorth = new CollisionBox(x, y-h, w, h);
        this.cBoxSouth = new CollisionBox(x, y+h, w, h);
        this.cBoxArr = [this.cBox, this.cBoxEast, this.cBoxWest, this.cBoxNorth, this.cBoxSouth];
        
        this.Direction = Object.freeze({
            East:   {directionMagnitude: w},
            West:  {directionMagnitude: -w},
            North: {directionMagnitude: -h},
            South: {directionMagnitude: h}
        });

        this.currentDirection = this.Direction.East;
        this.velocity.UpdateVector(this.Direction.East.directionMagnitude, 0);
    }

    // Override
    UpdateCollisionBoxPosition()
    {
        super.UpdateCollisionBoxPosition();
        
        for(var i=0; i < this.cBoxArr.length; i++)
        {
            switch(this.cBoxArr[i])
            {
                case this.cBoxEast: this.cBoxArr[i].UpdateCollisionBox(this.rect.position.x + this.rect.w, this.rect.position.y, this.cBoxArr[i].w, this.cBoxArr[i].h); break;
                case this.cBoxWest: this.cBoxArr[i].UpdateCollisionBox(this.rect.position.x - this.rect.w, this.rect.position.y, this.cBoxArr[i].w, this.cBoxArr[i].h); break;
                case this.cBoxNorth: this.cBoxArr[i].UpdateCollisionBox(this.rect.position.x, this.rect.position.y - this.rect.h, this.cBoxArr[i].w, this.cBoxArr[i].h); break;
                case this.cBoxSouth: this.cBoxArr[i].UpdateCollisionBox(this.rect.position.x, this.rect.position.y + this.rect.h, this.cBoxArr[i].w, this.cBoxArr[i].h); break;
            }

            // set the hasCollided to false
            this.cBoxArr[i].hasCollided = false;
        }
    }
            
    Draw()
    {
        ctx.beginPath();
        ctx.rect(this.rect.position.x, this.rect.position.y, this.rect.w, this.rect.h);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.closePath();
    }

    CheckCollision(otherCollisionBox)
    {
        var retVal = false
        for(var i=0; i < this.cBoxArr.length; i++)
        {
            if( this.cBoxArr[i].position.x + this.cBoxArr[i].w > otherCollisionBox.position.x && this.cBoxArr[i].position.x < otherCollisionBox.position.x + otherCollisionBox.w 
             && this.cBoxArr[i].position.y + this.cBoxArr[i].h > otherCollisionBox.position.y && this.cBoxArr[i].position.y < otherCollisionBox.position.y + otherCollisionBox.h )
            {
                this.cBoxArr[i].hasCollided = true;
                retVal = true;
            }
        }
        
        return retVal;
    }

    DecideDirection()
    {
        var ListOfAvailableDirections = [];

        //console.log("In character DecideDirection")

        // find out the available directions
        for(var i=0; i < this.cBoxArr.length; i++)
        {
            if(this.cBoxArr[i].hasCollided)
            {
                continue;
            }
            switch(this.cBoxArr[i])
            {
                case this.cBoxEast: ListOfAvailableDirections.push(this.Direction.East); break;
                case this.cBoxWest: ListOfAvailableDirections.push(this.Direction.West); break;
                case this.cBoxNorth: ListOfAvailableDirections.push(this.Direction.North); break;
                case this.cBoxSouth: ListOfAvailableDirections.push(this.Direction.South); break;
            }
        }

        // see if our list of available directions contians our current direction. If it is, then return; we will continue following our first direction
        if(ListOfAvailableDirections.indexOf(this.currentDirection) >= 0)
        {
            console.log("skip change direction")
            return;
        }

        // If we have hit a wall going our current direction, decide a new route based on the options available
        this.currentDirection = ListOfAvailableDirections[Math.floor(Math.random()*ListOfAvailableDirections.length)];
        
        // Also change our velocity vector
        switch(this.currentDirection)
        {
            case this.Direction.East: this.velocity.UpdateVector(this.Direction.East.directionMagnitude, 0); break;
            case this.Direction.West: this.velocity.UpdateVector(this.Direction.West.directionMagnitude, 0); break;
            case this.Direction.North: this.velocity.UpdateVector(0, this.Direction.North.directionMagnitude); break;
            case this.Direction.South: this.velocity.UpdateVector(0, this.Direction.South.directionMagnitude); break;
        }
        
    }
}

class End extends Block
{
    constructor(x, y, w, h, ctx)
    {
        super(x, y, w, h, ctx);
    }
    
    Draw()
    {
        ctx.beginPath();
        ctx.rect(this.rect.position.x, this.rect.position.y, this.rect.w, this.rect.h);
        ctx.fillStyle = "blue";
        ctx.fill();
        ctx.closePath();
    }
}


function Draw() 
{
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // draw background
    ctx.fillStyle = '#162802';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    
    
    for(var it in blocks)
    {
        blocks[it].Draw();
    }
}

function GameLogic()
{
    // Update positions
    for(var it in blocks)
    {
        if(blocks[it] instanceof MovableBlock)
        {
            blocks[it].Move();
        }
    }

    // check collisions
    for(var A in blocks)
    {
        for(var B in blocks)
        {
            if(blocks[A] == blocks[B])
            {
                continue;
            }

            if(blocks[A].CheckCollision(blocks[B].GetCollisionBox()))
            {
                if(blocks[A] instanceof Character)
                {
                    //console.log("made in collision")
                    //blocks[A].DecideDirection();
                    //break;
                }
            }
        }
    }

    // perform logically decisions
    for(var it in blocks)
    {
        if(blocks[it] instanceof Character)
        {
            //console.log("made in collision")
            blocks[it].DecideDirection();
            //break;
        }
    }
}

function GameCycle()
{
    GameLogic();

    Draw();
}

setInterval(GameCycle, 125);
