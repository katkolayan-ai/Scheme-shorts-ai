import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const fileInput = document.getElementById("pdf");
const dropZone = document.getElementById("drop");
const generateButton = document.getElementById("generate");
const fileInfo = document.getElementById("fileInfo");
const status = document.getElementById("status");

let selectedFile = null;
let extractedText = "";

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer
  }).promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str || "")
      .join(" ");

    pages.push(pageText);
  }

  return pages.join("\n\n").trim();
}

async function handleFile(file) {
  if (!file) return;

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    setStatus("Please select a PDF file.", true);
    return;
  }

  selectedFile = file;
  extractedText = "";

  fileInfo.textContent = file.name;
  fileInfo.classList.remove("hidden");

  generateButton.disabled = true;
  setStatus("Reading PDF...");

  try {
    extractedText = await extractPdfText(file);

    if (!extractedText) {
      throw new Error("No selectable text found.");
    }

    generateButton.disabled = false;

    setStatus(
      "PDF read successfully. Ready to generate."
    );
  } catch (error) {
    console.error(error);

    setStatus(
      "This PDF has no selectable text. Please use a text-based PDF.",
      true
    );

    generateButton.disabled = true;
  }
}

/*
  IMPORTANT MOBILE FIX:
  The visible upload box is a label connected to the hidden
  file input. We also explicitly open the file picker when
  the box is tapped.
*/

dropZone.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];

  if (file) {
    handleFile(file);
  }
});

/* Drag and drop support */

["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();

    dropZone.classList.add("drag");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();

    dropZone.classList.remove("drag");
  });
});

dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer?.files?.[0];

  if (file) {
    handleFile(file);
  }
});

/* Generate explainer */

generateButton.addEventListener("click", async () => {
  if (!extractedText) {
    setStatus("Please select a PDF first.", true);
    return;
  }

  generateButton.disabled = true;
  generateButton.textContent = "Generating...";
  setStatus("Creating your 60-second explainer...");

  try {
    const response = await fetch("/api/generate", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        text: extractedText
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "AI generation failed."
      );
    }

    renderResult(data);

    setStatus(
      "Explainer generated successfully."
    );

  } catch (error) {
    console.error(error);

    /*
      If Gemini is unavailable, create a basic local
      demonstration summary instead of leaving the user
      with an error.
    */

    const fallback = createFallback(extractedText);

    renderResult(fallback);

    setStatus(
      "AI generation was unavailable, so a basic demo summary was created."
    );

  } finally {
    generateButton.disabled = false;
    generateButton.textContent =
      "Generate 60-second explainer";
  }
});

/* Display AI result */

function renderResult(result) {
  document
    .getElementById("empty")
    .classList.add("hidden");

  document
    .getElementById("result")
    .classList.remove("hidden");

  document.getElementById("name").textContent =
    result.schemeName ||
    "Not specified in the notice";

  document.getElementById("benefit").textContent =
    result.benefit ||
    "Not specified in the notice";

  document.getElementById("eligibility").textContent =
    result.eligibility ||
    "Not specified in the notice";

  document.getElementById("deadline").textContent =
    result.deadline ||
    "Not specified in the notice";

  document.getElementById("script").value =
    result.script || "";

  document.getElementById("note").textContent =
    result.note ||
    "Verify important information against the original official notification.";

  updateWordCount();
}

/* Word counter */

function updateWordCount() {
  const script =
    document.getElementById("script").value.trim();

  const count = script
    ? script.split(/\s+/).length
    : 0;

  document.getElementById("words").textContent =
    `${count} words`;
}

document
  .getElementById("script")
  .addEventListener("input", updateWordCount);

/* Local fallback */

function createFallback(text) {
  const lines = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  function findLine(keywords) {
    return (
      lines.find(line =>
        keywords.some(keyword =>
          line.toLowerCase().includes(keyword)
        )
      ) ||
      "Not specified in the notice"
    );
  }

  const schemeName =
    lines.find(line =>
      /scheme|yojana|programme|program|notification/i.test(
        line
      )
    ) ||
    lines[0] ||
    "Government scheme";

  const benefit = findLine([
    "benefit",
    "assistance",
    "financial",
    "amount",
    "₹",
    "rs."
  ]);

  const eligibility = findLine([
    "eligible",
    "eligibility",
    "applicant",
    "beneficiary"
  ]);

  const deadline = findLine([
    "deadline",
    "last date",
    "due date",
    "closing date"
  ]);

  const script =
    `This is a basic demo summary generated from the uploaded government notice. ` +
    `The scheme is ${schemeName}. ` +
    `The notice says: ${benefit}. ` +
    `Eligibility information: ${eligibility}. ` +
    `The deadline information is: ${deadline}. ` +
    `Please verify all important details in the original official notification.`;

  return {
    schemeName,
    benefit,
    eligibility,
    deadline,
    script,
    note:
      "Demo fallback: AI generation was unavailable. Verify all details against the original official notification."
  };
}

/* Copy button */

document
  .getElementById("copy")
  .addEventListener("click", async () => {
    const script =
      document.getElementById("script").value;

    try {
      await navigator.clipboard.writeText(script);

      setStatus("Script copied.");
    } catch (error) {
      setStatus(
        "Could not copy the script.",
        true
      );
    }
  });

/* Download button */

document
  .getElementById("download")
  .addEventListener("click", () => {
    const script =
      document.getElementById("script").value;

    const blob = new Blob(
      [script],
      {
        type: "text/plain;charset=utf-8"
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "schemeshorts-script.txt";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  });

/* Listen button */

document
  .getElementById("listen")
  .addEventListener("click", () => {
    const text =
      document.getElementById("script").value;

    if (
      !text ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.lang = "en-IN";
    speech.rate = 0.95;

    window.speechSynthesis.speak(speech);
  });
