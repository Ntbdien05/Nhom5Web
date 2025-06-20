const subject = localStorage.getItem("selectedSubject");
document.getElementById("subjectTitle").textContent =
  "Môn thi: " + (subject || "N/A");

let questions = [];
let current = 0;
let autoTime = 0;
let autoTimer;
let answersState = [];
let startTime = Date.now();
let correctCount = 0;
let wrongCount = 0;
let quizStartTime;
let timerInterval;

function renderQuestion(index) {
  const q = questions[index];
  const container = document.getElementById("quizContainer");

  const answered = answersState[index].answered;
  const selectedOption = answersState[index].selectedOption || null;

  container.innerHTML = `
      <div class="question">
        <p><strong>Câu ${index + 1}:</strong> ${q.question}</p>
        <label><input type="radio" name="q${q.id}" value="A" ${
    answered ? "disabled" : ""
  } ${selectedOption === "A" ? "checked" : ""}> A. ${q.optionA}</label><br>
        <label><input type="radio" name="q${q.id}" value="B" ${
    answered ? "disabled" : ""
  } ${selectedOption === "B" ? "checked" : ""}> B. ${q.optionB}</label><br>
        <label><input type="radio" name="q${q.id}" value="C" ${
    answered ? "disabled" : ""
  } ${selectedOption === "C" ? "checked" : ""}> C. ${q.optionC}</label><br>
        <label><input type="radio" name="q${q.id}" value="D" ${
    answered ? "disabled" : ""
  } ${selectedOption === "D" ? "checked" : ""}> D. ${q.optionD}</label><br>
      </div>
    `;

  if (answered) {
    const labels = container.querySelectorAll("label");

    labels.forEach((label) => {
      const input = label.querySelector("input");
      const option = input.value;

      if (option === q.correctOption) {
        label.style.background = "#c8e6c9";
        label.style.borderRadius = "6px";
        if (!label.innerHTML.includes("✅ Đúng"))
          label.innerHTML += " <strong>✅ Đúng</strong>";
      }

      if (option === selectedOption && option !== q.correctOption) {
        label.style.background = "#ffcdd2";
        label.style.borderRadius = "6px";
        if (!label.innerHTML.includes("❌ Sai"))
          label.innerHTML += " <strong>❌ Sai</strong>";
      }
    });
  } else {
    const labels = container.querySelectorAll("label");
    labels.forEach((label) => {
      label.style.background = "";
      label.style.borderRadius = "";
      label.innerHTML = label.innerHTML
        .replace(/ <strong>✅ Đúng<\/strong>/g, "")
        .replace(/ <strong>❌ Sai<\/strong>/g, "");
    });
  }

  const inputs = container.querySelectorAll(`input[name="q${q.id}"]`);
  inputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      markAnswer(index, e.target.value);
    });
  });

  document.querySelectorAll("#questionNavGrid button").forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });
  updateProgress();
  clearTimeout(autoTimer);
}

function renderNavButtons() {
  const nav = document.getElementById("questionNavGrid");
  nav.innerHTML = "";
  questions.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.textContent = i + 1;
    btn.onclick = () => {
      current = i;
      renderQuestion(current);
    };
    nav.appendChild(btn);
  });
}

function nextQuestion() {
  if (current < questions.length - 1) {
    current++;
    renderQuestion(current);
  }
}

function prevQuestion() {
  if (current > 0) {
    current--;
    renderQuestion(current);
  }
}

function markAnswer(index, value) {
  if (answersState[index].answered) return;
  const q = questions[index];
  const isCorrect = value === q.correctOption;
  answersState[index] = {
    answered: true,
    isCorrect,
    selectedOption: value,
  };

  const container = document.querySelector(`#quizContainer .question`);
  const inputs = container.querySelectorAll(`input[name="q${q.id}"]`);
  const labels = container.querySelectorAll("label");

  inputs.forEach((input) => (input.disabled = true));

  labels.forEach((label) => {
    const input = label.querySelector("input");
    const option = input.value;

    if (option === q.correctOption) {
      label.style.background = "#c8e6c9"; // xanh lá nhạt
      label.style.borderRadius = "6px";
      if (!label.innerHTML.includes("✅ Đúng"))
        label.innerHTML += " <strong>✅ Đúng</strong>";
    }

    if (option === value && option !== q.correctOption) {
      label.style.background = "#ffcdd2"; // đỏ nhạt
      label.style.borderRadius = "6px";
      if (!label.innerHTML.includes("❌ Sai"))
        label.innerHTML += " <strong>❌ Sai</strong>";
    }
  });

  const navBtns = document.querySelectorAll("#questionNavGrid button");
  navBtns[index].style.backgroundColor = isCorrect ? "#4caf50" : "#f44336";
  navBtns[index].style.color = "white";

  updateProgress();
  clearTimeout(autoTimer);
  if (autoTime > 0) {
    autoTimer = setTimeout(() => {
      nextQuestion();
    }, autoTime * 1000);
  }
}

function updateProgress() {
  const doneCount = answersState.filter((a) => a.answered).length;
  const correctCount = answersState.filter(
    (a) => a.answered && a.isCorrect
  ).length;
  const wrongCount = answersState.filter(
    (a) => a.answered && !a.isCorrect
  ).length;

  document.getElementById("progressDone").textContent = doneCount;
  document.getElementById("correctCount").textContent = correctCount;
  document.getElementById("wrongCount").textContent = wrongCount;
}

// Countdown
document.addEventListener("DOMContentLoaded", function () {
  let countdown = 5;
  const number = document.getElementById("countdownNumber");
  const overlay = document.getElementById("countdownOverlay");
  const circle = document.getElementById("progressCircle");
  const quizWrapper = document.getElementById("quizWrapper");

  const totalLength = 2 * Math.PI * 54;
  circle.style.strokeDasharray = totalLength;
  circle.style.strokeDashoffset = 0;

  const interval = setInterval(() => {
    countdown--;
    number.textContent = countdown;

    const offset = totalLength * (1 - countdown / 5);
    circle.style.strokeDashoffset = offset;

    if (countdown <= 0) {
      clearInterval(interval);
      overlay.style.display = "none";
      quizWrapper.style.display = "flex";
      startTimer();
    }
  }, 1000);
});

function startTimer() {
  quizStartTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (elapsed % 60).toString().padStart(2, "0");
    document.getElementById("timer").textContent = `${minutes}:${seconds}`;
  }, 1000);
}

fetch(`/api/questions?subject=${encodeURIComponent(subject)}`)
  .then((res) => res.json())
  .then((data) => {
    questions = data;
    document.getElementById("totalCount").textContent = questions.length;
    answersState = new Array(questions.length)
      .fill(null)
      .map(() => ({ answered: false, isCorrect: false }));
    renderNavButtons();
    renderQuestion(current);

    // Tự động chuyển câu
    document.getElementById("autoNext").addEventListener("change", (e) => {
      autoTime = parseInt(e.target.value);
    });
  })
  .catch((err) => {
    document.getElementById("quizContainer").innerHTML = "Lỗi khi tải câu hỏi.";
    console.error(err);
  });

// Nộp bài
document.getElementById("submitBtn").addEventListener("click", finishQuiz);
function finishQuiz() {
  clearInterval(timerInterval);
  const totalQuestions = questions.length;
  const correct = answersState.filter((a) => a.answered && a.isCorrect).length;
  const wrong = answersState.filter((a) => a.answered && !a.isCorrect).length;
  const score = Math.min(10, (correct * 0.25).toFixed(2));
  const endTime = Date.now();
  const durationSeconds = Math.floor((endTime - quizStartTime) / 1000);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedTime = `${minutes} phút ${seconds} giây`;

  showResultPopup(score, correct, totalQuestions, formattedTime); // ✅ sửa lại
  submitQuizResult(subject, score, correct, wrong, durationSeconds); // Gửi kết quả
}

// ✅ Gửi kết quả lên server
function submitQuizResult(subject, score, correct, wrong, duration) {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  fetch("/api/saveResult", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject,
      score,
      correct,
      wrong,
      duration,
      timestamp: new Date().toISOString(),
      userId: parseInt(userId),
    }),
  })
    .then((res) => res.json())
    .then((data) => console.log("✅ Đã lưu kết quả:", data))
    .catch((err) => console.error("❌ Lỗi lưu kết quả:", err));
}

// ✅ Hiển thị pop-up
function showResultPopup(score, correct, total, timeSpent) {
  document.getElementById("popupScore").textContent =
    `Bạn đúng ${correct} / ${total} câu (${((correct / total) * 100).toFixed(1)}%)`;
  document.getElementById("popupTime").textContent =
    `Thời gian làm bài: ${timeSpent}`;
  document.getElementById("popupDetails").textContent =
    `Môn thi: ${subject}`;
  document.getElementById("resultPopup").classList.remove("hidden");
}

// ✅ Đóng pop-up
function closePopup() {
  document.getElementById("resultPopup").classList.add("hidden");
  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 500); // Đợi 0.5 giây cho đẹp, hoặc bỏ luôn nếu muốn chuyển ngay
}
