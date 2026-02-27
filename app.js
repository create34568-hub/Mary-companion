const WORKER_URL = "https://flat-sunset-e1bc.create34568.workers.dev/";

// LocalStorage keys
const LS_NAME = "mary_name";
const LS_MESSAGES = "mary_messages";

// Load saved state
let userName = localStorage.getItem(LS_NAME) || "";
let messages = JSON.parse(localStorage.getItem(LS_MESSAGES) || "[]"); // [{role, content}...]

function saveData() {
  localStorage.setItem(LS_NAME, userName);
  localStorage.setItem(LS_MESSAGES, JSON.stringify(messages.slice(-15)));
}

// Very simple name capture from user text (basic patterns)
function tryExtractName(text) {
  // Examples: "I'm John", "I am John", "My name is John"
  const patterns = [
    /(?:^|\b)i[' ]?m\s+([A-Za-z][A-Za-z'\- ]{0,30})/i,
    /(?:^|\b)i\s+am\s+([A-Za-z][A-Za-z'\- ]{0,30})/i,
    /(?:^|\b)my\s+name\s+is\s+([A-Za-z][A-Za-z'\- ]{0,30})/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const candidate = m[1].trim();
      // Keep only first word as a simple "name"
      const first = candidate.split(/\s+/)[0];
      if (first.length >= 2 && first.length <= 20) return first;
    }
  }
  return "";
}

async function sendMessage() {
  const inputBox = document.getElementById("inputBox");
  const responseBox = document.getElementById("responseBox");
  const userText = inputBox.value.trim();
  if (!userText) return;

  inputBox.value = "";
  responseBox.innerText = "Thinking...";

  // Try to capture name if we don't have it yet
  if (!userName) {
    const extracted = tryExtractName(userText);
    if (extracted) {
      userName = extracted;
      saveData();
    }
  }

  // Add user message to memory
  messages.push({ role: "user", content: userText });
  messages = messages.slice(-15);
  saveData();

  // System prompt: Mary + name behaviour
  const systemMessage =
    "You are Mary, a warm and gentle AI companion for an older adult who may feel lonely. " +
    "Speak like a kind, patient friend using short sentences and simple words. " +
    "Ask one gentle question at a time. Keep replies brief unless asked for more. " +
    "If the user's name is unknown, politely ask what you should call them. " +
    "If the user's name is known, use it occasionally (not every message). " +
    "Do not give medical, legal, or financial advice. " +
    "If they mention self-harm/suicide/immediate danger, encourage contacting emergency services or a trusted person immediately (UK: 999/112). " +
    "Output only what Mary says.";

  // Give name context (short)
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

    // Save assistant reply
    messages.push({ role: "assistant", content: reply });
    messages = messages.slice(-15);
    saveData();

  } catch (error) {
    responseBox.innerText = "Connection error.";
  }
}
