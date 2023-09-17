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
    errorHandler(!nickname || !email || !password, "input check", 400);
    errorHandler(password.length < 10, "password length check", 400);
    errorHandler(!email.includes("@"), "email includes(@, .) check", 400);
    errorHandler(!email.includes("."), "email includes(@, .) check", 400);

    const specialCharacterCheck = new RegExp(
      "^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,30})"
    );

    errorHandler(
      !specialCharacterCheck.test(password),
      "password not include spacial character",
      400
    );

    const duplicateCheck = await AppDataSource.query(`
    SELECT nickname, email FROM user WHERE (nickname="${nickname}") OR (email="${email}")
    `);

    errorHandler(
      duplicateCheck.length > 0,
      "already exist. input another key",
      400
    );

    // 에러체크 완료  /  ID 등록 시작

    saltRounds = 10;
    const hashPassword = await bcrypt.hash(password, saltRounds);

    const userData = await AppDataSource.query(`
    INSERT INTO user(nickname, email, password)
    VALUES("${nickname}", "${email}", "${hashPassword}")
    `);

    console.log("user data:", userData);
    console.log(`${nickname}(${email}) user create complete`);

    return res.status(201).json({
      message: `${nickname}(${email}) user create complete`,
      data: userData,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: "error! check your input key",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 에러핸들링  :  키 미입력  /  비번 10자 미만  /  이메일 @, . 미포함  /  이메일, 닉네임 중복
    errorHandler(!email || !password, "input check", 400);
    errorHandler(password.length < 10, "input password is too short", 400);

    errorHandler(!email.includes("@"), "email includes(@, .) check", 400);
    errorHandler(!email.includes("."), "email includes(@, .) check", 400);

    const userEmailCheck = await AppDataSource.query(`
      SELECT * FROM user WHERE email = "${email}"
      `);

    errorHandler(
      userEmailCheck.length === 0,
      "not exist user(email check)",
      400
    );

    console.log("user check:::::", userEmailCheck);

    const passwordMatch = await bcrypt.compare(
      password,
      userEmailCheck[0].password
    );

    console.log("passwordMatch::::::::::::", passwordMatch);

    errorHandler(!passwordMatch, "check your PW", 400);

    const payLoad = {
      id: userEmailCheck[0].id,
      email: userEmailCheck[0].email,
      nickname: userEmailCheck[0].nickname,
    };

    const loginToken = await jwt.sign(payLoad, process.env.SECRETKEY);

    return res.status(200).json({
      message: "login complete",
      accessToken: loginToken,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: "login failed, check your EMAIL or PW",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const inputToken = req.headers.authorization.split("Bearer ")[1];
    const verifyToken = jwt.verify(inputToken, process.env.SECRETKEY);

    console.log(verifyToken);

    errorHandler(!verifyToken, "not exist token", 401);

    const { email, password } = req.body;
    const verifiedId = verifyToken.id;
    const verifiedEmail = verifyToken.email;
    const verifiedNickname = verifyToken.nickname;

    const userCheck = await AppDataSource.query(`
    SELECT * FROM user WHERE email = "${verifiedEmail}"
    `);

    errorHandler(!userCheck[0], "not matched user and token", 401);
    // errorHandler(
    //   !(userCheck[0].password === password),
    //   "not matched password",
    //   400
    // );   //  받은 암호 활용 확인 필요

    const deleteStart = await AppDataSource.query(`
    DELETE FROM user WHERE email = "${verifiedEmail}"
    `);

    console.log("user delete:::::::::", deleteStart);

    res.status(200).json({
      message: `user delete complete`,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      message: `user delete not complete, plz check your password`,
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
  deleteUser,
};
