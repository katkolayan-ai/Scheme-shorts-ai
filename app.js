import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

/* =========================================================
   ELEMENTS
   ========================================================= */

const fileInput = document.getElementById("pdf");
const dropZone = document.getElementById("drop");
const generateButton = document.getElementById("generate");
const fileInfo = document.getElementById("fileInfo");
const status = document.getElementById("status");

const scriptBox = document.getElementById("script");
const listenButton = document.getElementById("listen");
const copyButton = document.getElementById("copy");
const downloadButton = document.getElementById("download");

let extractedText = "";
let currentResult = null;

let generatedAudioBlob = null;
let generatedAudioUrl = null;
let generatedVideoUrl = null;


/* =========================================================
   OPTIONAL LANGUAGE / VOICE ELEMENTS
   ========================================================= */

const languageSelect =
  document.getElementById("language");

const voiceSelect =
  document.getElementById("voice");


/*
   If the current HTML does not yet contain the language
   selector, create it automatically.
*/

function ensureSelectors() {

  if (languageSelect && voiceSelect) {
    return;
  }

  const existingContainer =
    generateButton?.parentElement;

  if (!existingContainer) {
    return;
  }

  if (!document.getElementById("language")) {

    const box =
      document.createElement("div");

    box.style.marginTop = "18px";

    box.innerHTML = `
      <label
        style="
          display:block;
          font-size:12px;
          font-weight:700;
          margin-bottom:7px;
          letter-spacing:.08em;
        "
      >
        VIDEO LANGUAGE
      </label>

      <select
        id="language"
        style="
          width:100%;
          padding:12px;
          border-radius:10px;
          border:1px solid #d9dee8;
          font-size:15px;
          background:white;
        "
      >
        <option value="en">🇬🇧 English</option>
        <option value="hi">🇮🇳 Hindi</option>
        <option value="kok">🌴 Konkani</option>
      </select>
    `;

    existingContainer.insertBefore(
      box,
      generateButton
    );
  }

  if (!document.getElementById("voice")) {

    const box =
      document.createElement("div");

    box.style.marginTop = "12px";

    box.innerHTML = `
      <label
        style="
          display:block;
          font-size:12px;
          font-weight:700;
          margin-bottom:7px;
          letter-spacing:.08em;
        "
      >
        AI VOICE
      </label>

      <select
        id="voice"
        style="
          width:100%;
          padding:12px;
          border-radius:10px;
          border:1px solid #d9dee8;
          font-size:15px;
          background:white;
        "
      >
        <option value="Kore">Kore — Warm Female</option>
        <option value="Puck">Puck — Energetic Male</option>
        <option value="Zephyr">Zephyr — Clear Female</option>
        <option value="Fenrir">Fenrir — Authoritative Male</option>
        <option value="Charon">Charon — Gentle Male</option>
        <option value="Aoede">Aoede — Expressive Female</option>
      </select>
    `;

    existingContainer.insertBefore(
      box,
      generateButton
    );
  }
}

ensureSelectors();


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(message, isError = false) {

  status.textContent = message;

  status.classList.toggle(
    "error",
    isError
  );
}


/* =========================================================
   PDF EXTRACTION
   ========================================================= */

async function extractPdfText(file) {

  const buffer =
    await file.arrayBuffer();

  const pdf =
    await pdfjsLib
      .getDocument({
        data: buffer
      })
      .promise;

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {

    const page =
      await pdf.getPage(
        pageNumber
      );

    const content =
      await page.getTextContent();

    const pageText =
      content.items
        .map(
          item =>
            item.str || ""
        )
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    pages.push(pageText);
  }

  return pages
    .join("\n\n")
    .trim();
}


/* =========================================================
   FILE HANDLING
   ========================================================= */

async function handleFile(file) {

  if (!file) return;

  const isPdf =
    file.type === "application/pdf" ||
    file.name
      .toLowerCase()
      .endsWith(".pdf");

  if (!isPdf) {

    setStatus(
      "Please select a PDF file.",
      true
    );

    return;
  }

  fileInfo.textContent =
    file.name;

  fileInfo.classList.remove(
    "hidden"
  );

  extractedText = "";

  generateButton.disabled =
    true;

  setStatus(
    "Reading PDF..."
  );

  try {

    extractedText =
      await extractPdfText(
        file
      );

    if (!extractedText) {

      throw new Error(
        "No selectable text found in this PDF."
      );
    }

    generateButton.disabled =
      false;

    setStatus(
      "PDF read successfully. Ready to generate."
    );

  } catch (error) {

    console.error(error);

    setStatus(
      "This PDF could not be read. Please use a text-based PDF.",
      true
    );
  }
}


dropZone.addEventListener(
  "click",
  () => fileInput.click()
);


fileInput.addEventListener(
  "change",
  () => {

    const file =
      fileInput.files?.[0];

    if (file) {
      handleFile(file);
    }
  }
);


/* =========================================================
   DRAG & DROP
   ========================================================= */

["dragenter", "dragover"]
  .forEach(
    eventName => {

      dropZone.addEventListener(
        eventName,
        event => {

          event.preventDefault();
          event.stopPropagation();

          dropZone.classList.add(
            "drag"
          );
        }
      );
    }
  );


["dragleave", "drop"]
  .forEach(
    eventName => {

      dropZone.addEventListener(
        eventName,
        event => {

          event.preventDefault();
          event.stopPropagation();

          dropZone.classList.remove(
            "drag"
          );
        }
      );
    }
  );


dropZone.addEventListener(
  "drop",
  event => {

    const file =
      event.dataTransfer
        ?.files?.[0];

    if (file) {
      handleFile(file);
    }
  }
);


/* =========================================================
   GENERATE EXPLAINER
   ========================================================= */

generateButton.addEventListener(
  "click",
  async () => {

    if (!extractedText) {

      setStatus(
        "Please select a PDF first.",
        true
      );

      return;
    }

    const language =
      document.getElementById(
        "language"
      )?.value || "en";

    generateButton.disabled =
      true;

    generateButton.textContent =
      "Generating...";

    setStatus(
      "AI is reading the government notification..."
    );

    try {

      const response =
        await fetch(
          "/api/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              text: extractedText,
              language: language
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.error ||
          "AI generation failed."
        );
      }

      currentResult =
        data;

      renderResult(
        data
      );

      setStatus(
        "✅ Explainer generated successfully."
      );

    } catch (error) {

      console.error(error);

      setStatus(
        error.message ||
        "AI generation failed.",
        true
      );

    } finally {

      generateButton.disabled =
        false;

      generateButton.textContent =
        "Generate 60-second explainer";
    }
  }
);


/* =========================================================
   DISPLAY RESULT
   ========================================================= */

function renderResult(result) {

  document
    .getElementById("empty")
    .classList.add("hidden");

  document
    .getElementById("result")
    .classList.remove("hidden");

  document.getElementById(
    "name"
  ).textContent =
    result.schemeName ||
    "Not specified in the notice.";

  document.getElementById(
    "benefit"
  ).textContent =
    result.benefit ||
    "Not specified in the notice.";

  document.getElementById(
    "eligibility"
  ).textContent =
    result.eligibility ||
    "Not specified in the notice.";

  document.getElementById(
    "deadline"
  ).textContent =
    result.deadline ||
    "Not specified in the notice.";

  scriptBox.value =
    result.script || "";

  document.getElementById(
    "note"
  ).textContent =
    result.note ||
    "Verify important information against the original official notification.";

  updateWordCount();

  addVideoControls();
}


/* =========================================================
   WORD COUNT
   ========================================================= */

function updateWordCount() {

  const text =
    scriptBox.value.trim();

  const count =
    text
      ? text.split(/\s+/).length
      : 0;

  document.getElementById(
    "words"
  ).textContent =
    `${count} words`;
}


scriptBox.addEventListener(
  "input",
  updateWordCount
);


/* =========================================================
   COPY
   ========================================================= */

copyButton.addEventListener(
  "click",
  async () => {

    try {

      await navigator.clipboard.writeText(
        scriptBox.value
      );

      setStatus(
        "Script copied."
      );

    } catch {

      scriptBox.select();

      document.execCommand(
        "copy"
      );

      setStatus(
        "Script copied."
      );
    }
  }
);


/* =========================================================
   DOWNLOAD SCRIPT
   ========================================================= */

downloadButton.addEventListener(
  "click",
  () => {

    const blob =
      new Blob(
        [scriptBox.value],
        {
          type:
            "text/plain;charset=utf-8"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      "SchemeShorts-script.txt";

    link.click();

    URL.revokeObjectURL(
      url
    );
  }
);


/* =========================================================
   GEMINI TTS
   ========================================================= */

async function generateVoiceover() {

  if (!currentResult) {

    throw new Error(
      "Generate the explainer first."
    );
  }

  const script =
    scriptBox.value.trim();

  if (!script) {

    throw new Error(
      "There is no script to convert to voice."
    );
  }

  const language =
    document.getElementById(
      "language"
    )?.value || "en";

  const voice =
    document.getElementById(
      "voice"
    )?.value || "Kore";

  setStatus(
    "🎙️ Generating AI voiceover..."
  );

  const response =
    await fetch(
      "/api/tts",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          text: script,
          language: language,
          voice: voice
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data.error ||
      "Voiceover generation failed."
    );
  }

  if (!data.audioBase64) {

    throw new Error(
      "Gemini returned no audio."
    );
  }

  /*
    Gemini TTS returns base64 audio.
    Convert it into a browser Blob.
  */

  const binary =
    atob(
      data.audioBase64
    );

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    bytes[i] =
      binary.charCodeAt(i);
  }

  generatedAudioBlob =
    new Blob(
      [bytes],
      {
        type:
          data.mimeType ||
          "audio/wav"
      }
    );

  if (generatedAudioUrl) {

    URL.revokeObjectURL(
      generatedAudioUrl
    );
  }

  generatedAudioUrl =
    URL.createObjectURL(
      generatedAudioBlob
    );

  return generatedAudioBlob;
}


/* =========================================================
   LISTEN — REAL AI VOICE
   ========================================================= */

listenButton.addEventListener(
  "click",
  async () => {

    listenButton.disabled =
      true;

    listenButton.textContent =
      "🎙️ Generating...";

    try {

      await generateVoiceover();

      const audio =
        new Audio(
          generatedAudioUrl
        );

      audio.play();

      setStatus(
        "🔊 Playing AI voiceover."
      );

      audio.onended =
        () => {

          listenButton.disabled =
            false;

          listenButton.textContent =
            "▶ Listen";
        };

    } catch (error) {

      console.error(error);

      setStatus(
        error.message,
        true
      );

      listenButton.disabled =
        false;

      listenButton.textContent =
        "▶ Listen";
    }
  }
);


/* =========================================================
   VIDEO CONTROLS
   ========================================================= */

function addVideoControls() {

  let controls =
    document.getElementById(
      "videoControls"
    );

  if (!controls) {

    controls =
      document.createElement(
        "div"
      );

    controls.id =
      "videoControls";

    controls.style.marginTop =
      "24px";

    controls.style.paddingTop =
      "20px";

    controls.style.borderTop =
      "1px solid #e5e7eb";

    document
      .getElementById("result")
      .appendChild(
        controls
      );
  }

  let button =
    document.getElementById(
      "createVideo"
    );

  if (!button) {

    button =
      document.createElement(
        "button"
      );

    button.id =
      "createVideo";

    button.className =
      "primary";

    button.style.width =
      "100%";

    button.textContent =
      "🎬 Create 60-second video";

    controls.appendChild(
      button
    );

  } else {

    button.onclick = null;
  }

  button.onclick =
    createVideo;
}


/* =========================================================
   TEXT WRAPPING
   ========================================================= */

function wrapText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight
) {

  const words =
    String(text)
      .replace(/\n/g, " \n ")
      .split(/\s+/);

  let line = "";

  for (
    const word of words
  ) {

    if (word === "\n") {

      if (line) {

        ctx.fillText(
          line,
          x,
          y
        );

        line = "";

        y += lineHeight;
      }

      continue;
    }

    const test =
      line
        ? `${line} ${word}`
        : word;

    if (
      ctx.measureText(
        test
      ).width > maxWidth &&
      line
    ) {

      ctx.fillText(
        line,
        x,
        y
      );

      line = word;

      y += lineHeight;

    } else {

      line = test;
    }
  }

  if (line) {

    ctx.fillText(
      line,
      x,
      y
    );

    y += lineHeight;
  }

  return y;
}


/* =========================================================
   VIDEO FRAME
   ========================================================= */

function drawVideoFrame(
  ctx,
  width,
  height,
  scene,
  progress,
  sceneNumber,
  totalScenes
) {

  /* Background */

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      width,
      height
    );

  gradient.addColorStop(
    0,
    "#08111f"
  );

  gradient.addColorStop(
    0.55,
    "#10243a"
  );

  gradient.addColorStop(
    1,
    "#07101d"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  /* Decorative glow */

  ctx.beginPath();

  ctx.arc(
    width - 50,
    170,
    190,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "rgba(75,170,255,0.08)";

  ctx.fill();


  ctx.beginPath();

  ctx.arc(
    40,
    height - 250,
    180,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "rgba(255,255,255,0.035)";

  ctx.fill();


  /* Brand */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 30px Arial";

  ctx.fillText(
    "SCHEME",
    55,
    72
  );

  ctx.fillText(
    "SHORTS AI",
    55,
    108
  );


  /* Scene number */

  ctx.fillStyle =
    "#9eb0c8";

  ctx.font =
    "22px Arial";

  ctx.fillText(
    `${sceneNumber} / ${totalScenes}`,
    width - 125,
    70
  );


  /* Accent line */

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    55,
    155,
    80,
    5
  );


  /* Scene title */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 44px Arial";

  let y =
    wrapText(
      ctx,
      scene.title,
      55,
      270,
      width - 110,
      58
    );


  /* Main content */

  ctx.fillStyle =
    "#dbe7f5";

  ctx.font =
    "bold 34px Arial";

  wrapText(
    ctx,
    scene.text,
    55,
    y + 85,
    width - 110,
    50
  );


  /* Progress */

  const barX =
    55;

  const barY =
    height - 110;

  const barWidth =
    width - 110;

  ctx.fillStyle =
    "rgba(255,255,255,0.14)";

  ctx.fillRect(
    barX,
    barY,
    barWidth,
    7
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    barX,
    barY,
    barWidth *
      Math.max(
        0,
        Math.min(
          1,
          progress
        )
      ),
    7
  );


  /* Footer */

  ctx.fillStyle =
    "#91a5bf";

  ctx.font =
    "20px Arial";

  ctx.fillText(
    "TEAM THIRD EYE",
    55,
    height - 55
  );
}


/* =========================================================
   CREATE VIDEO WITH VOICEOVER
   ========================================================= */

async function createVideo() {

  if (!currentResult) {

    setStatus(
      "Generate the explainer first.",
      true
    );

    return;
  }


  if (
    !HTMLCanvasElement.prototype.captureStream
  ) {

    setStatus(
      "Your browser does not support video creation. Please use Chrome.",
      true
    );

    return;
  }


  if (!window.MediaRecorder) {

    setStatus(
      "Video recording is not supported by this browser.",
      true
    );

    return;
  }


  const button =
    document.getElementById(
      "createVideo"
    );

  button.disabled =
    true;

  button.textContent =
    "🎙️ Generating voice...";


  try {

    /* -----------------------------------------
       STEP 1 — Generate AI voice
       ----------------------------------------- */

    await generateVoiceover();


    /* -----------------------------------------
       STEP 2 — Create audio element
       ----------------------------------------- */

    const audio =
      new Audio(
        generatedAudioUrl
      );

    audio.preload =
      "auto";


    await new Promise(
      resolve => {

        if (
          audio.readyState >= 2
        ) {

          resolve();

          return;
        }

        audio.onloadedmetadata =
          resolve;

        audio.onerror =
          resolve;
      }
    );


    /*
      The AI voice determines the natural
      duration. We create a video timeline
      around it.
    */

    const audioDuration =
      Math.max(
        1,
        audio.duration ||
          60
      );


    /* -----------------------------------------
       STEP 3 — Canvas
       ----------------------------------------- */

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      720;

    canvas.height =
      1280;

    const ctx =
      canvas.getContext(
        "2d"
      );


    /* -----------------------------------------
       STEP 4 — Capture video
       ----------------------------------------- */

    const videoStream =
      canvas.captureStream(
        30
      );


    /*
      Add audio track to the same stream.
      This makes the downloaded video contain
      the AI voiceover.
    */

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    const audioContext =
      new AudioContext();


    const source =
      audioContext.createMediaElementSource(
        audio
      );


    const destination =
      audioContext.createMediaStreamDestination();


    source.connect(
      destination
    );


    source.connect(
      audioContext.destination
    );


    destination.stream
      .getAudioTracks()
      .forEach(
        track =>
          videoStream.addTrack(
            track
          )
      );


    /* -----------------------------------------
       STEP 5 — Recorder
       ----------------------------------------- */

    let mimeType =
      "video/webm;codecs=vp9,opus";

    if (
      !MediaRecorder.isTypeSupported(
        mimeType
      )
    ) {

      mimeType =
        "video/webm;codecs=vp8,opus";
    }

    if (
      !MediaRecorder.isTypeSupported(
        mimeType
      )
    ) {

      mimeType =
        "video/webm";
    }


    const recorder =
      new MediaRecorder(
        videoStream,
        {
          mimeType,
          videoBitsPerSecond:
            3000000
        }
      );


    const chunks = [];


    recorder.ondataavailable =
      event => {

        if (
          event.data &&
          event.data.size
        ) {

          chunks.push(
            event.data
          );
        }
      };


    const stopped =
      new Promise(
        resolve => {

          recorder.onstop =
            resolve;
        }
      );


    /* -----------------------------------------
       STEP 6 — Scenes
       ----------------------------------------- */

    const scenes = [

      {
        start: 0,
        end: Math.min(
          6,
          audioDuration
        ),
        title:
          "Government schemes.\nSimplified.",
        text:
          "Important information\nin just one minute."
      },

      {
        start: 6,
        end: Math.min(
          15,
          audioDuration
        ),
        title:
          "THE SCHEME",
        text:
          currentResult.schemeName ||
          "Government scheme"
      },

      {
        start: 15,
        end: Math.min(
          26,
          audioDuration
        ),
        title:
          "WHAT DO YOU GET?",
        text:
          currentResult.benefit ||
          "Benefit not specified."
      },

      {
        start: 26,
        end: Math.min(
          39,
          audioDuration
        ),
        title:
          "WHO IS ELIGIBLE?",
        text:
          currentResult.eligibility ||
          "Eligibility not specified."
      },

      {
        start: 39,
        end: Math.min(
          47,
          audioDuration
        ),
        title:
          "IMPORTANT DATE",
        text:
          currentResult.deadline ||
          "Deadline not specified."
      },

      {
        start: 47,
        end: Math.min(
          55,
          audioDuration
        ),
        title:
          "BEFORE YOU APPLY",
        text:
          "Always verify important information\nfrom the official notification."
      },

      {
        start: 55,
        end:
          audioDuration,
        title:
          "SCHEME SHORTS AI",
        text:
          "Simple. Short. Useful."
      }

    ];


    /* -----------------------------------------
       STEP 7 — Start recording
       ----------------------------------------- */

    recorder.start(
      500
    );


    setStatus(
      "🎬 Creating your video with AI voiceover..."
    );


    await audioContext.resume();


    const startTime =
      performance.now();


    audio.currentTime =
      0;


    await audio.play();


    /* -----------------------------------------
       STEP 8 — Draw frames
       ----------------------------------------- */

    function draw() {

      const elapsed =
        (
          performance.now() -
          startTime
        ) / 1000;


      if (
        elapsed >= audioDuration
      ) {

        recorder.stop();

        return;
      }


      let scene =
        scenes[
          scenes.length - 1
        ];


      let sceneIndex =
        scenes.length - 1;


      for (
        let i = 0;
        i < scenes.length;
        i++
      ) {

        if (
          elapsed >=
            scenes[i].start &&
          elapsed <
            scenes[i].end
        ) {

          scene =
            scenes[i];

          sceneIndex =
            i;

          break;
        }
      }


      const duration =
        Math.max(
          0.1,
          scene.end -
            scene.start
        );


      const progress =
        (
          elapsed -
          scene.start
        ) / duration;


      drawVideoFrame(
        ctx,
        canvas.width,
        canvas.height,
        scene,
        progress,
        sceneIndex + 1,
        scenes.length
      );


      requestAnimationFrame(
        draw
      );
    }


    draw();


    await stopped;


    /* -----------------------------------------
       STEP 9 — Cleanup
       ----------------------------------------- */

    audio.pause();

    videoStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

    audioContext.close();


    /* -----------------------------------------
       STEP 10 — Final video blob
       ----------------------------------------- */

    const blob =
      new Blob(
        chunks,
        {
          type: mimeType
        }
      );


    if (!blob.size) {

      throw new Error(
        "The video file was empty."
      );
    }


    if (generatedVideoUrl) {

      URL.revokeObjectURL(
        generatedVideoUrl
      );
    }


    generatedVideoUrl =
      URL.createObjectURL(
        blob
      );


    /* -----------------------------------------
       STEP 11 — Preview
       ----------------------------------------- */

    const oldVideo =
      document.getElementById(
        "videoPreview"
      );

    if (oldVideo) {
      oldVideo.remove();
    }


    const controls =
      document.getElementById(
        "videoControls"
      );


    const preview =
      document.createElement(
        "video"
      );

    preview.id =
      "videoPreview";

    preview.controls =
      true;

    preview.playsInline =
      true;

    preview.src =
      generatedVideoUrl;

    preview.style.width =
      "100%";

    preview.style.maxWidth =
      "360px";

    preview.style.display =
      "block";

    preview.style.margin =
      "20px auto";

    preview.style.borderRadius =
      "18px";


    controls.appendChild(
      preview
    );


    /* -----------------------------------------
       STEP 12 — Audio download
       ----------------------------------------- */

    let audioButton =
      document.getElementById(
        "downloadAudio"
      );


    if (!audioButton) {

      audioButton =
        document.createElement(
          "button"
        );

      audioButton.id =
        "downloadAudio";

      audioButton.className =
        "secondary";

      audioButton.style.width =
        "100%";

      audioButton.style.marginTop =
        "10px";

      audioButton.textContent =
        "🎙️ Download Voiceover";

      controls.appendChild(
        audioButton
      );
    }


    audioButton.onclick =
      () => {

        const link =
          document.createElement(
            "a"
          );

        link.href =
          generatedAudioUrl;

        link.download =
          "SchemeShorts-AI-voiceover.wav";

        link.click();
      };


    /* -----------------------------------------
       STEP 13 — Video download
       ----------------------------------------- */

    let videoDownload =
      document.getElementById(
        "downloadVideo"
      );


    if (!videoDownload) {

      videoDownload =
        document.createElement(
          "button"
        );

      videoDownload.id =
        "downloadVideo";

      videoDownload.className =
        "primary";

      videoDownload.style.width =
        "100%";

      videoDownload.style.marginTop =
        "10px";

      videoDownload.textContent =
        "⬇ Download Video";

      controls.appendChild(
        videoDownload
      );
    }


    videoDownload.onclick =
      () => {

        const link =
          document.createElement(
            "a"
          );

        link.href =
          generatedVideoUrl;

        link.download =
          "SchemeShorts-60-second-explainer.webm";

        link.click();
      };


    button.disabled =
      false;

    button.textContent =
      "🎬 Create video again";


    setStatus(
      "🎉 VIDEO READY — AI voiceover included!"
    );


  } catch (error) {

    console.error(
      "VIDEO ERROR:",
      error
    );

    setStatus(
      "Video creation failed: " +
      error.message,
      true
    );

    button.disabled =
      false;

    button.textContent =
      "🎬 Create 60-second video";
  }
}


/* =========================================================
   INITIAL STATUS
   ========================================================= */

setStatus(
  "Upload a government PDF to begin."
);