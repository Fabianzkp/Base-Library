 // Check if user is logged in and update UI accordingly
      document.addEventListener("DOMContentLoaded", () => {
        const user = localStorage.getItem("user");

        if (user) {
          document.getElementById("username").textContent = JSON.parse(user).data.username;
          document.getElementById("visitorLinks").style.display = "none";
          document.getElementById("userLinks").style.display = "block";

          //wrap all divs with class "book-title" in a link to the book page
         // const bookCards = document.querySelectorAll(".book-card");
         // console.log("Book cards found:", bookCards); // Debugging log
        
        } else {
          document.getElementById("visitorLinks").style.display = "block";
          document.getElementById("userLinks").style.display = "none";
        }
      });