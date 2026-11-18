
// ====================================
// DRILLIONS — JAVASCRIPT
// ====================================

// NAVIGATION ELEMENTS

const nav = document.getElementById("nav");

const menuButton =
  document.getElementById("menuButton");

const navLinks =
  document.getElementById("navLinks");


// ====================================
// NAVBAR SCROLL EFFECT
// ====================================

function updateNav() {

  nav.classList.toggle(
    "scrolled",
    window.scrollY > 40
  );

}

window.addEventListener(
  "scroll",
  updateNav,
  { passive: true }
);

updateNav();


// ====================================
// MOBILE MENU
// ====================================

menuButton.addEventListener("click", () => {

  const isOpen =
    navLinks.classList.toggle("open");

  menuButton.setAttribute(
    "aria-expanded",
    String(isOpen)
  );

  menuButton.setAttribute(
    "aria-label",
    isOpen
      ? "Close navigation"
      : "Open navigation"
  );

});


// ====================================
// CLOSE MENU AFTER LINK CLICK
// ====================================

navLinks.querySelectorAll("a").forEach(link => {

  link.addEventListener("click", () => {

    navLinks.classList.remove("open");

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

    menuButton.setAttribute(
      "aria-label",
      "Open navigation"
    );

  });

});


// ====================================
// AUTOMATIC COPYRIGHT YEAR
// ====================================

document.getElementById("year").textContent =
  new Date().getFullYear();
