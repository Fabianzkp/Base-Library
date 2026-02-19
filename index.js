 // Check if user is logged in and update UI accordingly
      document.addEventListener("DOMContentLoaded", () => {
        const user = localStorage.getItem("user");

        if (user) {
          document.getElementById("username").textContent = JSON.parse(user).data.username;
          document.getElementById("visitorLinks").style.display = "none";
          document.getElementById("userLinks").style.display = "block";

          // Session timeout: 30 minutes of inactivity
          let timeout;
          const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes

          function resetTimeout() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              localStorage.removeItem("user");
              alert("Session expired due to inactivity. Please login again.");
              window.location.href = "/auth/sign-in";
            }, TIMEOUT_DURATION);
          }

          // Track user activity
          ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimeout, true);
          });

          resetTimeout(); // Start timeout

          //wrap all divs with class "book-title" in a link to the book page
         // const bookCards = document.querySelectorAll(".book-card");
         // console.log("Book cards found:", bookCards); // Debugging log
        
        } else {
          document.getElementById("visitorLinks").style.display = "block";
          document.getElementById("userLinks").style.display = "none";
        }
      });