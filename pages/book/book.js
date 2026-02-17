let bookUrl = window.location.pathname.split("/").pop();

document.addEventListener("DOMContentLoaded", () => {
  //const bookUrl = window.location.pathname.split("/").pop();
  const bookApi = bookUrl.split("-")[0];
  const bookId = bookUrl.split("-")[1];
  let api;

  let selectedRating = 0;



  if (bookApi == "gutenberg") api = `https://gutendex.com/books/${bookId}`;
  else if (bookApi == "google") api = `/api/books/google/${bookId}`;
  else {
    console.error("Invalid book URL format:", bookUrl);
    alert("Invalid book URL.");
    return;
  }

  fetch(`${api}`)
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        displayBookDetails(data);

        const user = localStorage.getItem("user");

        const userIsLoggedIn = user ? true : false;

        const form = document.getElementById("review-form");
        const msg = document.getElementById("login-msg");

        if (userIsLoggedIn) {
          form.style.display = "block";
        } else {
          msg.style.display = "block";
        }
      } else {
        console.error("Book not found:", data);
        alert("Book not found.");
      }
    })
    .catch((error) => {
      console.error("Error fetching book details:", error);
      alert("An error occurred while fetching book details.");
    });
});

function displayBookDetails(book) {
  //console.log("Fetched book data:", book); // Debugging log

    const stars = document.querySelectorAll(".star");

  document.title = `${book.title} - Base Library`;
  const container = document.getElementById("bookDetails");
  if (!container) {
    console.error("Book details container not found");
    return;
  }

  const sourceLabel =
    {
      gutenberg: "Gutenberg",
      google: "Google Books",
    }[book.source] || book.source;

  const coverUrl =
    book.formats["image/jpeg"] ||
    "https://via.placeholder.com/200x300?text=No+Cover";

  //const authors = book.authors ? book.authors.join(", ") : "Unknown Author";
  const authors =
    book.authors?.map((author) => author.name).join(", ") || "Unknown Author";

  container.innerHTML = `
    <div class="book-card">
      <div class="source-badge">${sourceLabel}</div>
      <img src="${coverUrl}" alt="${book.title}" class="book-detail-cover"
            onerror="this.src='https://via.placeholder.com/200x300?text=No+Cover'">
      <div class="book-detail-info">
        <h2 class="book-detail-title">${book.title}</h2>
        <p class="book-detail-author">by ${authors}</p> 
        <p class="book-detail-description">${book.summaries || "No description available."}</p>
      </div>
    </div>
   
  `;

  
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      // Obtenemos el valor numérico del atributo data-value
      selectedRating = parseInt(star.getAttribute("data-value"));

      // Ejecutamos la función para refrescar los colores
      updateStarColors(selectedRating);

      console.log(`Calificación seleccionada: ${selectedRating}`);
    });
  });

  /**
   * Función que recorre las estrellas y les añade o quita
   * la clase 'selected' (amarillo) según la calificación.
   */
  function updateStarColors(rating) {
    stars.forEach((star) => {
      const starValue = parseInt(star.getAttribute("data-value"));

      if (starValue <= rating) {
        star.classList.add("selected"); // Se pone amarilla
      } else {
        star.classList.remove("selected"); // Se queda gris
      }
    });
  }

  document.querySelector(".submit-btn").addEventListener("click", function () {
    const form = document.getElementById("review-form");
    const formData = new FormData(form);
    const comment = document.getElementById("comment").value;
    const token = JSON.parse(localStorage.getItem("user")).token;

    /* console.log("Submitting review with data:", {
      rating: selectedRating,
      comment,
      token,
      bookUrl
    });  */// Debugging log

    fetch(`/book/rating/${bookUrl}`, {
      method: "POST",
      body: JSON.stringify({
        rating: selectedRating,
        comment,
        bookId: bookUrl
      }),
      headers: {
        "Content-Type": "application/json",
        "Authorization":`Bearer ${token}`
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Rating registered successfully") {
          alert("Rating registered successfully!");
          //window.location.href = "/auth/sign-in";
        } else {
          console.error("Registration failed:", data);
          alert("Registration failed: " + data.message);
        }
      })
      .catch((error) => {
        console.error("Error during registration:", error);
        alert("An error occurred during registration.");
      });
  });
}
