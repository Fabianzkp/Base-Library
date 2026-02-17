 // Check if user is logged in and update UI accordingly
      document.addEventListener("DOMContentLoaded", () => {
        const user = localStorage.getItem("user");

        if (user) {
          document.getElementById("username").textContent = JSON.parse(user).data.username;
          document.getElementById("visitorLinks").style.display = "none";
          document.getElementById("userLinks").style.display = "block";

          //wrap all divs with class "book-title" in a link to the book page
          const bookCards = document.querySelectorAll(".book-card");
          console.log("Book cards found:", bookCards); // Debugging log
         /*  bookCards.forEach(bookCard => {
            const bookId = bookCard.dataset.bookId.split("-")[1]; // Extract the number from the string
            const bookTitle = bookCard.querySelector(".book-title");
            bookCard.innerHtml= `<a href="/book/${bookId}">${bookTitle.innerHTML}</a>`;
          }); */
        } else {
          document.getElementById("visitorLinks").style.display = "block";
          document.getElementById("userLinks").style.display = "none";
        }
      });