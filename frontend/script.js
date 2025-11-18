const API = "http://localhost:5000/api";
let token = localStorage.getItem("token") || null;

function setMeUI(user) {
  const me = document.getElementById("me");
  me.textContent = user ? `Logged in as ${user.email}` : "Not logged in";
}

async function fetchProducts() {
  const res = await fetch(`${API}/products`);
  const data = await res.json();
  const list = document.getElementById("list");
  list.innerHTML = "";
  data.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = `${p.name} — ₹${p.price} — by ${
      p.createdBy?.name || "anon"
    }`;
    list.appendChild(li);
  });
}

document.getElementById("btnRegister").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Mithun", email, password }),
  });
  const data = await res.json();
  if (res.ok) {
    token = data.token;
    localStorage.setItem("token", token);
    setMeUI(data.user);
  } else {
    alert(data.message || "Error");
  }
};

document.getElementById("btnLogin").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (res.ok) {
    token = data.token;
    localStorage.setItem("token", token);
    setMeUI(data.user);
  } else {
    alert(data.message || "Login failed");
  }
};

document.getElementById("btnCreate").onclick = async () => {
  const name = document.getElementById("pname").value;
  const price = Number(document.getElementById("pprice").value);
  const res = await fetch(`${API}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ name, price, description: "" }),
  });
  if (res.ok) {
    alert("Created!");
    fetchProducts();
  } else {
    const data = await res.json();
    alert(data.message || "Error creating");
  }
};

// init
setMeUI(token ? { email: "you" } : null);
fetchProducts();
