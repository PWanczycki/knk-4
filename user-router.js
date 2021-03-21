const express = require('express');
const path = require('path');
const fs = require("fs");
const pug = require("pug");

let router = express.Router();

const renderProfile = pug.compileFile("./public/views/profile.pug");
const renderSearch = pug.compileFile("./public/views/search.pug");

/*
    POST /users
    GET /users?name=value -> json (API)
    GET /users/:uid -> html/json (API)
    PUT /users/:uid
    DELETE /users/:uid
*/
// router.use("/", checkLogin);
router.post("/", express.json(), createUser);
router.get("/", checkLogin, queryParser, loadUsers, sendUsers);
router.get("/:uid", checkLogin, authorizeGet, loadGames, sendSingleUser);
router.put("/:uid", express.json(), updateUser);
router.delete("/:uid", deleteUser);

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

function createUser(req, res, next) {
    if (req.app.locals.users.hasOwnProperty(req.body.username)) {
        res.status(409).send("There is already a user with that name");
    } else {
        let usrnm = req.body.username;
        let newUser = {
            username:usrnm,
            password:req.body.password,
            visibility:"public",
            games:0,
            wins:0,
            friends:[],
            friendReqs:[],
            gameHistory:[],
            activeGames:[],
            status:"online"
        };
        req.app.locals.users[usrnm] = newUser;
        // create user logic
        res.status(201).send(newUser.username);
    }
}

function queryParser(req, res, next) {
    if (!req.query.name || req.query.name == "") {
        req.query.name = "*";
    }
    next();
}

function loadUsers(req, res, next) {
    res.result = [];
    Object.keys(req.app.locals.users).forEach((key, i) => {
        let user = req.app.locals.users[key];
        if (user.visibility === "public") {
            if (req.query.name === "*" || user.username.toLowerCase().includes(req.query.name.toLowerCase())) {
                if (!req.session.loggedin || req.session.loggedin && user.username !== req.session.username) {
                    res.result.push(user);
                }
            }
        }
    });
    next();
}

function sendUsers(req, res, next) {
    res.format({
        "text/html": function () {
            res.status(200).send(renderSearch({user: req.app.locals.users[req.session.username], result: res.result}));
        },
        "application/json": function () {
            res.status(200).json(res.result);
        }
    });
}

// rework if statements,
/*if user exists
    if loggedin
        if self
            send whole profile
        else if friend
            send profile but different (only games with private visibility are different tho...)
    if public
        send profile but different (same as if friends but no friends only games either...)
    else (private)
        unauthorized

*/
function authorizeGet(req, res, next) {
    let id = req.params.uid;
    // DB find user
    if (req.app.locals.users.hasOwnProperty(id)) {
        res.user = req.app.locals.users[id];
        if (res.user.visibility === "public") {
            next();
        } else if (req.session.loggedin && (req.session.username === id || res.user.friends.includes(req.session.username))) {
            next();
        } else {
            res.status(401).send("This user is private"); // maybe modify user page template for nicer ui
        }
    } else {
        res.status(404).send("This user does not exist");
    }
}

function loadGames(req, res, next) {
    // too much trouble to parse games in pug,
    let activeGames = [];
    let gameHistory = [];
    next();
}

function sendSingleUser(req, res, next) {
    res.format({
        "text/html": function () {
            // user is assumed to be logged in because of checkLogin for html
            let requestingUser = req.app.locals.users[req.session.username];
            res.status(200).send(renderProfile({requestingUser, user:res.user, games:req.app.locals.games}));
            // TODO: header shows rqtedUser as logged in, figure that out
        },
        "application/json": function () {
            res.user.winrate = 0;
            if (res.user.games > 0) {
                res.user.winrate = res.user.wins/res.user.games*100;
            }
            res.status(200).json(res.user);
        }
    });
}

function updateUser(req, res, next) {
    let id = req.params.uid;
    let resFlag;
    if (req.app.locals.users.hasOwnProperty(id)) {
        Object.keys(req.body).forEach((property, i) => {
            if (property === "friendReq" && req.app.locals.users.hasOwnProperty(req.body[property])) {
                // if already friends or already has friend req
                    // send 400, "You can't send more than 1 request to the same user"
                // if opposite request exists
                    // update friends, send 201, "You are now friends"
                // else
                    // update user.friendReqs, send 200, "Friend req sent"
                if (req.app.locals.users[id].friends.includes(req.body[property]) || req.app.locals.users[id].friendReqs.includes(req.body[property]) || id === req.body[property]) {
                    resFlag = "req400";
                } else if (req.app.locals.users[req.body[property]].friendReqs.includes(req.app.locals.users[id].username)) {
                    req.app.locals.users[req.body[property]].friends.push(req.app.locals.users[id].username);
                    req.app.locals.users[id].friends.push(req.body[property]);
                    req.app.locals.users[req.body[property]].friendReqs = req.app.locals.users[req.body[property]].friendReqs.filter((name) => {name !== id});
                    resFlag = "req201";
                } else {
                    req.app.locals.users[id].friendReqs.push(req.body[property]);
                    resFlag = "req200";
                }
            }
            // if (req.app.locals.users[id].hasOwnProperty(property)) {
            //     req.app.locals.users[id][property] = req.body[property];
            // }    // completely wipes and updates properties, only for testing
        });
        res.format({
            'text/html': function () {
                switch(resFlag) {
                    case "req400":
                        res.status(400).send("Error: request not sent");
                        break;
                    case "req201":
                        res.status(201).send("You are now friends");
                        break;
                    case "req200":
                        res.status(200).send("Friend request sent");
                        break;
                    default:
                        res.status(200).send("User updated");
                }
            },
            'application/json': function () {
                res.status(200).json(req.app.locals.users[id]);
            }
        });
    } else {
        res.status(404).send("There is no user with that name");
    }
}

function deleteUser(req, res, next) {
    let id = req.params.uid;
    if (req.app.locals.users.hasOwnProperty(id)) {
        delete req.app.locals.users[id];
        res.status(200).send("User deleted");
    } else {
        res.status(404).send("There is no user with that name");
    }
}

module.exports = router;
