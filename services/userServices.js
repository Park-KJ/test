const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { DataSource } = require("typeorm");
const { errorHandler } = require("../errorHandler.js");

const AppDataSource = new DataSource({
  type: process.env.TYPEORM_CONNECTION,
  host: process.env.TYPEORM_HOST,
  port: process.env.TYPEORM_PORT,
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE,
});

// API

const welcome = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Hello, welcome to 7Team's Server!!",
    });
  } catch (err) {
    console.log(err);
  }
};

const getUsers = async (req, res) => {
  try {
    const userData = await AppDataSource.query(`
    SELECT id, nickname, email, password FROM user`);

    return res.status(200).json({
      users: userData,
    });
  } catch (err) {
    console.log(err);
  }
};

const createUsers = async (req, res) => {
  try {
    const { nickname, email, password } = req.body;
    // 에러핸들링  :  키 미입력  /  비번 10자 미만  /  이메일 @, . 미포함  /  특수문자  /  이메일, 닉네임 중복
    errorHandler(!nickname || !email || !password, "input check plz", 400);

    // if (!nickname || !email || !password) {
    //   const error = new Error("input check plz");
    //   error.statusCode = 400;
    //   throw error;
    // }

    errorHandler(password.length < 10, "password check plz", 400);

    // if (password.length < 10) {
    //   const error = new Error("password check plz");
    //   error.statusCode = 400;
    //   throw error;
    // }

    errorHandler(!email.includes("@"), "email check plz", 400);
    errorHandler(!email.includes("."), "email check plz", 400);

    // if (!email.includes("@" && ".")) {
    //   const error = new Error("email check plz");
    //   error.statusCode = 400;
    //   throw error;
    // }

    const duplicateCheck = await AppDataSource.query(`
    SELECT nickname, email FROM user WHERE (nickname="${nickname}") OR (email="${email}")
    `);

    errorHandler(
      duplicateCheck.length > 0,
      "already exist. input another key plz",
      400
    );

    // 비밀번호 특수문자 에러핸들링 필요

    const hashedPassword = await bcrypt.hash(password, 10); // bcrypt 생성

    const userData = await AppDataSource.query(`
    INSERT INTO user(nickname, email, password)
    VALUES("${nickname}", "${email}", "${hashedPassword}")
    `);

    console.log("user data:", userData[0]);

    return res.status(201).json({
      message: `${nickname}(${email}) user create complete`,
      data: userData[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: "error! check your input key, plz",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    errorHandler(
      password.length < 8,
      "input password is too short, plz check",
      400
    );

    // if (password.length < 8) {
    //   const error = new Error("input password is too short, plz check");
    //   error.statusCode = 400;
    //   throw error;
    // }

    const userEmailCheck = await AppDataSource.query(`
      SELECT * FROM user WHERE email = "${email}"
      `);

    errorHandler(userEmailCheck.length === 0, "not exist user(email)", 400);

    console.log("user check:::::", userEmailCheck);

    const passwordMatch = await bcrypt.compare(
      password,
      userEmailCheck[0].password
    );

    console.log("passwordMatch::::::::::::", passwordMatch);

    errorHandler(!passwordMatch, "check your PW plz", 400);

    // if (!passwordMatch) {
    //   const error = new Error("check your PW plz");
    //   error.statusCode = 400;
    //   throw error;
    // }

    // if (userEmailCheck.length === 0) {
    //   const error = new Error("check your EMAIL or PW plz");
    //   error.statusCode = 400;
    //   throw error;
    // }

    const loginToken = jwt.sign({ id: userEmailCheck[0].id }, "loginToken");

    return res.status(200).json({
      message: "login complete",
      token: loginToken,
      nickname: userEmailCheck[0].nickname,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: "login failed, check your EMAIL or PW plz",
    });
  }
};

AppDataSource.initialize().then(() => {
  console.log("Data Source has been initialized!");
});

module.exports = {
  welcome, //  키, 밸류값이 같으면 하나만 넣어도 된다.  =  welcome만
  getUsers,
  createUsers,
  login,
};
