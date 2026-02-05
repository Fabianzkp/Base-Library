(function () {
  const params = new URLSearchParams(window.location.search);

  const rawUrl = params.get("url");
  const type = params.get("type"); // epub | pdf | html
  const title = params.get("title") || "Reader";
  const preview = params.get("preview"); // link HTML (Google Books) if exist
  const position = params.get("position"); // saved reading position

  // Theme sync with main app
  const THEME_KEY = "theme";

  const titleEl = document.getElementById("title");
  const pageInfoEl = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const themeSelector = document.getElementById("themeSelector");

  const viewer = document.getElementById("viewer");
  const pdfCanvas = document.getElementById("pdfCanvas");
  const htmlFrame = document.getElementById("htmlFrame");

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme || "light");
  }

  function setStatus(text) {
    pageInfoEl.textContent = text || "";
  }

  function openDirect(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function showOnly(which) {
    viewer.classList.add("hidden");
    pdfCanvas.classList.add("hidden");
    htmlFrame.classList.add("hidden");

    // por padrão mostra botões (html vai esconder depois)
    prevBtn.style.display = "";
    nextBtn.style.display = "";

    if (which === "epub") viewer.classList.remove("hidden");
    if (which === "pdf") pdfCanvas.classList.remove("hidden");
    if (which === "html") htmlFrame.classList.remove("hidden");
  }

  // =========================
  // THEME: state + listener
  // =========================
  let currentTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(currentTheme);

  if (themeSelector) {
    themeSelector.value = currentTheme;

    themeSelector.addEventListener("change", () => {
      currentTheme = themeSelector.value || "light";
      localStorage.setItem(THEME_KEY, currentTheme);

      // 1) aplica no layout do reader (body/header etc via CSS)
      applyTheme(currentTheme);

      // 2) aplica no EPUB (se estiver aberto)
      applyEpubTheme(window.__epubRendition, currentTheme);

      // 3) tenta aplicar no iframe (só funciona same-origin)
      tryApplyIframeTheme(currentTheme);
      
      // 4) aplica tema no container do iframe como fallback
      if (type === 'html') {
        applyIframeContainerTheme(currentTheme);
      }
    });
  }

  // =========================
  // EPUB helpers
  // =========================
  function registerEpubThemes(rendition) {
    rendition.themes.register("light", {
      body: { background: "#ffffff", color: "#111111" }
    });

    rendition.themes.register("sepia", {
      body: { background: "#f4ecd8", color: "#2b2217" }
    });

    rendition.themes.register("dark", {
      body: { background: "#0f1115", color: "#e8e8e8" }
    });
  }

  function applyEpubTheme(rendition, theme) {
    if (!rendition) return;
    rendition.themes.select(theme || "light");
  }

  // HTML iframe theme helper (somente same-origin)
  function tryApplyIframeTheme(theme) {
    try {
      const doc = htmlFrame.contentDocument || htmlFrame.contentWindow.document;
      if (!doc || !doc.body) return;

      doc.body.setAttribute("data-theme", theme);

      let style = doc.getElementById("readerThemeStyle");
      if (!style) {
        style = doc.createElement("style");
        style.id = "readerThemeStyle";
        doc.head.appendChild(style);
      }

      style.textContent = `
        body[data-theme="dark"] { background:#0f1115 !important; color:#e8e8e8 !important; }
        body[data-theme="sepia"] { background:#f4ecd8 !important; color:#2b2217 !important; }
        body[data-theme="light"] { background:#ffffff !important; color:#111111 !important; }
      `;
    } catch (e) {
      // cross-origin: não dá pra acessar o conteúdo do iframe
    }
  }

  // =========================
  // Validate params
  // =========================
  if (!rawUrl || !type) {
    titleEl.textContent = "Invalid reader link";
    setStatus("Missing url or type.");
    return;
  }

  let bookUrl = decodeURIComponent(rawUrl);

  // se vier path relativo tipo "/proxy?..."
  if (bookUrl.startsWith("/")) {
    bookUrl = new URL(bookUrl, window.location.origin).toString();
  }

  titleEl.textContent = decodeURIComponent(title);

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "ArrowRight") nextBtn.click();
  });

  // =========================
  // EPUB
  // =========================
  async function initEpub() {
    showOnly("epub");
    setStatus("Loading EPUB…");

    try {
      const resp = await fetch(bookUrl);
      if (!resp.ok) throw new Error(`Failed to fetch EPUB: ${resp.status}`);

      const arrayBuffer = await resp.arrayBuffer();

      // EPUB = ZIP. if doesn't start with "PK", it's not a valid epub
      const sig = new Uint8Array(arrayBuffer.slice(0, 4));
      const isZip = sig[0] === 0x50 && sig[1] === 0x4B; // 'P' 'K'

      if (!isZip) {
        console.warn("Not a ZIP/EPUB. Probably HTML/blocked.");
        if (preview) {
          setStatus("EPUB not available. Loading HTML preview...");
          setTimeout(() => {
            window.location.href = `reader.html?type=html&url=${encodeURIComponent(decodeURIComponent(preview))}&title=${encodeURIComponent(decodeURIComponent(title))}`;
          }, 1000);
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

    
      window.__epubRendition = rendition;

      registerEpubThemes(rendition);
      applyEpubTheme(rendition, currentTheme);

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
        setStatus("Unable to open EPUB. Loading HTML preview...");
        setTimeout(() => {
          window.location.href = `reader.html?type=html&url=${encodeURIComponent(decodeURIComponent(preview))}&title=${encodeURIComponent(decodeURIComponent(title))}`;
        }, 1000);
        return;
      }

      setStatus("Error loading EPUB.");
    }
  }

  // =========================
  // PDF
  // =========================
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

  // =========================
  // HTML
  // =========================
  function initHtml() {
    showOnly("html");
    setStatus("Loading HTML...");

    let scrollPosition = 0;
    const scrollStep = 500;

    try {
      htmlFrame.src = bookUrl;
      htmlFrame.onload = () => {
        tryApplyIframeTheme(currentTheme);
        // Apply theme to iframe container as fallback
        applyIframeContainerTheme(currentTheme);
      };
      
      // Apply initial theme to container
      applyIframeContainerTheme(currentTheme);
    } catch (err) {
      openDirect(preview || bookUrl);
    }
  }

  // Apply theme to iframe container when content can't be accessed
  function applyIframeContainerTheme(theme) {
    const themes = {
      light: { background: '#ffffff', filter: 'none' },
      sepia: { background: '#f4ecd8', filter: 'sepia(0.3) contrast(0.9)' },
      dark: { background: '#0f1115', filter: 'invert(0.9) hue-rotate(180deg) contrast(0.8)' }
    };
    
    const themeStyle = themes[theme] || themes.light;
    htmlFrame.style.background = themeStyle.background;
    htmlFrame.style.filter = themeStyle.filter;
  }

  // =========================
  // Start
  // =========================
  (async function start() {
    if (type === "epub") return await initEpub();
    if (type === "pdf") return await initPdf();
    return initHtml();
  })();
})();
