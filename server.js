const http = require('http');
const express = require("express");
const session = require("express-session");
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
// const fs = require("fs");
// const path = require("path");
const pug = require("pug");

const renderLogin = pug.compileFile("./public/views/login.pug");
const renderHome = pug.compileFile("./public/views/home.pug");

app.use(session({secret:"dont tell anyone"}));

app.locals.users = require("./business-logic/users.json");
app.locals.games = require("./business-logic/games.json");
app.locals.nextGameID = 4;
app.locals.mmq = {public: [], private: [], friendsOnly: []}; // random matchmaking queue

// let mimes = {
//     ".js": "application/javascript",
//     ".html": "text/html",
//     ".css": "text.css",
//     ".png": "image.png"
// };

let userRouter = require("./user-router.js");
app.use("/users", userRouter);
let gameRouter = require("./game-router.js");
app.use("/games", gameRouter);

app.use(express.static("public"));
app.get("/", sendLogin);
app.get("/login", sendLogin);
app.post("/login", express.json(), createSession);
app.get("/logout", deleteSession);
app.get("/home", checkLogin, loadActiveGames);
app.get("/home", sendHome);

function checkLogin(req, res, next) {
    res.format({
        "text/html": function () {
            if (req.session.loggedin) {
                next();
            } else {
                res.redirect("/login");
            }
        },
        default: function () {
            next();
        }
    });
}

function sendLogin(req, res, next) {
    res.status(200).send(renderLogin({}));
}

function createSession(req, res, next) {
    if (req.session.loggedin) {
        res.redirect("/home");
        return;
    }

    let username = req.body.username;
    let password = req.body.password;

    if (app.locals.users.hasOwnProperty(username)) {
        if (app.locals.users[username].password === password) {
            req.session.loggedin = true;
            req.session.username = username;
            app.locals.users[username].status = "online";
            res.status(200).send();
        } else {
            res.status(409).send("Invalid username or password");
        }
    } else {
        res.status(409).send("Invalid username or password");
    }

}

function deleteSession(req, res, next) {
    app.locals.users[req.session.username].status = "offline";
    req.session.loggedin = false;
    res.redirect("/");
}

function loadActiveGames(req, res, next) {
    let result = [];
    app.locals.users[req.session.username].activeGames.forEach(game => {
        result.push(app.locals.games[game]);
    });
    res.activeGames = result;
    next();
}

function sendHome(req, res, next) {
    res.status(200).send(renderHome({user:app.locals.users[req.session.username], active:res.activeGames}));
}

server.listen(3000);
console.log("Server listening at http://127.0.0.1:3000");

io.on("connection", socket => {
    console.log("Client connected");

    socket.on("setgame", game => {
        socket.game = game;
    });

    socket.on('setname', name => {
        socket.username = name;
        console.log(socket.username + ", " + socket.game);
    });
});


/*
const server = http.createServer(function (req, res) {
    if (req.method === "GET") {
        let fileurl;
        if (req.url === "/" || req.url === "/login") {
            getResource("views/login.html", res);
        } else if (req.url === "/design.css") {
            getResource("views/design.css", res);
        } else if (req.url === "/default_pfp.png") {
            getResource("views/resources/default_pfp.png", res);
        } else if (req.url === "/home") {
            getResource("views/home.html", res);
        } else if (req.url === "/play") {
            getResource("views/play.html", res);
        } else if (req.url === "/profile") {
            // getResource("views/profile.html", res);
            let content = renderProfile(users.user1);
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            res.end(content);
            // only direct user info for now (no game info or friend status)
        } else {
            send404(res);
        }
    } else {
        send404(res);
    }
});

function getResource(fileurl, res) {
    let fileExt = path.extname(fileurl);
    let mimeType = mimes[fileExt];
    if (!mimeType) {
        send404(res);
        return;
    }
    fs.readFile(fileurl, function(err,data) {
        if (err) {
            send500(res);
            return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", mimeType);
        res.end(data);
    });
}
*/

// function send404(response) {
//     response.statusCode = 404;
//     response.end("Error 404: Resource not found");
// }

// function send500(response) {
//     response.statusCode = 500;
//     response.end("Server error");
// }

// server.listen(3000);
// console.log("Server running at http://127.0.0.1:3000/");
