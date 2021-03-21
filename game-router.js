const express = require('express');
const path = require('path');
const fs = require("fs");
const pug = require("pug");

let router = express.Router();

const renderGame = pug.compileFile("./public/views/play.pug");

/*
    POST /games
    GET /games?player=value&active=value&detail=value -> json (API)
    GET /games/:gid -> html(/json?)
    PUT /games/:gid
*/



router.post("/", express.json(), authorizePost, createGame); // body: {reqUser, opp, vis}
router.get("/", checkLogin, queryParser, loadGames, sendGames);
router.get("/:gid", checkLogin, authorizeGet, sendSingleGame);
router.put("/:gid", express.json(), updateGame);

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

function hasGameWith(games, reqUser, opp) {
    console.log("checking " + reqUser.username + "'s active games");
    console.log(reqUser.activeGames);
    for (i in reqUser.activeGames) {
        let gameID = reqUser.activeGames[i];
        console.log("checking if game " + gameID + " includes " + opp);
        if (games.hasOwnProperty(gameID)) {
            let game = games[gameID];
            if (game.players.includes(opp)) {
                return true;
            }
        }
    }
    return false;
}

function authorizePost(req, res, next) {
    if (!req.app.locals.users.hasOwnProperty(req.body.reqUser) || !req.app.locals.users.hasOwnProperty(req.body.opp)) {
        res.status(400).send("User(s) does not exit");
    }
    let user = req.app.locals.users[req.body.reqUser];
    let opp = req.body.opp;
    if (!["public", "private", "friendsOnly"].includes(req.body.vis)) {
        res.status(400).send("Invalid game visibility");
    }
    let vis = req.body.vis;
    if (opp === "random") {
        if (req.app.locals.mmq[vis].includes(user.username)) {
            res.status(400).send("You are already in the queue for " + vis);
        } else {
            let validOpp = false;
            for (let i = 0; i < req.app.locals.mmq[vis].length; i++) {
                opp = req.app.locals.mmq[vis][i];
                if (!hasGameWith(req.app.locals.games, user, opp)) {
                    validOpp = true;
                    break;
                }
            }
            if (!validOpp) {
                req.app.locals.mmq[vis].push(user.username);
                res.status(200).json(req.app.locals.mmq);
            } else {
                req.app.locals.mmq[vis] = req.app.locals.mmq[vis].filter(string => string !== opp);
                next();
            }
        }
    } else if (!user.friends.includes(opp)) {
        res.status(400).send("Invalid opponent");
    } else {
        if (hasGameWith(req.app.locals.games, user, opp)) {
            console.log("game should not be created");
            res.status(400).send("You already have a game with this friend");
        } else {
            next();
        }
    }
}

function createGame(req, res, next) {
    let user = req.app.locals.users[req.body.reqUser];
    let opp = req.app.locals.users[req.body.opp];
    let id = req.app.locals.nextGameID.toString();
    let newGame = {
        gameID: id,
        players: [req.body.reqUser, req.body.opp],
        moves: [],
        board: [
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0]],
        visibility: req.body.vis,
        viewers: [],
        status: "ongoing",
        winner: ""
    };
    req.app.locals.games[id] = newGame;
    req.app.locals.users[req.body.reqUser].activeGames.push(id);
    req.app.locals.users[req.body.opp].activeGames.push(id);
    req.app.locals.nextGameID++;
    res.status(201).json(newGame.gameID);
}

function queryParser(req, res, next) {
    if (!req.query.player) {
        req.query.player = "*";
    }
    if (!req.query.active) {
        req.query.active = null;
    } else if (req.query.active === "true") {
        req.query.active = true;
    } else if (req.query.active === "false") {
        req.query.active = false;
    }
    if (!req.query.detail) {
        req.query.detail = "summary";
    }
    next();
}

function loadGames(req, res, next) {
    res.games = [];
    Object.keys(req.app.locals.games).forEach((key, i) => {
        let toPush = {
            gameID: req.app.locals.games[key].gameID,
            players: req.app.locals.games[key].players,
            status: req.app.locals.games[key].status
        };
        let active = true;
        if (toPush.status !== "ongoing") {
            active = false;
            toPush.numMoves = req.app.locals.games[key].moves.length;
            toPush.winner = req.app.locals.games[key].winner;
        }
        if (req.app.locals.games[key].visibility === "public") {
            if (req.query.player === "*" || toPush.players.map(name => name.toLowerCase()).includes(req.query.player.toLowerCase())) {
                if (!req.query.active || (req.query.active && active) || (!req.query.active && !active)) {
                    if (req.query.detail === "full") {
                        toPush.moves = req.app.locals.games[key].moves;
                    }
                    res.games.push(toPush);
                }
            }
        }
    });
    next();
}

function sendGames(req, res, next) {
    res.status(404).json(res.games);
}

function authorizeGet(req, res, next) {
    let id = req.params.gid;
    // DB find game
    if (req.app.locals.games.hasOwnProperty(id)) {
        res.game = req.app.locals.games[id];
        if (res.game.visibility === "public") {
            next();
        } else if (res.game.visibility === "friendsOnly") {
            let player1 = req.app.locals.users[res.game.players[0]];
            let player2 = req.app.locals.users[res.game.players[1]];
            if (req.session.loggedin && (player1.friends.includes(req.session.username) || player2.friends.includes(req.session.username))) {
                next();
            } else {
                res.status(401).send("This game is Private");
            }
        } else {
            if (req.session.loggedin && res.game.players.includes(req.session.username)) {
                next();
            } else {
                res.status(401).send("This game is Private");
            } // maybe modify game page template for nicer ui
        }
    } else {
        res.status(404).send("This game does not exist");
    }
}

function sendSingleGame(req, res, next) {

    res.format({
        "text/html": function () {
            res.status(200).send(renderGame({user:req.app.locals.users[req.session.username],game:res.game}));
        },
        "application/json": function () {
            res.status(200).json(res.game);
        }
    });
}

function updateGame(req, res, next) {
    let id = req.params.gid
    if (req.app.locals.games.hasOwnProperty(id)) {
        Object.keys(req.body).forEach((property, i) => {
            if (req.app.locals.games[id].hasOwnProperty(property)) {
                req.app.locals.games[id][property] = req.body[property];
            }
        });
        res.format({
            'text/html': function () {
                res.status(200).send("game updated");
            },
            'application/json': function () {
                res.status(200).json(req.app.locals.games[id]);
            }
        });
    } else {
        res.status(404).send("There is no game with that ID");
    }
}

module.exports = router;
