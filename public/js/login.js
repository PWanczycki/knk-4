function init() {
    console.log("init");
    document.getElementById("register").addEventListener("click", createUser);
    document.getElementById("login").addEventListener("click", login);
}

let username;
let password;

function getUserInfo() {
    username = document.getElementById("username").value;
    password = document.getElementById("password").value;
}

let ajax = new XMLHttpRequest();
ajax.onreadystatechange = function() {
    if (this.readyState == 4) {
        if (this.status == 409) {
            alert(this.responseText);
        } else if (this.status == 200) {
            window.location.href = "/home";
        } else if (this.status == 201) {
            login();
        }
    }
}

function createUser() {
    console.log("createUser");
    getUserInfo();
    ajax.open("POST", "/users", true);
    console.log({username,password});
    ajax.setRequestHeader("Content-Type", "application/json");
    ajax.send(JSON.stringify({username,password}));
}

function login() {
    getUserInfo();
    ajax.open("POST", "/login", true);
    ajax.setRequestHeader("Content-Type", "application/json");
    ajax.send(JSON.stringify({username,password}));
}
