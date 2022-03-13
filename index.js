const express = require("express");
const bodyParser = require('body-parser')
const mysql = require('mysql')
const redis = require('redis') 

var jsonParser = bodyParser.json()

const Rport = 6379;
const client = redis.createClient({url: "redis://redis-db:6379"});
client.connect();

var con  = mysql.createConnection({
  host: "db",
  user: "root",
  password: "secret",
  database: "twitter"
});
con.connect(function(err){
        if(err) throw err;
    });

var app = express();
// client.on('connect', () => console.log('Redis Client Connected'));

app.get("/", (req, res, next) => {
    res.json("{ 'message': 'Server online'}");
});

app.post("/user", jsonParser, (req, res, next) => {
    var username = req.body.username;
    //sql connection
    var query = `insert into user(username) values ('${username}')`;
    var user= {};
    // con.connect(function(err) {
    //     if (err) throw err;
        console.log("Connected, creating user!");
        con.query(query, function (err, result) {
            if (err) throw err;
            console.log("Done");
        });
        var query2 = 'select * from user where userId = last_insert_id()';
        
        console.log("Retrieving User");
        con.query(query2, function (err2, result){
            if(err2) throw err2;
            console.log(result);
            user.userId = result[0].userId;
            user.username = result[0].username;
            console.log(user);
            //cache user
            client.rPush(user.userId, "");
            res.send(user); // created account
        });
    // });
});

app.post("/tweet", jsonParser, (req, res, next) => {
    var userId = req.body.userId;
    var tweet = req.body.tweet;
    //sql connection
    var query = `insert into tweets(user_sender_id, text) values (${userId}, '${tweet}')`;
    // con.connect(
    con.query(query, function(err1, result){
        if(err1) throw err1;
        console.log("Tweet created");
    })
    //cache the tweet
    var query2 = `select u.userId as userId from user u ` + 
                `join follows f on f.user_follower_id = u.userId ` + 
                `where f.user_followed_id = ${userId}`; //could use cache
    console.log("Retrieving followers");
    con.query(query2, function(err2, result){
        if(err2) throw err2;
        console.log(result);
        for(let i = 0; i < result.length; i++){
            let follower = result[i].userId;
            client.rPush(follower,JSON.stringify({"userId": userId,"tweet":tweet})); 
        }
        res.send("OK");
    });
    // });
});

//cache tweetsdock
async function cache(req, res, next){
    console.log("Checking cache");
    var userId = req.params.userId;
    var tweets = await client.lRange(userId, 0, -1);
    if(tweets !== null){
        var tweets_json = [];
        console.log(tweets);
        for(let  i = 1; i < tweets.length; i++){
            tweets_json.push(JSON.parse(tweets[i]));
        }
        res.send(tweets_json);
    }
    else next();
}

app.get("/timeline/:userId", cache, (req, res, next) => {
    console.log("No cache");
    var userId = req.params.userId;
    //check cache

    //sql connection
    var query = `select t.text as text, u.username as user from tweet t ` + 
                `join user u on t.user_follower_id = u.userId ` + 
                `join follows f on f.user_followed_id = u.userId ` + 
                `where f.user_follower_id = ${userId}`;
    var timeline = [];
    console.log("Retrieving Timeline");
    con.query(query, function(err, result){
        if(err) throw err;
        for(let i = 0; i < lenght(result); i++){
            let tweet = {};
            tweet.text = result[i].text;
            tweet.user = result[i].user;
            timeline.push(tweet);
        }
    });
    res.json(timeline); //arr of tweets
});

app.post("/follow", jsonParser, (req, res, next) => {
    var userIdA = req.body.userIdA;
    var userIdB = req.body.userIdB;
    //sql connection
    var query = `insert into follows(user_follower_id, user_followed_id) values (${userIdA}, ${userIdB})`;
    con.query(query, function(err, result){
        if(err) throw err;
        console.log("Followed");
    });
    //cache tweets deuda tecnica
    res.send("OK");
});

app.listen(3000, () => {
    console.log("Servidor HTTP funcionando");
});