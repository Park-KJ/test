const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const morgan = require("morgan");
const jwt = require("jsonwebtoken");

const { DataSource } = require("typeorm");

const app = express();
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

const userServices = require("./services/userServices_test");
const postServices = require("./services/postServices_test");

const AppDataSource = new DataSource({
  type: process.env.TYPEORM_CONNECTION,
  host: process.env.TYPEORM_HOST,
  port: process.env.TYPEORM_PORT,
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE,
});

const { errorHandler } = require("./errorHandler.js");

// 실행
app.get("/", userServices.welcome); //  메인홈
app.get("/users", userServices.getUsers); //  유저  :  목록
app.post("/users", userServices.createUsers); //  유저  :  회원가입
app.post("/login", userServices.login); //  유저  :  로그인
app.delete("/deleteusers", userServices.deleteUser); //  유저  :  삭제
app.get("/posts", postServices.getPost); //  글  :  목록
app.post("/posts", postServices.createPosts); //  글  :  작성
app.delete("/deleteposts", postServices.deletePost); //  글  :  삭제

const server = http.createServer(app);

const serverPort = 8000;

const start = async () => {
  try {
    server.listen(serverPort, () =>
      console.log(`Server is listening on ${serverPort}`)
    );
  } catch (err) {
    console.error(err);
  }
};

AppDataSource.initialize().then(() => {
  console.log("Data Source has been initialized!");
});

start();

module.exports = {
  AppDataSource,
};
