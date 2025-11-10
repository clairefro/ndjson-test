const languages = ["en", "zh", "ja"];
const container = document.getElementById("idioms-container");
const searchInput = document.getElementById("search");
const itemCountEl = document.getElementById("item-count");

// Virtualized render
const visibleIdioms = [];
const batchSize = 100;

// Simple in-memory search index
let allIdioms = [];

// Update item count display
function updateItemCount(count) {
  itemCountEl.textContent = `Items: ${count}`;
}

// Streaming NDJSON
async function streamNDJSON(url, onData) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line);
      onData(obj);
    }
  }

  if (buffer.trim()) onData(JSON.parse(buffer));
}

// Render idiom batch
function renderBatch(batch) {
  const fragment = document.createDocumentFragment();
  batch.forEach((idiom) => {
    const div = document.createElement("div");
    div.className = "idiom";
    div.innerHTML = `<strong>${idiom.idiom}</strong> (${idiom.language})<br>
                    ${idiom.romanization ? idiom.romanization + "<br>" : ""}
                    ${
                      idiom.literal
                        ? "Translation: " + idiom.literal + "<br>"
                        : ""
                    }
                     Meaning: ${idiom.meaning}<br>
                     Tags: ${idiom.tags.join(", ")}`;

    // Add edit button
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openGitHubIssue(idiom);
    div.appendChild(editBtn);

    fragment.appendChild(div);
  });
  container.appendChild(fragment);
}

// Open GitHub issue with templated content
function openGitHubIssue(idiom) {
  const repo = "clairefro/ndjson-test"; // Update with your repo
  const title = encodeURIComponent(
    `Edit idiom: ${idiom.idiom} (${idiom.language})`
  );
  const body = encodeURIComponent(
    `## Idiom Details\n\n` +
      `**Idiom:** ${idiom.idiom}\n` +
      `**Language:** ${idiom.language}\n` +
      `${
        idiom.romanization ? `**Romanization:** ${idiom.romanization}\n` : ""
      }` +
      `${idiom.literal ? `**Literal Translation:** ${idiom.literal}\n` : ""}` +
      `**Meaning:** ${idiom.meaning}\n` +
      `**Tags:** ${idiom.tags.join(", ")}\n\n` +
      `## Proposed Changes\n\n` +
      `<!-- Describe what should be changed and why -->\n\n` +
      `## Additional Context\n\n` +
      `<!-- Add any other context about the edit here -->`
  );

  const url = `https://github.com/${repo}/issues/new?title=${title}&body=${body}`;
  window.open(url, "_blank");
}

// Add idiom to buffer and render in batches
function addIdiom(idiom) {
  allIdioms.push(idiom);
  visibleIdioms.push(idiom);
  if (visibleIdioms.length >= batchSize) {
    renderBatch(visibleIdioms.splice(0, visibleIdioms.length));
  }
}

// Filter idioms by search
function filterIdioms(query) {
  container.innerHTML = "";
  const filtered = allIdioms.filter((i) =>
    i.idiom.toLowerCase().includes(query.toLowerCase())
  );
  renderBatch(filtered);
  updateItemCount(filtered.length);
}

// Load single language
async function loadLanguage(lang) {
  container.innerHTML = "";
  allIdioms = [];
  visibleIdioms.length = 0;
  updateItemCount(0);
  await streamNDJSON(`idioms/${lang}.ndjson`, addIdiom);
  // Render any remaining idioms
  if (visibleIdioms.length > 0) {
    renderBatch(visibleIdioms.splice(0, visibleIdioms.length));
  }
  updateItemCount(allIdioms.length);
}

// Load all languages concurrently
async function loadAllLanguages() {
  container.innerHTML = "";
  allIdioms = [];
  visibleIdioms.length = 0;
  updateItemCount(0);
  await Promise.all(
    languages.map((lang) => streamNDJSON(`idioms/${lang}.ndjson`, addIdiom))
  );
  // Render any remaining idioms
  if (visibleIdioms.length > 0) {
    renderBatch(visibleIdioms.splice(0, visibleIdioms.length));
  }
  updateItemCount(allIdioms.length);
}

// Event listeners
document
  .getElementById("language-select")
  .addEventListener("change", (e) => loadLanguage(e.target.value));
document.getElementById("load-all").addEventListener("click", loadAllLanguages);
searchInput.addEventListener("input", (e) => filterIdioms(e.target.value));

// Initial load
loadLanguage("en");
