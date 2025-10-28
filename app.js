// app.js
const express = require('express');
const mysql = require('mysql2/promise'); // mysql2/promise 사용
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = 3000;

// EJS 및 세션 설정 (이전과 동일)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true
}));

// --- MySQL Connection Pool 생성 ---
const dbConfig = {
    host: 'localhost',
    user: 'root',     // MySQL 사용자 이름
    password: '1234', // MySQL 비밀번호
    database: 'my_auth_db'       // 사용할 데이터베이스
};

const pool = mysql.createPool(dbConfig);

// --- 라우트(Routes) ---

// 메인 페이지 (이전과 동일)
app.get('/', (req, res) => {
    if (req.session.user) {
        res.render('index', { user: req.session.user });
    } else {
        res.render('index', { user: null });
    }
});

// 회원가입 페이지 보여주기 (이전과 동일)
app.get('/register', (req, res) => {
    res.render('register');
});

// 회원가입 처리 (MySQL 쿼리로 변경)
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 비밀번호 해싱 (동일)
        const hashedPassword = await bcrypt.hash(password, 10);

        // SQL 쿼리 (INSERT)
        // 중요: SQL Injection을 방지하기 위해 '?'를 사용한 매개변수 바인딩을 사용합니다.
        const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
        
        await pool.execute(sql, [username, hashedPassword]);

        res.redirect('/login');

    } catch (err) {
        console.error(err);
        // (실제 서비스에서는 사용자 이름 중복 등 에러 처리 필요)
        res.redirect('/register');
    }
});

// 로그인 페이지 보여주기 (이전과 동일)
app.get('/login', (req, res) => {
    res.render('login');
});

// 로그인 처리 (MySQL 쿼리로 변경)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. 사용자 찾기 (SELECT)
        const sql = "SELECT * FROM users WHERE username = ?";
        const [rows] = await pool.execute(sql, [username]);

        if (rows.length === 0) {
            // 사용자가 없음
            return res.redirect('/login');
        }

        const user = rows[0];

        // 2. 비밀번호 비교 (동일)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // 비밀번호 불일치
            return res.redirect('/login');
        }

        // 3. 로그인 성공: 세션에 사용자 정보 저장 (동일)
        req.session.user = {
            id: user.id, // DB의 id
            username: user.username
        };

        res.redirect('/');

    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});

// 로그아웃 처리 (이전과 동일)
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return console.log(err);
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});