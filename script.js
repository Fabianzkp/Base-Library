class BaseLibrary {
    constructor() {
        this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.searchTimeout = null;
        this.currentView = 'main';
        
        this.initializeElements();
        this.setupEventListeners();
        this.applyTheme();
        this.performInitialSearch();
    }

    initializeElements() {
        this.searchInput = document.getElementById('searchInput');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.bookGrid = document.getElementById('bookGrid');
        this.favoritesGrid = document.getElementById('favoritesGrid');
        this.favoritesBtn = document.getElementById('favoritesBtn');
        this.backToMainBtn = document.getElementById('backToMain');
        this.themeSelector = document.getElementById('themeSelector');
        this.mainView = document.getElementById('mainView');
        this.favoritesView = document.getElementById('favoritesView');
        
        this.themeSelector.value = this.currentTheme;
    }

    setupEventListeners() {
        // Real-time search
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchBooks();
            }, 300);
        });

        this.categoryFilter.addEventListener('change', () => this.searchBooks());
        this.favoritesBtn.addEventListener('click', () => this.showFavorites());
        this.backToMainBtn.addEventListener('click', () => this.showMain());
        this.themeSelector.addEventListener('change', (e) => this.changeTheme(e.target.value));
    }

    async fetchBooks(query = '', category = 'all') {
        try {
            let apiUrl = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
            
            if (category === 'fiction') {
                apiUrl += '&topic=fiction';
            } else if (category === 'non-fiction') {
                apiUrl += '&topic=nonfiction';
            }

            const response = await fetch(apiUrl);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Error fetching books:', error);
            return [];
        }
    }

    async searchBooks() {
        const query = this.searchInput.value.trim() || 'popular';
        const category = this.categoryFilter.value;
        
        const books = await this.fetchBooks(query, category);
        this.displayBooks(books, this.bookGrid);
    }

    async performInitialSearch() {
        const books = await this.fetchBooks();
        this.displayBooks(books, this.bookGrid);
    }

    displayBooks(books, container) {
        if (books.length === 0) {
            container.innerHTML = '<div class="no-results">No books found</div>';
            return;
        }

        container.innerHTML = books.map(book => this.createBookCard(book)).join('');
        this.attachBookEventListeners(container);
    }

    createBookCard(book) {
        const bookId = book.id;
        const isFavorited = this.favorites.some(fav => fav.id === bookId);
        const coverUrl = book.formats['image/jpeg'] || 'https://via.placeholder.com/200x300?text=No+Cover';
        const authors = book.authors.map(author => author.name).join(', ') || 'Unknown Author';

        return `
            <div class="book-card" data-book-id="${bookId}">
                <img src="${coverUrl}" alt="${book.title}" class="book-cover" 
                     onerror="this.src='https://via.placeholder.com/200x300?text=No+Cover'">
                <div class="book-title">${book.title}</div>
                <div class="book-author">by ${authors}</div>
                <div class="book-actions">
                    <button class="read-btn" onclick="library.readBook(${bookId})">Read</button>
                    <button class="download-btn" onclick="library.downloadBook(${bookId})">Download</button>
                    <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" 
                            onclick="library.toggleFavorite(${bookId})">
                        ${isFavorited ? '★' : '☆'}
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
        
        const existingIndex = this.favorites.findIndex(fav => fav.id === bookId);
        
        if (existingIndex > -1) {
            this.favorites.splice(existingIndex, 1);
        } else {
            this.favorites.push(bookData);
        }
        
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        
        // Update UI
        const favoriteBtn = bookCard.querySelector('.favorite-btn');
        const isFavorited = existingIndex === -1;
        favoriteBtn.textContent = isFavorited ? '★' : '☆';
        favoriteBtn.classList.toggle('favorited', isFavorited);
        
        // Refresh favorites view if currently viewing
        if (this.currentView === 'favorites') {
            this.displayFavorites();
        }
    }

    extractBookData(bookCard, bookId) {
        return {
            id: bookId,
            title: bookCard.querySelector('.book-title').textContent,
            author: bookCard.querySelector('.book-author').textContent,
            cover: bookCard.querySelector('.book-cover').src
        };
    }

    async readBook(bookId) {
        try {
            const response = await fetch(`https://gutendex.com/books/${bookId}`);
            const book = await response.json();
            
            const htmlUrl = book.formats['text/html'] || book.formats['text/plain'];
            if (htmlUrl) {
                window.open(htmlUrl, '_blank');
            } else {
                alert('Online reading not available for this book.');
            }
        } catch (error) {
            alert('Error loading book for reading.');
        }
    }

    async downloadBook(bookId) {
        try {
            const response = await fetch(`https://gutendex.com/books/${bookId}`);
            const book = await response.json();
            
            const downloadUrl = book.formats['application/epub+zip'] || 
                              book.formats['application/pdf'] || 
                              book.formats['text/plain'];
            
            if (downloadUrl) {
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `${book.title}.${downloadUrl.includes('epub') ? 'epub' : downloadUrl.includes('pdf') ? 'pdf' : 'txt'}`;
                link.click();
            } else {
                alert('Download not available for this book.');
            }
        } catch (error) {
            alert('Error downloading book.');
        }
    }

    showFavorites() {
        this.currentView = 'favorites';
        this.mainView.classList.remove('active');
        this.favoritesView.classList.add('active');
        this.displayFavorites();
    }

    showMain() {
        this.currentView = 'main';
        this.favoritesView.classList.remove('active');
        this.mainView.classList.add('active');
    }

    displayFavorites() {
        if (this.favorites.length === 0) {
            this.favoritesGrid.innerHTML = '<div class="no-results">No favorite books yet</div>';
            return;
        }

        this.favoritesGrid.innerHTML = this.favorites.map(book => `
            <div class="book-card" data-book-id="${book.id}">
                <img src="${book.cover}" alt="${book.title}" class="book-cover">
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
                <div class="book-actions">
                    <button class="read-btn" onclick="library.readBook(${book.id})">Read</button>
                    <button class="download-btn" onclick="library.downloadBook(${book.id})">Download</button>
                    <button class="favorite-btn favorited" onclick="library.toggleFavorite(${book.id})">★</button>
                </div>
            </div>
        `).join('');
    }

    changeTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
    }
}

// Initialize the library when DOM is loaded
let library;
document.addEventListener('DOMContentLoaded', () => {
    library = new BaseLibrary();
});