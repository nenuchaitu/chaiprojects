const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
//initialize server and start db
const app = express();
app.use(express.json());
app.use(cors());
const dbPath = path.join(__dirname, "chaiProjects.db");
let db;
const initializeServerAndStartDb = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(process.env.PORT || 3001, () => {
      console.log(`Server is Running at http://localhost:3001`);
    });
  } catch (e) {
    console.log(`Db error '${e.message}'`);
    process.exit(1);
  }
};
initializeServerAndStartDb();
//validate password
const validatePassword = (password) => {
  return password.length > 6;
};
//validate jwt
const authenticationToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  console.log(authHeader);
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send({ error_msg: "Invalid JWT Token" });
  } else {
    jwt.verify(jwtToken, "passwordishidden", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send({ error_msg: "Invalid JWT Token" });
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};
//admin section
//register admin
app.post("/register", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM admin WHERE username = '${username}';`;
  const databaseUser = await db.get(selectUserQuery);
  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      admin (username,password)
     VALUES
      (
       '${username}',
       '${hashedPassword}'
      );`;
    if (validatePassword(password)) {
      await db.run(createUserQuery);
      response.send({ message: "User created successfully" });
    } else {
      response.status(400);
      response.send({ error_msg: "Password is too short" });
    }
  } else {
    response.status(400);
    response.send({ error_msg: "User already exists" });
  }
});
//login and authentication
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM admin WHERE username='${username}';`;
  const user = await db.get(getUserQuery);
  if (user === undefined) {
    response.status(400);
    response.send({ error_msg: "Invalid user" });
  } else {
    const isPasswordRight = await bcrypt.compare(password, user.password);
    if (isPasswordRight) {
      const payLoad = user.username;
      const jwtToken = jwt.sign(payLoad, "passwordishidden");
      response.send({ jwt_token: jwtToken });
    } else {
      response.status(400);
      response.send({ error_msg: "Invalid password" });
    }
  }
});
//get admins
app.get("/admin", async (request, response) => {
  const getAdminListQuery = `SELECT * FROM admin;`;
  const users = await db.all(getAdminListQuery);
  response.send(users);
});
//projects
//validateData
const validateData = (title, description, projectUrl) => {
  if (title === "" || description === "" || projectUrl === "") {
    return false;
  } else {
    return true;
  }
};
//add projects
app.post("/projects", async (request, response) => {
  const { title, description, projectUrl } = request.body;
  try {
    if (databaseUser !== undefined) {
      const insertDataQuery = `
     INSERT INTO
      data (title,description,project_url)
     VALUES
      ('${title}',
      '${description}',
       '${projectUrl}'
      );`;
      if (validateData(title, description, projectUrl)) {
        await db.run(insertDataQuery);
        response.send({ message: "Data entered successfully" });
      } else {
        response.status(400);
        response.send({
          error_msg: "Invalid data.One or more fields are empty",
        });
      }
    }
  } catch (e) {
    response.status(400);
    response.send({ error_msg: e });
  }
});
//get data
app.get("/projects", async (request, response) => {
  const getProjectsQuery = `SELECT * FROM projects;`;
  const projects = await db.all(getProjectsQuery);
  response.send({ projects });
});
//export module
module.exports = app;
