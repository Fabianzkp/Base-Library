(function () {
  const params = new URLSearchParams(window.location.search);

  const rawUrl = params.get("url");
  const type = params.get("type"); // epub | pdf | html
  const title = params.get("title") || "Reader";
  const preview = params.get("preview"); // link HTML (Google Books) if exist


  const titleEl = document.getElementById("title");
  const pageInfoEl = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const viewer = document.getElementById("viewer");
  const pdfCanvas = document.getElementById("pdfCanvas");
  const htmlFrame = document.getElementById("htmlFrame");
  

  function showOnly(which) {
    viewer.classList.add("hidden");
    pdfCanvas.classList.add("hidden");
    htmlFrame.classList.add("hidden");

    if (which === "epub") viewer.classList.remove("hidden");
    if (which === "pdf") pdfCanvas.classList.remove("hidden");
    if (which === "html") htmlFrame.classList.remove("hidden");
  }

  function setStatus(text) {
    pageInfoEl.textContent = text || "";
  }

  function openDirect(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!rawUrl || !type) {
    titleEl.textContent = "Invalid reader link";
    setStatus("Missing url or type.");
    return;
  }

  let bookUrl = decodeURIComponent(rawUrl);

  if (bookUrl.startsWith("/")) {
    bookUrl = new URL(bookUrl, window.location.origin).toString();
  }

  titleEl.textContent = decodeURIComponent(title);

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "ArrowRight") nextBtn.click();
  });

 async function initEpub() {
  showOnly("epub");
  setStatus("Loading EPUB…");

  try {
    console.log("Fetching EPUB from:", bookUrl);
    const resp = await fetch(bookUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch EPUB: ${resp.status} ${resp.statusText}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    console.log("EPUB file size:", arrayBuffer.byteLength, "bytes");

    // EPUB = ZIP. if doesn't start with "PK", it's not a valid epub
    const sig = new Uint8Array(arrayBuffer.slice(0, 4));
    const isZip = sig[0] === 0x50 && sig[1] === 0x4B; // 'P' 'K'

    if (!isZip) {
      console.warn("Not a ZIP/EPUB. File signature:", Array.from(sig).map(b => b.toString(16)).join(' '));
      if (preview) {
        setStatus("EPUB not available. Loading HTML preview...");
        setTimeout(() => {
          window.location.href = `reader.html?type=html&url=${encodeURIComponent(decodeURIComponent(preview))}&title=${encodeURIComponent(decodeURIComponent(title))}`;
        }, 1000);
        return;
      }
      throw new Error("Not a valid EPUB file (invalid ZIP signature).");
    }

    // Initialize EPUB.js book
    const book = new ePub();
    await book.open(arrayBuffer);

    const rendition = book.renderTo("viewer", {
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: "none"
    });

    await rendition.display();
    setStatus("EPUB loaded successfully");

    prevBtn.onclick = () => {
      rendition.prev();
    };
    nextBtn.onclick = () => {
      rendition.next();
    };

    try {
      await book.locations.generate(1200);
      rendition.on("relocated", (location) => {
        const current = book.locations.locationFromCfi(location.start.cfi);
        const total = book.locations.total;
        if (current && total) setStatus(`Page ${current} / ${total}`);
      });
    } catch (locErr) {
      console.warn("Location generation failed:", locErr);
      setStatus("EPUB loaded (page numbers unavailable)");
    }
  } catch (err) {
    console.error("EPUB loading error:", err);

    if (preview) {
      setStatus("Unable to open EPUB. Loading HTML preview...");
      setTimeout(() => {
        window.location.href = `reader.html?type=html&url=${encodeURIComponent(decodeURIComponent(preview))}&title=${encodeURIComponent(decodeURIComponent(title))}`;
      }, 1000);
      return;
    }


  }
}

  async function initPdf() {
    showOnly("pdf");
    setStatus("Loading PDF…");

    try {
      const pdfjsLib = window["pdfjs-dist/build/pdf"];
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.js";

      const loadingTask = pdfjsLib.getDocument(bookUrl);
      const pdf = await loadingTask.promise;

      let pageNum = 1;

      async function renderPage(num) {
        const page = await pdf.getPage(num);
        const viewport = page.getViewport({ scale: 1.4 });

        const ctx = pdfCanvas.getContext("2d");
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport }).promise;
        setStatus(`Page ${pageNum} / ${pdf.numPages}`);
      }

      prevBtn.onclick = async () => {
        if (pageNum <= 1) return;
        pageNum--;
        await renderPage(pageNum);
      };

      nextBtn.onclick = async () => {
        if (pageNum >= pdf.numPages) return;
        pageNum++;
        await renderPage(pageNum);
      };

      await renderPage(pageNum);
    } catch (err) {
      console.warn("PDF blocked by CORS, opening directly.", err);
      openDirect(bookUrl);
    }
  }

  function initHtml() {
    showOnly("html");
    setStatus("Loading HTML...");

    let scrollPosition = 0;
    const scrollStep = 500;

    try {
      const htmlUrl = preview || bookUrl;
      htmlFrame.src = htmlUrl;
      
      prevBtn.onclick = () => {
        scrollPosition = Math.max(0, scrollPosition - scrollStep);
        try {
          htmlFrame.contentWindow.scrollTo(0, scrollPosition);
        } catch (e) {
          console.log('Cross-origin restriction, buttons disabled for external content');
          setStatus('Use browser scroll to navigate');
        }
      };

      nextBtn.onclick = () => {
        scrollPosition += scrollStep;
        try {
          htmlFrame.contentWindow.scrollTo(0, scrollPosition);
        } catch (e) {
          console.log('Cross-origin restriction, buttons disabled for external content');
          setStatus('Use browser scroll to navigate');
        }
      };
    } catch (err) {
      openDirect(preview || bookUrl);
    }
  }

  (async function start() {
    if (type === "epub") return await initEpub();
    if (type === "pdf") return await initPdf();
    return initHtml();
  })()
})();
