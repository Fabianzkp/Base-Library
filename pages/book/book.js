let bookUrl = window.location.pathname.split("/").pop();
let stars

document.addEventListener("DOMContentLoaded", () => {
  //const bookUrl = window.location.pathname.split("/").pop();
  const bookApi = bookUrl.split("-")[0];
  const bookId = bookUrl.split("-")[1];
  let api;
  stars = document.querySelectorAll(".star");

  let selectedRating = 0;

  if (bookApi == "gutenberg"){
     api = `https://gutendex.com/books/${bookId}`;
     source = "gutenberg";
  }
  else if (bookApi == "google") {
    api = `https://www.googleapis.com/books/v1/volumes/${bookId}`;
    source = "google";
  }
  else {
    console.error("Invalid book URL format:", bookUrl);
    alert("Invalid book URL.");
    return;
  }

  fetch(`${api}`)
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        displayBookDetails(data, source);

        const user = localStorage.getItem("user");
        //console.log("User from localStorage:", user); // Debugging log
        const parsedUser = user ? JSON.parse(user) : null;
        //console.log("Parsed user:", parsedUser); // Debugging log

        const userIsLoggedIn = user ? true : false;

        const form = document.getElementById("review-form");
        const commentInput = document.getElementById("comment");
        const msg = document.getElementById("login-msg");

        if (userIsLoggedIn) {
          form.style.display = "block";
          fetch(`/book/rating/${bookUrl}/view`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${parsedUser.token}`
            }
          })
            .then((response) => response.json())
            .then((data) => {
              if (data && data.rating !== undefined) {
                selectedRating = data.rating;
                updateStarColors(selectedRating);
                if (data.comment) {
                  commentInput.value = data.comment;
                }
              }
            })
            .catch((error) => {
              console.error("Error fetching rating:", error);
            });
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

function displayBookDetails(book,source) {

    const stars = document.querySelectorAll(".star");

    if (source === "google") {
      book = {
        title: book.volumeInfo.title,
        authors: book.volumeInfo.authors ? book.volumeInfo.authors.map((name) => ({ name })) : [],
        summaries: book.volumeInfo.description,
        formats: {
          "image/jpeg": book.volumeInfo.imageLinks ? book.volumeInfo.imageLinks.thumbnail : null
        },
        source: "google"
      };
    }
    else if (source === "gutenberg") {
      book = {
        title: book.title,
        authors: book.authors ? book.authors.map((author) => ({ name: author.name })) : [],
        summaries: book.summaries ? book.summaries[0] : null,
        formats: {
          "image/jpeg": book.formats["image/jpeg"] || null
        },
        source: "gutenberg"
      };
    }

      //console.log("Fetched book data:", book); // Debugging log

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

     // console.log(`Calificación seleccionada: ${selectedRating}`);
    });
  });

  

  document.querySelector(".submit-btn").addEventListener("click", function () {
    const form = document.getElementById("review-form");
    const formData = new FormData(form);
    const comment = document.getElementById("comment").value;
    const token = JSON.parse(localStorage.getItem("user")).token;

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
          
        } else {
          console.error("Error during Rating registration:", data.error || data.message);
          if (data.error.message === "jwt expired") {
            alert("Su sesión ha expirado. Por favor, inicie sesión nuevamente.");
            localStorage.removeItem("user");
            window.location.href = "/auth/sign-in"; 
          } else {
            alert("An error occurred: " + data.error.message);
          }
        }
      })
      .catch((error) => {
        console.error("Error during Rating registration:", error);
        alert("An error occurred during Rating registration.");
      });
  });
}


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