let socket = io();
let clickedCol;
let user;
let gameBoard;

function init() {
    console.log("init");
    gameBoard = document.getElementById("game");
    for (let i = 0; i < 7; i++) {
        document.getElementById("col" + i).addEventListener("click", () => {clickedCol = i});
        document.getElementById("col" + i).addEventListener("click", makeMove);
    }
    user = document.getElementById("usernameHeader").innerHTML;
    // socket.emit("setgame", window.location.href.slice(-1));
    // socket.emit("setname", user);
    // drawPiece({colour:"y", col:6, height:5});
}


// let ajax = new XMLHttpRequest();
// ajax.onreadystatechange = function() {
//     if (this.readyState == 4) {
//         if (this.status == 409) {
//             alert(this.responseText);
//         } else if (this.status == 200) {
//             window.location.href = "/home";
//         } else if (this.status == 201) {
//             login();
//         }
//     }
// }

function makeMove() {
    console.log(clickedCol);
    // TODO: send PUT to /games/gameID with {move} (no user cuz i can use session)
}

function drawPiece(piece) {
    //piece: {colour:"y"/"r"/"blank", col:0-6, height:0-5}
    console.log("draw");
    let circle = document.getElementById('x'+piece.col+'y'+piece.height);
    let inColour = '#f7eecb';
    let outColour = '#f7eecb';
    if (piece.colour === "y") {
        inColour = '#fff040';
        outColour = '#ffcc00';
    } else if (piece.colour === "r") {
        inColour = '#f04020';
        outColour = '#cc0000';
    }
    circle.style.stroke = outColour;
    circle.style.fill = inColour;
    // let newCircle = document.createElement('circle');
    // newCircle.cx = piece.col * 100 + 50;
    // newCircle.cy = piece.height * 100 + 50;
    // newCircle.r = 35;
    // newCircle.stroke = outColour;
    // newCircle["stroke-width"] = 6;
    // newCircle.fill = inColour;
    // console.log(newCircle);
    // gameBoard.appendChild(newCircle);
}
