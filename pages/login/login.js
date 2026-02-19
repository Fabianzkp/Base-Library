document
  .querySelector(".submit-btn")
  .addEventListener("click", function () {
    const form = document.getElementById("loginForm");
    const formData = new FormData(form);

    fetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "User logged in successfully") {
          localStorage.setItem("user", JSON.stringify({
            data: data.user,
            token: data.token,
          }));
          // Show success message briefly then redirect
          const message = document.createElement('div');
          message.textContent = 'Login successful! Redirecting...';
          message.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#4CAF50;color:white;padding:15px 30px;border-radius:5px;z-index:9999;font-size:16px;';
          document.body.appendChild(message);
          setTimeout(() => window.location.href = "/", 1000);
        } else {
          console.error("Login failed:", data);
          alert("Login failed: " + data.message);
        }
      })
      .catch((error) => {
        console.error("Error during login:", error);
        alert("An error occurred during login.");
      });
  });
