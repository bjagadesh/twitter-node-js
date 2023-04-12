const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const jwt = require("jsonwebtoken");

app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

module.exports = app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const query = `SELECT * FROM user WHERE username='${username}';`;
  const result = await db.get(query);
  if (result !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const queryCreate = `INSERT INTO user 
          (username, password, name, gender) 
          VALUES ('${username}','${hashedPassword}', 
          '${name}', '${gender}');`;
      const resultCreate = await db.run(queryCreate);
      response.send("User created successfully");
    }
  }
});

//User Login API
module.exports = app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app.get(
  "/user/tweets/feed",
  authenticateToken,
  async (request, response) => {
    //const { username, tweet, dateTime } = request.body;
    const query = `SELECT user.username,tweet.tweet,
    tweet.date_time as dateTime FROM user INNER JOIN 
    tweet ON user.user_id = tweet.user_id 
    ORDER BY tweet.date_time desc 
    LIMIT 4
    OFFSET 1;`;
    const result = await db.all(query);
    response.send(result);
  }
);

module.exports = app.get(
  "/user/followers/",
  authenticateToken,
  async (request, response) => {
    //name
    const query = `SELECT name 
FROM User 
WHERE user_id IN 
  (SELECT follower_user_id 
   FROM Follower);
`;
    const result = await db.all(query);
    response.send(result);
  }
);

module.exports = app.get(
  "/user/following/",
  authenticateToken,
  async (request, response) => {
    const query = `SELECT name 
FROM User 
WHERE user_id IN 
  (SELECT following_user_id 
   FROM Follower);
`;
    const result = await db.all(query);
    response.send(result);
  }
);
/*
module.exports = app.get(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const query = `SELECT tweet,count(like_id) as likes,count(reply) as replies,date_time as dateTime from (Tweet INNER JOIN Like) 
    AS T INNER JOIN Reply ON T.tweet_id=Reply.tweet_id WHERE T.tweet_id=${tweetId};`;
    const result = await db.all(query);
    response.send(result);
  }
);

module.exports = app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const query = `SELECT GROUP_CONCAT(username) AS likes
FROM User 
WHERE user_id IN 
  (SELECT user_id 
   FROM Like 
   WHERE tweet_id =${tweetId})
   AND user_id IN 
  (SELECT following_user_id 
   FROM Follower);
`;
    const result = await db.all(query);
    response.send(result);
  }
);

module.exports = app.get(
  "/tweets/:tweetId/replies/",
  async (request, response) => {
    const { tweetId } = request.params;
    const query = `SELECT name, reply 
FROM User 
JOIN Reply 
ON User.user_id = Reply.user_id
WHERE Reply.tweet_id = ${tweetId} 
AND User.user_id IN 
  (SELECT following_user_id 
   FROM Follower 
   WHERE follower_user_id =${tweetId});
`;
    const result = await db.all(query);
    response.send(result);
  }
);

module.exports = app.get(
  "/user/tweets/",
  authenticateToken,
  async (request, response) => {
    //const { tweetId } = request.params;
    const query = `SELECT tweet, 
       (SELECT COUNT(*) FROM Like WHERE tweet_id = Tweet.tweet_id) AS likes, 
       (SELECT COUNT(*) FROM Reply WHERE tweet_id = Tweet.tweet_id) AS replies, 
       date_time  as dateTime 
FROM Tweet;
`;
    const result = await db.all(query);
    response.send(result);
  }
);

module.exports = app.post(
  "/user/tweets/",
  authenticateToken,
  async (request, response) => {
    const { tweet } = request.body;
    //console.log(request.body);
    //console.log(tweet);
    const query = `UPDATE Tweet SET tweet='${tweet}';`;
    const result = await db.get(query);
    response.send("Created a Tweet");
  }
);
/*
module.exports=app.get("/tweets/:tweetId/",async (request,response)=>{
    
})

-----------------------------------------------------
POST http://localhost:3000/login/
Content-Type: application/json

{
  "username":"JoeBiden",
  "password":"biden@123"
}

###

GET http://localhost:3000/user/followers/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvZUJpZGVuIiwiaWF0IjoxNjc1NDA3ODk4fQ.6O_2mGw8VeYAttPzKXytzBxLtYcAjOm3w9AamUtlFek

###
GET http://localhost:3000/tweets/2/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvZUJpZGVuIiwiaWF0IjoxNjc1NDA3ODk4fQ.6O_2mGw8VeYAttPzKXytzBxLtYcAjOm3w9AamUtlFek

###
GET http://localhost:3000/tweets/1/likes/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvZUJpZGVuIiwiaWF0IjoxNjc1NDA3ODk4fQ.6O_2mGw8VeYAttPzKXytzBxLtYcAjOm3w9AamUtlFek

###
GET http://localhost:3000/tweets/4/replies/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvZUJpZGVuIiwiaWF0IjoxNjc1NDA3ODk4fQ.6O_2mGw8VeYAttPzKXytzBxLtYcAjOm3w9AamUtlFek

###
GET http://localhost:3000/user/tweets/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvZUJpZGVuIiwiaWF0IjoxNjc1NDA3ODk4fQ.6O_2mGw8VeYAttPzKXytzBxLtYcAjOm3w9AamUtlFek
*/
