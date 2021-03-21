let from;
let to;

function init() {
    console.log("init");
    from = document.getElementById("usernameHeader").innerHTML;
}

let ajax = new XMLHttpRequest();
ajax.onreadystatechange = function() {
    if (this.readyState == 4) {
        alert(this.responseText);
    }
}

function sendFriendRequest(button) {
    to = button.id.slice(3);
    console.log(to);
    ajax.open("PUT", "/users/"+to, true);
    ajax.setRequestHeader("Content-Type", "application/json");
    ajax.send(JSON.stringify({friendReq:from}));
}
