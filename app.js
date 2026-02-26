const WORKER_URL = "https://flat-sunset-e1bc.create34568.workers.dev/";

async function sendMessage() {
  const input = document.getElementById("inputBox").value;
  const responseBox = document.getElementById("responseBox");

  responseBox.innerText = "Thinking...";

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: [
          { role: "system", content: "You are Mary, a warm companion. Reply kindly and briefly." },
          { role: "user", content: input }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      responseBox.innerText = "Error: " + JSON.stringify(data);
      return;
    }

    responseBox.innerText = data.reply;

  } catch (error) {
    responseBox.innerText = "Connection error.";
  }
}