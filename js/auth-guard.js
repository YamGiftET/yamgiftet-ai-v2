(function () {
  "use strict";

  const PUBLIC_PAGE = "login.html";

  if (location.pathname.endsWith("/login.html")) return;

  function guard(user) {
    if (!user) {
      window.location.replace(PUBLIC_PAGE);
    }
  }

  function start() {
    if (window.yamFirebaseAuth) {
      window.yamFirebaseAuth.onAuthStateChanged(guard);
    } else {
      window.addEventListener("yamAuthStateChanged", function (event) {
        guard(event.detail.user);
      });
    }
  }

  if (window.yamFirebaseAuth) {
    start();
  } else {
    window.addEventListener("yamAuthStateChanged", start, { once: true });
  }
})();

/* =========================================================
   YAM AUTO-LOCK — 15 MINUTES INACTIVITY
   ========================================================= */
(function () {
  "use strict";

  const AUTO_LOCK_MS = 15 * 60 * 1000;
  let autoLockTimer = null;

  function resetAutoLockTimer() {
    clearTimeout(autoLockTimer);

    autoLockTimer = setTimeout(async () => {
      try {
        if (window.yamAuth && typeof window.yamAuth.signOut === "function") {
          await window.yamAuth.signOut(window.yamAuth.auth);
        }
      } catch (error) {
        console.error("❌ Auto-Lock logout failed:", error);
      } finally {
        window.location.replace("login.html");
      }
    }, AUTO_LOCK_MS);
  }

  [
    "click",
    "touchstart",
    "keydown",
    "mousemove",
    "scroll"
  ].forEach(eventName => {
    window.addEventListener(eventName, resetAutoLockTimer, {
      passive: true
    });
  });

  resetAutoLockTimer();

  console.log("🔐 YamGiftET Auto-Lock: 15 minutes");
})();
