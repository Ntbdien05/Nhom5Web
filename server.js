const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const dbPromise = require("./db");

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "Main")));

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

let db;

// ✅ Hàm import Excel khi khởi động
async function importFromExcelDirect(filepath) {
  if (!fs.existsSync(filepath)) {
    console.warn("⚠️ Không tìm thấy file Excel:", filepath);
    return;
  }

  const workbook = xlsx.readFile(filepath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  await db.run("DELETE FROM questions");
  console.log("🧹 Đã xóa toàn bộ bảng questions");

  const normalize = (text) =>
    text?.toString().trim().toLowerCase().replace(/\s+/g, " ") || "";

  const seen = new Set();
  const filtered = [];

  for (let row of data) {
    const questionKey = normalize(row.question);
    if (!questionKey || seen.has(questionKey)) continue;
    seen.add(questionKey);

    filtered.push({
      subject: row.subject?.toString().trim() || "Chưa rõ môn",
      question: row.question?.toString().trim() || "",
      optionA: row.optionA?.toString().trim() || "",
      optionB: row.optionB?.toString().trim() || "",
      optionC: row.optionC?.toString().trim() || "",
      optionD: row.optionD?.toString().trim() || "",
      correctOption:
        row.correctOption?.toString().trim().toUpperCase() || "A",
    });
  }

  const stmt = await db.prepare(`
    INSERT INTO questions (subject, question, optionA, optionB, optionC, optionD, correctOption)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let q of filtered) {
    await stmt.run(
      q.subject,
      q.question,
      q.optionA,
      q.optionB,
      q.optionC,
      q.optionD,
      q.correctOption
    );
  }

  await stmt.finalize();
  console.log(`✅ Đã import ${filtered.length} câu hỏi hợp lệ.`);
}

// ✅ Khởi tạo DB & tự import khi khởi động
(async () => {
  db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      phone TEXT,
      dob TEXT,
      role TEXT,
      gender TEXT,
      avatar TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT,
      question TEXT,
      optionA TEXT,
      optionB TEXT,
      optionC TEXT,
      optionD TEXT,
      correctOption TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT,
      score REAL,
      correct INTEGER,
      wrong INTEGER,
      duration INTEGER,
      timestamp TEXT,
      userId INTEGER
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER,
      subject TEXT,
      PRIMARY KEY (user_id, subject)
    )
  `);

  const fileToImport = path.join(__dirname, "questions.xlsx");
  await importFromExcelDirect(fileToImport);

  app.listen(port, () => {
    console.log(`✅ Server đang chạy tại: http://localhost:${port}`);
  });
})();

// ==== ROUTES GIAO DIỆN ====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Main", "About.html"));
});

app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "Main", "Dashboard.html"));
});

app.get("/quiz.html", (req, res) => {
  res.sendFile(path.join(__dirname, "Main", "quiz.html"));
});

// ==== ĐĂNG KÝ ====
app.post("/register", async (req, res) => {
  const { name, email, password, phone, dob, role, gender } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Mật khẩu phải có ít nhất 8 ký tự.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run(
      `INSERT INTO users (name, email, password, phone, dob, role, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, phone, dob, role, gender]
    );
    res.json({ success: true, message: "Đăng ký thành công!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi: " + err.message });
  }
});

// ==== ĐĂNG NHẬP ====
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user)
      return res.json({ success: false, message: "Email không tồn tại." });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.json({ success: false, message: "Mật khẩu không đúng." });

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      gender: user.gender,
      role: user.role,
      avatar: user.avatar || "/img/avatar-MD.jpg",
    };

    res.json({ success: true, name: user.name, id: user.id });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi: " + err.message });
  }
});

// ==== XOÁ TÀI KHOẢN ====
app.delete("/delete-account", async (req, res) => {
  if (!req.session.user)
    return res.json({ success: false, message: "Chưa đăng nhập." });

  try {
    await db.run("DELETE FROM users WHERE id = ?", [req.session.user.id]);
    req.session.destroy();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ==== LẤY THÔNG TIN USER ====
app.get("/api/user", (req, res) => {
  const user = req.session?.user;
  if (user) {
    res.json({ success: true, ...user });
  } else {
    res.status(401).json({ success: false, message: "Chưa đăng nhập." });
  }
});

// ==== CẬP NHẬT THÔNG TIN ====
app.post("/api/user/update", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Chưa đăng nhập." });
  }
  const { name, phone, dob, gender, avatar } = req.body;
  const id = req.session.user.id;
  try {
    await db.run(
      `UPDATE users SET name = ?, phone = ?, dob = ?, gender = ?, avatar = ? WHERE id = ?`,
      [name, phone, dob, gender, avatar, id]
    );
    req.session.user = { ...req.session.user, name, phone, dob, gender, avatar };
    res.json({ success: true, message: "Cập nhật thành công." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi: " + err.message });
  }
});

// ==== API MON & CAU HOI ====
app.get("/api/subjects", async (req, res) => {
  try {
    const rows = await db.all("SELECT DISTINCT subject FROM questions");
    res.json(rows.map((r) => r.subject));
  } catch {
    res.status(500).json({ success: false, message: "Lỗi DB" });
  }
});

app.get("/api/questions", async (req, res) => {
  const subject = req.query.subject;
  try {
    const rows = await db.all(
      "SELECT * FROM questions WHERE subject = ? ORDER BY RANDOM() LIMIT 40",
      [subject]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== LƯU KẾT QUẢ ====
app.post("/api/saveResult", (req, res) => {
  const { subject, score, correct, wrong, duration, timestamp, userId } =
    req.body;
  db.run(
    `INSERT INTO results (subject, score, correct, wrong, duration, timestamp, userId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [subject, score, correct, wrong, duration, timestamp, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Lỗi lưu kết quả" });
      }
      res.json({ message: "Lưu thành công", id: this.lastID });
    }
  );
});

app.get("/api/results", async (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: "Thiếu userId" });

  try {
    const results = await db.all(
      "SELECT * FROM results WHERE userId = ? ORDER BY timestamp DESC",
      [userId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Lỗi server" });
  }
});

// ==== YÊU THÍCH MÔN ====
app.post("/api/favorite", async (req, res) => {
  const { subject } = req.body;
  const userId = req.session.user?.id;
  if (!userId) return res.json({ success: false, message: "Chưa đăng nhập" });

  await db.run(
    "INSERT OR IGNORE INTO favorites (user_id, subject) VALUES (?, ?)",
    [userId, subject]
  );
  res.json({ success: true });
});

app.delete("/api/favorite", async (req, res) => {
  const { subject } = req.body;
  const userId = req.session.user?.id;
  if (!userId) return res.json({ success: false, message: "Chưa đăng nhập" });

  await db.run(
    "DELETE FROM favorites WHERE user_id = ? AND subject = ?",
    [userId, subject]
  );
  res.json({ success: true });
});

app.get("/api/favorites", async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.json({ success: false });

  const rows = await db.all(
    "SELECT subject FROM favorites WHERE user_id = ?",
    [userId]
  );
  res.json({ success: true, favorites: rows.map((r) => r.subject) });
});
