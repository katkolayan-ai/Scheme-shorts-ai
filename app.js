import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const fileInput = document.getElementById("pdf");
const dropZone = document.getElementById("drop");
const generateButton = document.getElementById("generate");
const fileInfo = document.getElementById("fileInfo");
const status = document.getElementById("status");

let extractedText = "";
let currentResult = null;
let generatedVideoUrl = null;

/* =========================================================
   STATUS
   ========================================================= */

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}


/* =========================================================
   PDF TEXT EXTRACTION
   ========================================================= */

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer
  }).promise;

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push(pageText);
  }

  return pages.join("\n\n").trim();
}


/* =========================================================
   FILE UPLOAD
   ========================================================= */

async function handleFile(file) {
  if (!file) return;

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    setStatus(
      "Please select a PDF file.",
      true
    );
    return;
  }

  fileInfo.textContent = file.name;
  fileInfo.classList.remove("hidden");

  extractedText = "";

  generateButton.disabled = true;

  setStatus("Reading PDF...");

  try {
    extractedText =
      await extractPdfText(file);

    if (!extractedText) {
      throw new Error(
        "No selectable text found in this PDF."
      );
    }

    generateButton.disabled = false;

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
   DRAG AND DROP
   ========================================================= */

["dragenter", "dragover"].forEach(
  eventName => {
    dropZone.addEventListener(
      eventName,
      event => {
        event.preventDefault();
        event.stopPropagation();

        dropZone.classList.add("drag");
      }
    );
  }
);

["dragleave", "drop"].forEach(
  eventName => {
    dropZone.addEventListener(
      eventName,
      event => {
        event.preventDefault();
        event.stopPropagation();

        dropZone.classList.remove("drag");
      }
    );
  }
);

dropZone.addEventListener(
  "drop",
  event => {
    const file =
      event.dataTransfer?.files?.[0];

    if (file) {
      handleFile(file);
    }
  }
);


/* =========================================================
   GEMINI GENERATION
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

    generateButton.disabled = true;

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
              text: extractedText
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

      currentResult = data;

      renderResult(data);

      setStatus(
        "Explainer generated successfully."
      );

    } catch (error) {

      console.error(error);

      setStatus(
        error.message ||
        "AI generation failed.",
        true
      );

    } finally {

      generateButton.disabled = false;

      generateButton.textContent =
        "Generate 60-second explainer";
    }
  }
);


/* =========================================================
   DISPLAY AI RESULT
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

  document.getElementById(
    "script"
  ).value =
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

  const script =
    document
      .getElementById("script")
      .value
      .trim();

  const count =
    script
      ? script.split(/\s+/).length
      : 0;

  document.getElementById(
    "words"
  ).textContent =
    `${count} words`;
}

document
  .getElementById("script")
  .addEventListener(
    "input",
    updateWordCount
  );


/* =========================================================
   VIDEO CONTROLS
   ========================================================= */

function addVideoControls() {

  if (
    document.getElementById(
      "videoControls"
    )
  ) {
    return;
  }

  const result =
    document.getElementById(
      "result"
    );

  const container =
    document.createElement(
      "div"
    );

  container.id =
    "videoControls";

  container.style.marginTop =
    "20px";

  container.style.paddingTop =
    "20px";

  container.style.borderTop =
    "1px solid #e5e7eb";

  const heading =
    document.createElement(
      "h3"
    );

  heading.textContent =
    "🎬 Video";

  heading.style.marginBottom =
    "10px";

  container.appendChild(
    heading
  );

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "createVideo";

  button.className =
    "primary";

  button.textContent =
    "Create 60-second video";

  button.style.width =
    "100%";

  button.addEventListener(
    "click",
    createVideo
  );

  container.appendChild(
    button
  );

  result.appendChild(
    container
  );
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

  const paragraphs =
    String(text)
      .split("\n");

  for (
    const paragraph of paragraphs
  ) {

    const words =
      paragraph.split(" ");

    let line = "";

    for (
      const word of words
    ) {

      const testLine =
        line
          ? `${line} ${word}`
          : word;

      const width =
        ctx.measureText(
          testLine
        ).width;

      if (
        width > maxWidth &&
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

        line = testLine;
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
  }
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

  ctx.fillStyle =
    "#0b1220";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  /* Decorative circle */

  ctx.beginPath();

  ctx.arc(
    width - 80,
    110,
    130,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "rgba(255,255,255,0.04)";

  ctx.fill();


  /* Brand */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 30px Arial";

  ctx.fillText(
    "SCHEME",
    55,
    70
  );

  ctx.fillText(
    "SHORTS AI",
    55,
    108
  );


  /* Scene number */

  ctx.fillStyle =
    "#8fa3bf";

  ctx.font =
    "24px Arial";

  ctx.fillText(
    `${sceneNumber}/${totalScenes}`,
    width - 110,
    75
  );


  /* Small line */

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    55,
    160,
    70,
    5
  );


  /* Title */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 46px Arial";

  wrapText(
    ctx,
    scene.title,
    55,
    270,
    width - 110,
    60
  );


  /* Main text */

  ctx.fillStyle =
    "#dce6f2";

  ctx.font =
    "bold 36px Arial";

  wrapText(
    ctx,
    scene.text,
    55,
    470,
    width - 110,
    54
  );


  /* Progress */

  const barX = 55;
  const barY = height - 115;
  const barWidth =
    width - 110;

  ctx.fillStyle =
    "#26344d";

  ctx.fillRect(
    barX,
    barY,
    barWidth,
    8
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    barX,
    barY,
    barWidth * progress,
    8
  );


  /* Footer */

  ctx.fillStyle =
    "#8fa3bf";

  ctx.font =
    "22px Arial";

  ctx.fillText(
    "TEAM THIRD EYE",
    55,
    height - 55
  );
}


/* =========================================================
   CREATE REAL 60-SECOND VIDEO
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
    !HTMLCanvasElement.prototype
      .captureStream
  ) {

    setStatus(
      "Your browser does not support video creation. Please use Chrome.",
      true
    );

    return;
  }

  if (
    !window.MediaRecorder
  ) {

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

  button.disabled = true;

  button.textContent =
    "Creating video...";


  setStatus(
    "🎬 Creating your real 60-second video. Keep this page open..."
  );


  try {

    /* 9:16 vertical */

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = 720;
    canvas.height = 1280;

    const ctx =
      canvas.getContext("2d");


    /* Video stream */

    const stream =
      canvas.captureStream(30);


    /* Find supported format */

    let mimeType =
      "video/webm;codecs=vp9";

    if (
      !MediaRecorder.isTypeSupported(
        mimeType
      )
    ) {

      mimeType =
        "video/webm;codecs=vp8";
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
        stream,
        {
          mimeType,
          videoBitsPerSecond:
            2500000
        }
      );


    const chunks = [];


    recorder.ondataavailable =
      event => {

        if (
          event.data &&
          event.data.size > 0
        ) {

          chunks.push(
            event.data
          );
        }
      };


    const stopped =
      new Promise(resolve => {

        recorder.onstop =
          resolve;
      });


    /* =====================================================
       EXACTLY 60 SECONDS
       ===================================================== */

    const scenes = [

      {
        duration: 6,
        title:
          "Government schemes.\nSimplified.",
        text:
          "Understand important government\nschemes in just 60 seconds."
      },

      {
        duration: 9,
        title:
          "THE SCHEME",
        text:
          currentResult.schemeName ||
          "Government scheme"
      },

      {
        duration: 11,
        title:
          "WHAT DO YOU GET?",
        text:
          currentResult.benefit ||
          "Benefit not specified in the notice."
      },

      {
        duration: 13,
        title:
          "WHO IS ELIGIBLE?",
        text:
          currentResult.eligibility ||
          "Eligibility not specified in the notice."
      },

      {
        duration: 8,
        title:
          "IMPORTANT DATE",
        text:
          currentResult.deadline ||
          "Deadline not specified in the notice."
      },

      {
        duration: 8,
        title:
          "BEFORE YOU APPLY",
        text:
          "Check the original official\nnotification carefully."
      },

      {
        duration: 5,
        title:
          "SCHEME SHORTS AI",
        text:
          "Simple. Short. Useful.\nTEAM THIRD EYE"
      }
    ];


    const totalDuration =
      scenes.reduce(
        (sum, scene) =>
          sum + scene.duration,
        0
      );


    /* Safety check */

    if (
      totalDuration !== 60
    ) {

      throw new Error(
        "Video timeline configuration error."
      );
    }


    recorder.start(
      1000
    );


    const start =
      performance.now();


    function drawFrame() {

      const elapsed =
        (
          performance.now() -
          start
        ) / 1000;


      if (
        elapsed >= totalDuration
      ) {

        drawVideoFrame(
          ctx,
          canvas.width,
          canvas.height,
          scenes[
            scenes.length - 1
          ],
          1,
          scenes.length,
          scenes.length
        );

        recorder.stop();

        return;
      }


      let accumulated = 0;


      for (
        let i = 0;
        i < scenes.length;
        i++
      ) {

        const scene =
          scenes[i];


        if (
          elapsed <
          accumulated +
          scene.duration
        ) {

          const sceneElapsed =
            elapsed -
            accumulated;

          const progress =
            sceneElapsed /
            scene.duration;


          drawVideoFrame(
            ctx,
            canvas.width,
            canvas.height,
            scene,
            progress,
            i + 1,
            scenes.length
          );


          requestAnimationFrame(
            drawFrame
          );

          return;
        }


        accumulated +=
          scene.duration;
      }
    }


    drawFrame();


    await stopped;


    stream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );


    /* Create video file */

    const blob =
      new Blob(
        chunks,
        {
          type: mimeType
        }
      );


    if (
      !blob.size
    ) {

      throw new Error(
        "The video file was empty."
      );
    }


    /* Remove old preview */

    const oldPreview =
      document.getElementById(
        "videoPreview"
      );

    if (oldPreview) {
      oldPreview.remove();
    }


    /* Create video URL */

    if (generatedVideoUrl) {

      URL.revokeObjectURL(
        generatedVideoUrl
      );
    }

    generatedVideoUrl =
      URL.createObjectURL(
        blob
      );


    /* Preview */

    const video =
      document.createElement(
        "video"
      );

    video.id =
      "videoPreview";

    video.controls = true;

    video.playsInline = true;

    video.src =
      generatedVideoUrl;

    video.style.width =
      "100%";

    video.style.maxWidth =
      "360px";

    video.style.display =
      "block";

    video.style.margin =
      "20px auto 12px";

    video.style.borderRadius =
      "18px";


    const controls =
      document.getElementById(
        "videoControls"
      );


    controls.appendChild(
      video
    );


    /* Download */

    const downloadButton =
      document.createElement(
        "button"
      );

    downloadButton.className =
      "primary";

    downloadButton.textContent =
      "⬇ Download Video";

    downloadButton.style.width =
      "100%";


    downloadButton.addEventListener(
      "click",
      () => {

        const link =
          document.createElement(
            "a"
          );

        link.href =
          generatedVideoUrl;

        link.download =
          "SchemeShorts-60-second-explainer.webm";

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();
      }
    );


    controls.appendChild(
      downloadButton
    );


    setStatus(
      "🎉 VIDEO CREATED SUCCESSFULLY! Preview it below and tap Download Video."
    );


    button.textContent =
      "🎬 Create video again";


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

    button.textContent =
      "🎬 Create 60-second video";
  }


  button.disabled = false;
}


/* =========================================================
   COPY SCRIPT
   ========================================================= */

document
  .getElementById("copy")
  .addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard.writeText(
          document
            .getElementById("script")
            .value
        );

        setStatus(
          "Script copied."
        );

      } catch {

        setStatus(
          "Could not copy the script.",
          true
        );
      }
    }
  );


/* =========================================================
   DOWNLOAD SCRIPT
   ========================================================= */

document
  .getElementById("download")
  .addEventListener(
    "click",
    () => {

      const script =
        document
          .getElementById("script")
          .value;


      const blob =
        new Blob(
          [script],
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


      link.href =
        url;

      link.download =
        "schemeshorts-script.txt";


      document.body.appendChild(
        link
      );

      link.click();

      link.remove();


      URL.revokeObjectURL(
        url
      );
    }
  );


/* =========================================================
   LISTEN TO SCRIPT
   ========================================================= */

document
  .getElementById("listen")
  .addEventListener(
    "click",
    () => {

      const text =
        document
          .getElementById("script")
          .value;


      if (
        !text ||
        !("speechSynthesis" in window)
      ) {
        return;
      }


      window.speechSynthesis.cancel();


      const speech =
        new SpeechSynthesisUtterance(
          text
        );


      speech.lang =
        "en-IN";

      speech.rate =
        0.95;


      window.speechSynthesis.speak(
        speech
      );
    }
  );