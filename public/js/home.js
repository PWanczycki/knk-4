let user;
let opp;
let vis;

function init() {
    user = document.getElementById("usernameHeader").innerHTML;
    document.getElementById("creategame").addEventListener("click", newGame);
}

let ajax = new XMLHttpRequest();
ajax.onreadystatechange = function() {
    if (this.readyState == 4) {
        alert(this.responseText);
    }
}

function getInfo() {
    opp = 
}

function newGame() {

}
