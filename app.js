const WORKER_URL = "https://flat-sunset-e1bc.create34568.workers.dev/";

// --- Name + last 15 messages (your current memory) ---
const LS_NAME = "mary_name";
const LS_MESSAGES = "mary_messages";

let userName = localStorage.getItem(LS_NAME) || "";
let messages = JSON.parse(localStorage.getItem(LS_MESSAGES) || "[]");

function saveData() {
  localStorage.setItem(LS_NAME, userName);
  localStorage.setItem(LS_MESSAGES, JSON.stringify(messages.slice(-15)));
}

function tryExtractName(text) {
  const patterns = [
    /(?:^|\b)i[' ]?m\s+([A-Za-z][A-Za-z'\- ]{0,30})/i,
    /(?:^|\b)i\s+am\s+([A-Za-z][A-Za-z'\- ]{0,30})/i,
    /(?:^|\b)my\s+name\s+is\s+([A-Za-z][A-Za-z'\- ]{0,30})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const first = m[1].trim().split(/\s+/)[0];
      if (first.length >= 2 && first.length <= 20) return first;
    }
  }
  return "";
}

// --- Text-to-Speech (Mary speaks) ---
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel(); // stop previous speech
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92; // slightly slower (elderly-friendly)
  u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}

// --- Speech-to-Text (Talk button) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

function setStatus(t) {
  const el = document.getElementById("status");
  if (el) el.textContent = t;
}

function startListening() {
  if (!SpeechRecognition) {
    alert("Speech recognition isn't available here. Try Chrome on Android/desktop. Typing will still work.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-GB";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  setStatus("Listening…");

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.trim();
    document.getElementById("inputBox").value = text;
    setStatus("Heard: " + text);
    // Auto-send after speaking (optional). If you want manual, remove next line:
    sendMessage();
  };

  recognition.onerror = () => setStatus("Didn’t catch that. Try again.");
  recognition.onend = () => setStatus("");

  recognition.start();
}

function stopListening() {
  if (recognition) recognition.stop();
  setStatus("Stopped.");
}

// expose functions to HTML buttons
window.startListening = startListening;
window.stopListening = stopListening;

// --- Main send function ---
async function sendMessage() {
  const inputBox = document.getElementById("inputBox");
  const responseBox = document.getElementById("responseBox");
  const userText = inputBox.value.trim();
  if (!userText) return;

  inputBox.value = "";
  responseBox.innerText = "Thinking...";

  // capture name if missing
  if (!userName) {
    const extracted = tryExtractName(userText);
    if (extracted) {
      userName = extracted;
      saveData();
    }
  }

  // store user message (for AI context)
  messages.push({ role: "user", content: userText });
  messages = messages.slice(-15);
  saveData();

  const systemMessage =
    "You are Mary, a warm and gentle AI companion for an older adult who may feel lonely. " +
    "Speak like a kind, patient friend using short sentences and simple words. " +
    "Ask one gentle question at a time. Keep replies brief unless asked for more. " +
    "If the user's name is unknown, politely ask what you should call them. " +
    "If the user's name is known, use it occasionally (not every message). " +
    "Do not give medical, legal, or financial advice. " +
    "If they mention self-harm/suicide/immediate danger, encourage contacting emergency services or a trusted person immediately (UK: 999/112). " +
    "Output only what Mary says.";

  const nameContext = userName ? `The user's name is ${userName}.` : "The user's name is unknown.";

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: [
          { role: "system", content: systemMessage },
          { role: "system", content: nameContext },
          ...messages
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || !data.reply) {
      responseBox.innerText = "Error: " + JSON.stringify(data);
      return;
    }

    const reply = data.reply;
    responseBox.innerText = reply;

    // store assistant reply for context
    messages.push({ role: "assistant", content: reply });
    messages = messages.slice(-15);
    saveData();

    // Speak reply aloud
    speak(reply);

  } catch (error) {
    responseBox.innerText = "Connection error.";
  }
}

window.sendMessage = sendMessage;
