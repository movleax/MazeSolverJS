var canvas;
var ctx;
var fileLoaded;
var map;
var BlockWidth;
var BlockHeight;
var blocks;
var gameLoopInterval;
var mazeSolverAlgorithms;
var simSpeed;
var endGame;

function LoadGame()
{
   canvas = document.getElementById("myCanvas");
   ctx = canvas.getContext("2d");
   fileLoaded = false;
   map;
   BlockWidth = 16;
   BlockHeight = 16;
   blocks = [];
   gameLoopInterval;
   mazeSolverAlgorithms = [];
   simSpeed = 125;
   endGame = new EndGame(ctx);
}

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

function ReloadGame()
{
    blocks = [];
    ParseMap();
    endGame.ResetEndGame();
    gameLoopInterval = setInterval(GameCycle, simSpeed);
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
            ChangeMazeAlgorithm($("#algorithm-span").text());
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

class Direction 
{
    constructor(east, west, north, south)
    {
        // copy constructor hack
        if (east instanceof Direction)
        {
            this.East = east.East;
            this.West = east.West;
            this.North = east.North;
            this.South = east.South;
        }
        else
        {
            this.East = {directionMagnitude: east};
            this.West = {directionMagnitude: west};
            this.North = {directionMagnitude: north};
            this.South = {directionMagnitude: south};
        }
    }
}

class Node
{
    constructor(nodeValue)
    {
        this.neighborNodes = [];
        this.nodeValue = nodeValue;
    }

    AddNeighborNode(n)
    {
        this.neighborNodes.push(n);
    }

}

class PathNodes
{
    constructor()
    {
        this.nodes = new Node();
        this.head = this.nodes;
    }

    AddNeighborNode(n)
    {
        this.nodes.AddNeighborNode(n);
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
        
        this.Direction = new Direction(w, -w, -h, h);
        this.ListOfAvailableDirections = [];

        this.strategy = new ChooseRightPath();// Random();
        this.pathNodes = new PathNodes();

        this.currentDirection = this.Direction.East;
        this.velocity.UpdateVector(this.Direction.East.directionMagnitude, 0);

        this.characterProxy = new CharacterProxy(this);
    }

    ChangeStrategy(newStrategy)
    {
        if(!(newStrategy instanceof Strategy))
        {
            return;
        }

        this.strategy = newStrategy;
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
        this.ListOfAvailableDirections = [];

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
                case this.cBoxEast: this.ListOfAvailableDirections.push(this.Direction.East); break;
                case this.cBoxWest: this.ListOfAvailableDirections.push(this.Direction.West); break;
                case this.cBoxNorth: this.ListOfAvailableDirections.push(this.Direction.North); break;
                case this.cBoxSouth: this.ListOfAvailableDirections.push(this.Direction.South); break;
            }
        }

        this.currentDirection = this.strategy.Execute(this.characterProxy);

        // Also change our velocity vector
        switch(this.currentDirection)
        {
            case this.Direction.East: this.velocity.UpdateVector(this.Direction.East.directionMagnitude, 0); break;
            case this.Direction.West: this.velocity.UpdateVector(this.Direction.West.directionMagnitude, 0); break;
            case this.Direction.North: this.velocity.UpdateVector(0, this.Direction.North.directionMagnitude); break;
            case this.Direction.South: this.velocity.UpdateVector(0, this.Direction.South.directionMagnitude); break;
        }
    }

    GetListOfAvailableDirections()
    {
        return this.ListOfAvailableDirections;
    }

    GetCurrentDirection()
    {
        return this.currentDirection;
    }

    GetDirectionValues()
    {
        return this.Direction;
    }

    GetPosition()
    {
        return this.cBox.GetPosition(); // return vector2D
    }
}

class CharacterProxy
{
    constructor(character)
    {
        this.character = character;
    }

    GetListOfAvailableDirections()
    {
        return this.character.GetListOfAvailableDirections();
    }

    GetCurrentDirection()
    {
        return this.character.GetCurrentDirection();
    }

    GetDirectionValues()
    {
        return this.character.GetDirectionValues();
    }

    GetPosition()
    {
        return this.character.GetPosition(); // return vector2D
    }
}

class Strategy
{
    constructor()
    {

    }

    Execute(characterProxy)
    {
        throw "Must implement Execute() before using it!";
    }
}

class ChooseRightPath extends Strategy
{
    constructor()
    {
        super();
        this.currentNode;
        this.previousNode;
        this.NodeValue = 1;
    }

    Execute(characterProxy)
    {
        let currentDirection = characterProxy.GetCurrentDirection();
        let ListOfAvailableDirections = characterProxy.GetListOfAvailableDirections();
        let directionValues = characterProxy.GetDirectionValues();
        let x = characterProxy.GetPosition().x;
        let y = characterProxy.GetPosition().y;
        let xOffset = x;
        let yOffset = y;

        if(this.currentNode == null)
        {
            this.currentNode = new Node({x:x, y:y, value:this.NodeValue});
            this.NodeValue++;
        }

        // find the backwards direction
        let backwardsDirection;
        switch(currentDirection)
        {
            case directionValues.East: backwardsDirection = directionValues.West; break;
            case directionValues.West: backwardsDirection = directionValues.East; break;
            case directionValues.North: backwardsDirection = directionValues.South; break;
            case directionValues.South: backwardsDirection = directionValues.North; break;
        }

        let newDirection = currentDirection;
        switch(currentDirection)
        {
                case directionValues.East: newDirection = directionValues.South; yOffset += newDirection.directionMagnitude; break;
                case directionValues.West: newDirection = directionValues.North; yOffset += newDirection.directionMagnitude; break;
                case directionValues.North: newDirection = directionValues.East; xOffset += newDirection.directionMagnitude; break;
                case directionValues.South: newDirection = directionValues.West; xOffset += newDirection.directionMagnitude; break;
        }

        for(let i=0; i < 4 && (ListOfAvailableDirections.indexOf(newDirection) < 0 || newDirection == backwardsDirection); i++)
        {
            xOffset = x;
            yOffset = y;

            if(i == 3)
            {
                newDirection = backwardsDirection;
                switch(backwardsDirection)
                {
                    case directionValues.East: xOffset += newDirection.directionMagnitude; break;
                    case directionValues.West: xOffset += newDirection.directionMagnitude; break;
                    case directionValues.North: yOffset += newDirection.directionMagnitude; break;
                    case directionValues.South: yOffset += newDirection.directionMagnitude; break;
                }
            }
            else
            {
                switch(newDirection)
                {
                    case directionValues.East: newDirection = directionValues.South; yOffset += newDirection.directionMagnitude; break;
                    case directionValues.West: newDirection = directionValues.North; yOffset += newDirection.directionMagnitude; break;
                    case directionValues.North: newDirection = directionValues.East; xOffset += newDirection.directionMagnitude; break;
                    case directionValues.South: newDirection = directionValues.West; xOffset += newDirection.directionMagnitude; break;
                }
            }
        }

        // make neighbor nodes if they don't exist
        if(this.currentNode.neighborNodes.length <= 0)
        {
            for(let i=0; i < ListOfAvailableDirections.length; i++)
            {
                if(ListOfAvailableDirections[i] == backwardsDirection && this.previousNode != null)
                {
                    this.currentNode.neighborNodes.push(this.previousNode);
                    continue;
                }

                if(newDirection == backwardsDirection)
                {
                    continue;
                }

                if(ListOfAvailableDirections[i] == newDirection)
                {
                    this.currentNode.neighborNodes.push(new Node({x:xOffset, y:yOffset, value:this.NodeValue}));
                    this.NodeValue++;
                    continue;
                }

                switch(ListOfAvailableDirections[i])
                {
                    case directionValues.East: this.currentNode.neighborNodes.push(new Node({x:x+directionValues.East.directionMagnitude, y:y, value:-1})); break;
                    case directionValues.West: this.currentNode.neighborNodes.push(new Node({x:x-directionValues.West.directionMagnitude, y:y, value:-1})); break;
                    case directionValues.North: this.currentNode.neighborNodes.push(new Node({x:x, y:y-directionValues.North.directionMagnitude, value:-1})); break;
                    case directionValues.South: this.currentNode.neighborNodes.push(new Node({x:x, y:y+directionValues.North.directionMagnitude, value:-1})); break;
                }
            }  
        }

        let chosenNode = this.currentNode;
        for(let i =0; i < this.currentNode.neighborNodes.length; i++)
        {
            let n = this.currentNode.neighborNodes[i];
            if(n.nodeValue.x == xOffset && n.nodeValue.y == yOffset)
            {
                chosenNode = n;
                break;
            }
        }
        
        for(let i=0; i < this.currentNode.neighborNodes.length && chosenNode.nodeValue.value < this.currentNode.nodeValue.value-1; i++)
        {  
            let n = this.currentNode.neighborNodes[i];
            if(n.nodeValue.value < chosenNode.nodeValue.value)
            {
                chosenNode = n;

                // figure out the new direction if the node changed
                if(chosenNode.nodeValue.x > x)
                {
                    newDirection = directionValues.East;
                }
                else if(chosenNode.nodeValue.x < x)
                {
                    newDirection = directionValues.West;
                }
                // figure out the new direction if the node changed
                if(chosenNode.nodeValue.y > y)
                {
                    newDirection = directionValues.North;
                }
                else if(chosenNode.nodeValue.y < y)
                {
                    newDirection = directionValues.South;
                }
            }
        }

        // if we changed the node, make sure the previous node is one we don't want to visit again
        if(chosenNode.nodeValue.x != xOffset || chosenNode.nodeValue.y != yOffset)
        {
            this.currentNode.nodeValue.value = this.currentNode.nodeValue.value*1000;
        }

        this.previousNode = this.currentNode;
        this.currentNode = chosenNode;
        this.currentNode.nodeValue.value = this.NodeValue;
        this.NodeValue++;

        return newDirection;
    }

    ChooseNextRight(currentDirection, directionValues)
    {
        
    }

}

class Random extends Strategy
{
    constructor()
    {
        super();

    }

    Execute(characterProxy)
    {
        let currentDirection = characterProxy.GetCurrentDirection();
        let ListOfAvailableDirections = characterProxy.GetListOfAvailableDirections();
        let directionValues = characterProxy.GetDirectionValues();

        // see if our list of available directions contians our current direction. If it is, then return; we will continue following our first direction
        if(ListOfAvailableDirections.length <= 2 && ListOfAvailableDirections.indexOf(currentDirection) >= 0)
        {
            return currentDirection;
        }

        // find the backwards direction
        let backwardsDirection;
        switch(currentDirection)
        {
            case directionValues.East: backwardsDirection = directionValues.West; break;
            case directionValues.West: backwardsDirection = directionValues.East; break;
            case directionValues.North: backwardsDirection = directionValues.South; break;
            case directionValues.South: backwardsDirection = directionValues.North; break;
        }

        if(ListOfAvailableDirections.length >= 2 && Math.random() > 0.1)
        {
            let backwardsDirectionIndex = ListOfAvailableDirections.indexOf(backwardsDirection);
            ListOfAvailableDirections.splice(backwardsDirectionIndex, 1);
        }
        
        // If we have hit a wall going our current direction, decide a new route based on the options available
        currentDirection = ListOfAvailableDirections[Math.floor(Math.random()*ListOfAvailableDirections.length)];

        return currentDirection;
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

class EndGame
{
    constructor(ctx)
    {
        if(!EndGame.instance)
        {
            this.x = ctx.canvas.width/4;
            this.y = ctx.canvas.height/2;
            this.endGameTriggered = false;

            EndGame.instance = this;
        }

        return EndGame.instance;
    }

    Draw()
    {
        if(this.endGameTriggered)
        {
            ctx.beginPath();
            ctx.rect(this.x-this.x/2 + 15, this.y-this.y/5, this.x*3, this.y/2);
            ctx.fillStyle = "black";
            ctx.globalAlpha = 0.85;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.closePath();

            ctx.font = "30px Arial";
            ctx.fillStyle = '#5b9aa0';
            ctx.fillText("Made it to the end!", this.x, this.y);
            ctx.fillText("Click anywhere to restart...", this.x-this.x/4, this.y+35);
        }
    }

    CallReloadGame()
    {
        ReloadGame();
    }
    
    TriggerEndGame()
    {
        clearInterval(gameLoopInterval);
        this.endGameTriggered = true;

        canvas.addEventListener("click", this.CallReloadGame);
    }

    ResetEndGame()
    {
        this.endGameTriggered = false;
        canvas.removeEventListener("click", this.CallReloadGame)
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

    endGame.Draw();
}

function GameLogic()
{
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
                if(blocks[A] instanceof Character && blocks[B] instanceof End)
                {
                    endGame.TriggerEndGame();
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

    // Update positions
    for(var it in blocks)
    {
        if(blocks[it] instanceof MovableBlock)
        {
            blocks[it].Move();
        }
    }
}

function GameCycle()
{
    GameLogic();

    Draw();
}

function ChangeMazeAlgorithm(name)
{
    let character;
    for(let i=0; i < blocks.length; i++)
    {
        if(blocks[i] instanceof Character)
        {
            character = blocks[i];
            break;
        }
    }

    $("#algorithm-span").text(name);

    if(character == null)
    {
        return;
    }

    switch(name)
    {
    case "Random": character.ChangeStrategy(new Random()); break;
    case "Right-most Path": character.ChangeStrategy(new ChooseRightPath()); break;
    }
}

function SetupMazeAlgorithms()
{
    let dropDown = $(".dropdown-menu");

    mazeSolverAlgorithms.push("Random");
    mazeSolverAlgorithms.push("Right-most Path");

    for(let i=0; i < mazeSolverAlgorithms.length; i++)
    {
        let a = $("<a>");
        a.attr("href", "#");
        a.text(mazeSolverAlgorithms[i]);

        let li = $("<li>").append(a);
        dropDown.append(li);
    }

    $("#algorithm-span").text("Random");
}

function ChangeSimulationSpeed(value)
{
    simSpeed = 1001 - Math.floor(Math.log(value)*21.3 + 1)*10;

    if(!endGame.endGameTriggered)
    {
        clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(GameCycle, simSpeed);
    }

    $("#speed-badge").text(value);
}

SetupMazeAlgorithms();

ChangeSimulationSpeed(50);

$(document).ready(()=>{
    $(".dropdown-menu li").on("click", function (e){
        let dropDownChoice = $(this);
        ChangeMazeAlgorithm(dropDownChoice.text());
    });

    let isSliderDragging = false;
    $("#speed").on({
        mousedown: function(){
            isSliderDragging = true;
        }, 
        mousemove: function(){
            if(isSliderDragging)
            {
                let slider = $(this);
                ChangeSimulationSpeed(slider.val());
            }
        }, 
        mouseup: function(){
            isSliderDragging = false;
        }
    });

    LoadGame();
});