class BaseLibrary {
  constructor() {
    this.favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    this.currentTheme = localStorage.getItem("theme") || "light";
    this.searchTimeout = null;
    this.currentView = "main";
    this.lastScrollY = 0;

    this.initializeElements();
    this.setupEventListeners();
    this.setupScrollBehavior();
    this.applyTheme();
    this.performInitialSearch();
  }

  initializeElements() {
    this.searchInput = document.getElementById("searchInput");
    this.categoryFilter = document.getElementById("categoryFilter");
    this.bookGrid = document.getElementById("bookGrid");
    this.favoritesGrid = document.getElementById("favoritesGrid");
    this.favoritesBtn = document.getElementById("favoritesBtn");
    this.continueReadingBtn = document.getElementById("continueReadingBtn");
    this.backToMainBtn = document.getElementById("backToMain");
    this.themeSelector = document.getElementById("themeSelector");
    this.mainView = document.getElementById("mainView");
    this.favoritesView = document.getElementById("favoritesView");

    this.themeSelector.value = this.currentTheme;
    this.updateContinueReadingButton();
  }

  setupEventListeners() {
    // Real-time search
    this.searchInput.addEventListener("input", () => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.searchBooks();
      }, 300);
    });

    this.categoryFilter.addEventListener("change", () => this.searchBooks());
    this.favoritesBtn.addEventListener("click", () => this.showFavorites());
    this.continueReadingBtn.addEventListener("click", () => this.continueReading());
    this.backToMainBtn.addEventListener("click", () => this.showMain());
    this.themeSelector.addEventListener("change", (e) =>
      this.changeTheme(e.target.value),
    );
  }

  setupScrollBehavior() {
    let ticking = false;
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
            // Scrolling down & past threshold
            header.classList.add('hidden');
          } else {
            // Scrolling up
            header.classList.remove('hidden');
          }
          
          this.lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  async fetchBooks(query = "", category = "all") {
    const [gutenbergBooks, googleBooks] = await Promise.all([
      this.fetchGutenbergBooks(query, category),
      this.fetchGoogleBooks(query, category),
    ]);

    return [...gutenbergBooks, ...googleBooks];
  }

  async fetchGutenbergBooks(query, category) {
    try {
      let apiUrl = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;

      if (category === "fiction") {
        apiUrl += "&topic=fiction";
      } else if (category === "non-fiction") {
        apiUrl += "&topic=nonfiction";
      }

      const response = await fetch(apiUrl);
      const data = await response.json();
      return (data.results || []).map((book) => ({
        ...book,
        source: "gutenberg",
        uniqueId: `gutenberg-${book.id}`,
      }));
    } catch (error) {
      console.error("Error fetching Gutenberg books:", error);
      return [];
    }
  }

  async fetchGoogleBooks(query, category) {
    try {
      let searchQuery = query;
      if (category === "fiction") {
        searchQuery += "+subject:fiction";
      } else if (category === "non-fiction") {
        searchQuery += "+subject:nonfiction";
      }

      const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=5&filter=free-ebooks`;

      const response = await fetch(apiUrl);
      const data = await response.json();
      return (data.items || []).map((item) => {
        const book = item.volumeInfo;
        return {
          id: item.id,
          title: book.title || "Unknown Title",
          authors: book.authors
            ? book.authors.map((name) => ({ name }))
            : [{ name: "Unknown Author" }],
          formats: {
            "image/jpeg":
              book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail,
            "text/html": book.previewLink,
            "application/pdf": item.accessInfo?.pdf?.downloadLink,
            "application/epub+zip": item.accessInfo?.epub?.downloadLink,
          },
          source: "google",
          uniqueId: `google-${item.id}`,
        };
      });
    } catch (error) {
      console.error("Error fetching Google Books:", error);
      return [];
    }
  }

  async searchBooks() {
    const query = this.searchInput.value.trim() || "popular";
    const category = this.categoryFilter.value;

    const books = await this.fetchBooks(query, category);
    this.displayBooks(books, this.bookGrid);
  }

  async performInitialSearch() {
    const books = await this.fetchBooks("popular");
    this.displayBooks(books, this.bookGrid);
  }

  displayBooks(books, container) {
    if (books.length === 0) {
      container.innerHTML = '<div class="no-results">No books found</div>';
      return;
    }

    container.innerHTML = books
      .map((book) => this.createBookCard(book))
      .join("");
    this.attachBookEventListeners(container);
  }

  createBookCard(book) {
    const bookId = book.uniqueId || book.id;
    const isFavorited = this.favorites.some((fav) => fav.id === bookId);
    const coverUrl =
      book.formats["image/jpeg"] ||
      "https://via.placeholder.com/200x300?text=No+Cover";
    const authors =
      book.authors?.map((author) => author.name).join(", ") || "Unknown Author";
    const sourceLabel =
      {
        gutenberg: "Gutenberg",
        google: "Google Books",
      }[book.source] || book.source;

    return `
            <div class="book-card" data-book-id="${bookId}" data-book='${JSON.stringify(book).replace(/'/g, "&apos;")}'>
                <div class="source-badge">${sourceLabel}</div>
                <img src="${coverUrl}" alt="${book.title}" class="book-cover" 
                     onerror="this.src='https://via.placeholder.com/200x300?text=No+Cover'">
                <div class="book-title">${book.title}</div>
                <div class="book-author">by ${authors}</div>
                <div class="book-actions">
                    <button class="read-btn" onclick="library.readBook('${bookId}')">Read</button>
                    <button class="download-btn" onclick="library.downloadBook('${bookId}')">Download</button>
                    <button class="favorite-btn ${isFavorited ? "favorited" : ""}" 
                            onclick="library.toggleFavorite('${bookId}')">
                        ${isFavorited ? "★" : "☆"}
                    </button>
                </div>
            </div>
        `;
  }

  attachBookEventListeners(container) {
    // Event listeners are handled via onclick attributes in createBookCard
  }

  toggleFavorite(bookId) {
    const bookCard = document.querySelector(`[data-book-id="${bookId}"]`);
    const bookData = this.extractBookData(bookCard, bookId);

    const existingIndex = this.favorites.findIndex((fav) => fav.id === bookId);

    if (existingIndex > -1) {
      this.favorites.splice(existingIndex, 1);
    } else {
      this.favorites.push(bookData);
    }

    localStorage.setItem("favorites", JSON.stringify(this.favorites));

    // Update UI
    const favoriteBtn = bookCard.querySelector(".favorite-btn");
    const isFavorited = existingIndex === -1;
    favoriteBtn.textContent = isFavorited ? "★" : "☆";
    favoriteBtn.classList.toggle("favorited", isFavorited);

    // Refresh favorites view if currently viewing
    if (this.currentView === "favorites") {
      this.displayFavorites();
    }
  }

  extractBookData(bookCard, bookId) {
    const fullBook = JSON.parse(bookCard.getAttribute("data-book"));
    return {
      ...fullBook,
      id: bookId,
      uniqueId: bookId,
    };
  }

  async readBook(bookId) {
    try {
      const bookCard = document.querySelector(`[data-book-id="${bookId}"]`);
      if (!bookCard) return alert("Book not found.");

      const book = JSON.parse(bookCard.getAttribute("data-book"));

      const epubUrl = book.formats?.["application/epub+zip"];
      const pdfUrl = book.formats?.["application/pdf"];
      const htmlUrl = book.formats?.["text/html"] || book.formats?.["text/plain"];

      // For Gutenberg books, try multiple EPUB URLs
      let actualEpubUrl = epubUrl;
      if (book.source === "gutenberg" && book.id) {
        // Try the original format first, then fallback
        actualEpubUrl = epubUrl || `https://www.gutenberg.org/ebooks/${book.id}.epub.noimages`;
      }

      let type = "";
      let chosenUrl = "";

      if (actualEpubUrl) {
        type = "epub";
        chosenUrl = actualEpubUrl;
      } else if (pdfUrl) {
        type = "pdf";
        chosenUrl = pdfUrl;
      } else if (htmlUrl) {
        type = "html";
        chosenUrl = htmlUrl;
      }

      if (!chosenUrl) return alert("Online reading not available.");

      // Force https when possible
      if (chosenUrl.startsWith("http://")) {
        chosenUrl = chosenUrl.replace("http://", "https://");
      }

      // Always use proxy for EPUB and PDF files to avoid CORS issues
      const needsProxy = (type === "epub" || type === "pdf") && 
        !chosenUrl.startsWith(location.origin);

      if (needsProxy) {
        console.log("Using proxy for:", chosenUrl);
        chosenUrl = `${location.origin}/proxy?url=${encodeURIComponent(chosenUrl)}`;
      }

      const readerUrl =
        `reader.html?type=${encodeURIComponent(type)}` +
        `&url=${encodeURIComponent(chosenUrl)}` +
        `&title=${encodeURIComponent(book.title || "Book")}` +
        `&source=${encodeURIComponent(book.source || "")}` +
        `&preview=${encodeURIComponent(book.formats?.["text/html"] || "")}`;

      window.open(
        readerUrl,
        "_blank",
        "noopener,noreferrer,width=1100,height=800",
      );
      
      // Save reading progress
      this.saveReadingProgress({
        bookId: bookId,
        book: book,
        type: type,
        url: chosenUrl,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error(e);
      alert("Error opening reader.");
    }
  }

  saveReadingProgress(progress) {
    localStorage.setItem("currentReading", JSON.stringify(progress));
    this.updateContinueReadingButton();
  }

  updateContinueReadingButton() {
    const currentReading = localStorage.getItem("currentReading");
    if (currentReading && this.continueReadingBtn) {
      this.continueReadingBtn.style.display = "block";
    } else if (this.continueReadingBtn) {
      this.continueReadingBtn.style.display = "none";
    }
  }

  continueReading() {
    const currentReading = JSON.parse(localStorage.getItem("currentReading"));
    if (!currentReading) {
      alert("No book to continue reading.");
      return;
    }

    const readerUrl =
      `reader.html?type=${encodeURIComponent(currentReading.type)}` +
      `&url=${encodeURIComponent(currentReading.url)}` +
      `&title=${encodeURIComponent(currentReading.book.title || "Book")}` +
      `&source=${encodeURIComponent(currentReading.book.source || "")}` +
      `&preview=${encodeURIComponent(currentReading.book.formats?.["text/html"] || "")}` +
      `&position=${encodeURIComponent(currentReading.position || "")}`;

    window.open(
      readerUrl,
      "_blank",
      "noopener,noreferrer,width=1100,height=800",
    );
  }

  async downloadBook(bookId) {
    try {
      const bookCard = document.querySelector(`[data-book-id="${bookId}"]`);
      const book = JSON.parse(bookCard.getAttribute("data-book"));

      const downloadUrl =
        book.formats["application/epub+zip"] ||
        book.formats["application/pdf"] ||
        book.formats["text/plain"];

      if (downloadUrl) {
        const link = document.createElement("a");
        link.href = downloadUrl;
        const extension = downloadUrl.includes("epub")
          ? "epub"
          : downloadUrl.includes("pdf")
            ? "pdf"
            : "txt";
        link.download = `${book.title.replace(/[^a-z0-9]/gi, "_")}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Download not available for this book.");
      }
    } catch (error) {
      alert("Error downloading book.");
    }
  }

  showFavorites() {
    this.currentView = "favorites";
    this.mainView.classList.remove("active");
    this.favoritesView.classList.add("active");
    this.displayFavorites();
  }

  showMain() {
    this.currentView = "main";
    this.favoritesView.classList.remove("active");
    this.mainView.classList.add("active");
  }

  displayFavorites() {
    if (this.favorites.length === 0) {
      this.favoritesGrid.innerHTML =
        '<div class="no-results">No favorite books yet</div>';
      return;
    }

    this.favoritesGrid.innerHTML = this.favorites
      .map(
        (book) => `
            <div class="book-card" data-book-id="${book.id}"
                data-book='${JSON.stringify(book).replace(/'/g, "&apos;")}'>
                <img src="${(book.formats && book.formats["image/jpeg"]) || book.cover}" alt="${book.title}" class="book-cover">
                <div class="book-title">${book.title}</div>
                <div class="book-author">by ${(book.authors || []).map((a) => a.name).join(", ") || "Unknown Author"}</div>
                <div class="book-actions">
                <button class="read-btn" onclick="library.readBook('${book.id}')">Read</button>
                <button class="download-btn" onclick="library.downloadBook('${book.id}')">Download</button>
                <button class="favorite-btn favorited" onclick="library.toggleFavorite('${book.id}')">★</button>
                </div>
            </div>
            `,
      )
      .join("");
  }

  changeTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem("theme", theme);
    this.applyTheme();
  }

  applyTheme() {
    document.body.setAttribute("data-theme", this.currentTheme);
  }
}

// Initialize the library when DOM is loaded
let library;
document.addEventListener("DOMContentLoaded", () => {
  library = new BaseLibrary();
});
