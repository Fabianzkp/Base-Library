document
  .querySelector(".submit-btn")
  .addEventListener("click", function () {
    const form = document.getElementById("loginForm");
    const formData = new FormData(form);

    fetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        username: formData.get("username"),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "User registered successfully") {
          alert("Registration successful!");
          window.location.href = "/auth/sign-in";
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

document.getElementById("togglePassword").addEventListener("click", function() {
  const passwordInput = document.getElementById("password");
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
  this.textContent = type === "password" ? "👁️" : "🙈";
});
