const WORKER_URL = "https://flat-sunset-e1bc.create34568.workers.dev/";

// --- Local Storage Keys ---
const LS_PROFILE = "mary_profile";
const LS_MESSAGES = "mary_messages";

// --- Load Stored Data ---
let profile = JSON.parse(localStorage.getItem(LS_PROFILE)) || {
  name: "",
  daughter: "",
  son: "",
  partner: "",
  friends: ""
};

let messages = JSON.parse(localStorage.getItem(LS_MESSAGES)) || [];

// --- Save Helpers ---
function saveData() {
  localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
  localStorage.setItem(LS_MESSAGES, JSON.stringify(messages.slice(-15)));
}

// --- Profile Editor ---
function editProfile() {
  profile.name = prompt("User name:", profile.name) || profile.name;
  profile.daughter = prompt("Daughter name:", profile.daughter) || profile.daughter;
  profile.son = prompt("Son name:", profile.son) || profile.son;
  profile.partner = prompt("Partner name:", profile.partner) || profile.partner;
  profile.friends = prompt("Close friends:", profile.friends) || profile.friends;
  saveData();
  alert("Profile saved.");
}

// --- Build Memory Block ---
function buildProfileSummary() {
  return `
User Profile:
Name: ${profile.name || "Unknown"}
Daughter: ${profile.daughter || "None mentioned"}
Son: ${profile.son || "None mentioned"}
Partner: ${profile.partner || "None mentioned"}
Friends: ${profile.friends || "None mentioned"}
`;
}

// --- Send Message ---
async function sendMessage() {
  const inputBox = document.getElementById("inputBox");
  const responseBox = document.getElementById("responseBox");
  const userText = inputBox.value.trim();
  if (!userText) return;

  inputBox.value = "";
  responseBox.innerText = "Thinking...";

  // Add user message to memory
  messages.push({ role: "user", content: userText });

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: [
          { role: "system", content: "You are Mary, a warm and gentle companion. Reply kindly, briefly, and use the user's name occasionally if known." },
          { role: "system", content: buildProfileSummary() },
          ...messages.slice(-15)
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

    // Add assistant reply to memory
    messages.push({ role: "assistant", content: reply });

    // Keep only last 15
    messages = messages.slice(-15);

    saveData();

  } catch (error) {
    responseBox.innerText = "Connection error.";
  }

}
