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
          alert("Login successful!");
          window.location.href = "/";
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
