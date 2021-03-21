/*
    objects:
        users -> username, password, #wins, #games, friends, visibility, game history, active games, friend reqs
        games -> gameID, players, visibility, viewers, status, winner, moves (used to render board), forfeited, chat
        matchmakingQueue -> public[], private[], friendsOnly[]    (each property can have users queued)

    general functionality (i/o):
        log in: (username, password) -> sessions stuff
        log out: () -> session stuff
        createUser: (user) -> POST to users
        getUser: (requestingUser, userID) -> user
        searchUsers: (string) -> matching users
        newGame: (p1, p2, vis) -> game
        getGameHistory: (user) -> gameIDs
        getActiveGames: (user) -> gameIDs
        getGame: (gameID) -> game
        makeMove: (game, column, player) -> POST to game.moves
        finalizeGame: (game, winner, forfeited = false) -> update activeGames and gameHistory
        sendFriendRequest: (fromUser, toUser) -> update toUser.friendReqs[]
        acceptFriendRequest: (acceptingUser, requestingUser) -> update both friends[]

"user": {
    "username":"user",
    "password":"12345",
    "visibility":"public",
    "games":0,
    "wins":0,
    "friends":[],
    "friendReqs":[],
    "gameHistory":[],
    "activeGames":[]
    "status":"online" or "offline"
}

"game": {
    "gameID":"0",
    "players":[user1, user2],
    "moves":[],
    "board":[[6],[6],[6],[6],[6],[6],[6]],
    "visibility":"public",
    "viewers":[users],
    "chat": [{user:msg}, {user:msg}, {user:msg}],
    "status":"ongoing" or "finished" or "forfeited",
    "winner":""
}
*/

let users = require("./users.json");
let games = require("./games.json")
let currentUser = null;
let mmq = {public: [], private: [], friendsOnly: []};
let nextGameID = 0;
for (let game in games) {
    if (Number(game) >= nextGameID) {
        nextGameID = Number(game) + 1;
    }
}

function isValidUser(user) {
    if (!user || !user.username || !users.hasOwnProperty(user.username)) {
        return false;
    }

    return true;
}

function login(username, password) {
    if (currentUser === null) {
        if (users.hasOwnProperty(username)) {
            if (users[username].password === password) {
                currentUser = users[username];
                console.log("Logged in as " + username);
            } else {
                console.log("Wrong password");
            }
        } else {
            console.log("User not found");
        }
    } else {
        console.log(currentUser.username + " is already logged in");
    }
}

function logout() {
    currentUser = null;
}

function createUser(newUser) {
    if (users.hasOwnProperty(newUser.username) || newUser.username === "") {
        return false;
    }
    newUser.visibility = "public";
    newUser.games = 0;
    newUser.wins = 0;
    newUser.friends = [];
    newUser.friendReqs = [];
    newUser.gameHistory = [];
    newUser.activeGames = [];
    users[newUser.username] = newUser;

    return newUser;
}

function getUser(requestingUser, userID) {
    if (!isValidUser(requestingUser)) {
        return null;
    }
    if (users.hasOwnProperty(userID)) {
        let requestedUser = users[userID];
        if (requestingUser === requestedUser) {
            return requestedUser;
        } else if (requestedUser.visibility === "private") {
            return (requestingUser.friends.includes(userID) ? requestedUser : null);
        } else {
            return requestedUser;
        }
    } else {
        console.log("User not found");
    }
}

function searchUsers(reqUser, query) {
    if (!isValidUser(reqUser)) {
        return null;
    }

    let results = [];

    for (username in users) {
        let user = users[username];
        if (user.visibility === "public" && user.username !== reqUser.username) {
            if (user.username.toLowerCase().indexOf(query.toLowerCase()) >= 0) {
                results.push(user);
            }
        }
    }

    return results;
}

function hasGameWith(reqUser, opp) {
    for (gameID in reqUser.activeGames) {
        let game = getGame(reqUser, gameID);
        if (game !== null && game.players.includes(opp)) {
            return true;
        }
    }
    return false;
}

//no more than 1 active game with the same user
//validate reqUser and vis
//if opp is random, match with a user in matchmakingQueue
//      if no one in appropriate matchmakingQueue, add user to mmq
//if opp not random, validate for friend of reqUser
//validate for no active games with opp
function newGame(reqUser, opp, vis) {
    if (!isValidUser(reqUser) || !["public", "private", "friendsOnly"].includes(vis)){
        return null;
    }

    if (opp === "random") {
        if (mmq[vis].includes(reqUser.username)) {
            console.log("You are already in the queue for " + vis);
            return;
        } else {
            let validOpp = false;
            for (let i = 0; i < mmq[vis].length; i++) {
                opp = mmq[vis][i];
                if (!hasGameWith(reqUser, opp)) {
                    validOpp = true;
                    break;
                }
            }
            if (!validOpp) {
                mmq[vis].push(reqUser.username);
                console.log("You have been added to the matchmaking queue for " + vis);
                return;
            }

            createGame(reqUser.username, opp, vis);
            mmq[vis] = mmq[vis].filter(string => string !== opp);
        }
    } else if (!reqUser.friends.includes(opp)) {
        console.log("invalid opponent");
        return;
    } else {
        createGame(reqUser.username, opp, vis);
    }

}

function createGame(p1, p2, vis) {
    let game = {};
    game.players = [p1, p2];
    game.moves = [];
    game.visibility = vis;
    game.viewers = [];
    game.status = "ongoing";
    game.winner = "";
    games[String(nextGameID)] = game;
    users[p1].activeGames.push(nextGameID);
    users[p2].activeGames.push(nextGameID);
    nextGameID++;
}

function getGameHistory(reqUser, userID) {
    if (!isValidUser(reqUser)) {
        return null;
    }
    let u = getUser(reqUser, userID);
    if (u === null) {
        return null;
    }
    return u.gameHistory;
}

function getActiveGames(reqUser, userID) {
    if (!isValidUser(reqUser)) {
        return null;
    }
    let u = getUser(reqUser, userID);
    if (u === null) {
        return null;
    }

    let result = [];
    let i = 0;
    for (game in u.activeGames) {
        result[i] = getGame(reqUser, game).gameID;
    }
}

function getGame(reqUser, gameID) {
    if (!isValidUser(reqUser)) {
        return null;
    }
    if (games.hasOwnProperty(gameID)) {
        let game = games[gameID];
        if (game.status === "finished" || game.status === "forfeited"){
            return game;
        }
        if (game.players.includes(reqUser.username) || game.visibility === "public") {
            return game;
        } else if (game.visibility === "friendsOnly") {
            for (let i = 0; i < 2; i++) {
                let p = getUser(reqUser, game.players[i]);
                if (p !== null && p.friends.includes(reqUser.username)) {
                    return game;
                }
            }
            return null;
        } else {
            return null;
        }
    }
}

function makeMove(game, column, player) {
    if (game !== null && games.hasOwnProperty(game.gameID) && column > 0 && column < 8){
        if (game.status === "ongoing") {
            // after adding to moves, if a player won -> call finalizeGame()
            if (game.players[0] === player) {
                game.moves.push("p1r" + column);
                console.log("p1r" + column);
            } else if (game.players[1] === player) {
                game.moves.push("p2r" + column);
                console.log("p2r" + column);
            } else {
                console.log("Invalid Player");
            }
        } else {
            console.log("Game is already finished");
        }
    }
}

function finalizeGame(game, winner, forfeited = false) {
    if (game !== null && games.hasOwnProperty(game.gameID) && game.players.includes(winner)) {
        game.winner = winner;
        if (forfeited) {
            game.status = "forfeited";
        } else {
            game.status = "finished";
        }
    }
}

// can only send friend requests to public users that are not already a friend
// no duplicate requests
// if fromUser also has a friend request from toUser, don't send request,
// just make fromUser accept their request
function sendFriendRequest(fromUser, toUserID) {
    if (!isValidUser(fromUser) || !users.hasOwnProperty(toUserID)) {
        return;
    }
    if (fromUser.friendReqs.includes(toUserID)) {
        acceptFriendRequest(fromUser, toUserID);
        return;
    }
    let u = getUser(fromUser, toUserID);
    if (u === null || u.friends.includes(fromUser.username) || u.friendReqs.includes(fromUser.username)) {
        return;
    }
    u.friendReqs.push(fromUser.username);
}

// users that were public when receiving a request, but then go private,
// can still accept said request (i.e. getUser would not work)
// requesting users visibility does not matter
// since requests are unique and only for non-friends, no need validate a request
function acceptFriendRequest(acceptingUser, requestingUserID) {
    if (!isValidUser(acceptingUser) || !users.hasOwnProperty(requestingUserID)) {
        return;
    }
    let u = users[requestingUserID];
    let index = acceptingUser.friendReqs.indexOf(requestingUserID);
    if (index > -1) {
        acceptingUser.friends.push(requestingUserID);
        u.friends.push(acceptingUser.username);
        acceptingUser.friendReqs.splice(index, 1);
    }

}

// \/ Miscellaneous testing code \/, not very thorough

// login("user1", "12345");
// login("user16", "notpassword");
// logout();
// login("user16", "notpassword");
// login("notuser", "lksajdflksdf");
// login("user5", "12345");
// console.log(getUser(currentUser, "user3"));
// console.log(getUser(currentUser, "user10"));
// console.log(getUser(currentUser, "user11"));
// console.log(getUser(users.user1, "user10"));
// console.log(getUser(users.user1, "user5"));
// console.log(searchUsers(currentUser, "1"));

// newGame(currentUser, "random", "private");
// newGame(users.user7, "random", "private");
// newGame(users.user11, "user16", "public");
// console.log(games);
// console.log(mmq);
// makeMove(getGame(users.user5, "3"), 2, "user10");
// console.log(getGame(users.user5, "3"));
// finalizeGame(getGame(users.user5, "3"), "user10", true);
// console.log(getGame(users.user5, "3"));

// console.log(users);
// sendFriendRequest(users.user1, "user5");
// sendFriendRequest(users.user1, "user10");
// console.log(users);
// acceptFriendRequest(users.user5, "user1");
// console.log(users);
