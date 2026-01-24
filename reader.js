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
    const resp = await fetch(bookUrl);
    if (!resp.ok) throw new Error(`Failed to fetch EPUB: ${resp.status}`);

    const arrayBuffer = await resp.arrayBuffer();

    // EPUB = ZIP. Se não começar com "PK", não é epub válido
    const sig = new Uint8Array(arrayBuffer.slice(0, 4));
    const isZip = sig[0] === 0x50 && sig[1] === 0x4B; // 'P' 'K'

    if (!isZip) {
      console.warn("Not a ZIP/EPUB. Probably HTML/blocked.");
      if (preview) {
        setStatus("Google Books não liberou o EPUB. Abrindo preview…");
        window.open(decodeURIComponent(preview), "_blank", "noopener,noreferrer");
        return;
      }
      throw new Error("Not a valid EPUB (not a zip).");
    }

    const book = ePub();
    await book.open(arrayBuffer, "binary");

    const rendition = book.renderTo("viewer", {
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: "none"
    });

    await rendition.display();

    prevBtn.onclick = () => rendition.prev();
    nextBtn.onclick = () => rendition.next();

    try {
      await book.locations.generate(1200);
      rendition.on("relocated", (location) => {
        const current = book.locations.locationFromCfi(location.start.cfi);
        const total = book.locations.total;
        if (current && total) setStatus(`Page ${current} / ${total}`);
      });
    } catch {
      setStatus("");
    }
  } catch (err) {
    console.warn("EPUB error:", err);

    if (preview) {
      setStatus("Não foi possível abrir EPUB. Abrindo preview…");
      window.open(decodeURIComponent(preview), "_blank", "noopener,noreferrer");
      return;
    }

    setStatus("Erro ao carregar EPUB. Veja o console.");
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
    setStatus("");

    prevBtn.style.display = "none";
    nextBtn.style.display = "none";

    try {
      htmlFrame.src = bookUrl;
    } catch (err) {
      openDirect(bookUrl);
    }
  }

  (async function start() {
    if (type === "epub") return await initEpub();
    if (type === "pdf") return await initPdf();
    return initHtml();
  })()
})();
