/* =========================================================
   YamGiftET AI v2 — Firebase Authentication Controller
   Login • Signup • Logout • Session State
   ========================================================= */

(function () {
  'use strict';

  const waitForFirebase = setInterval(() => {
    if (!window.yamFirebaseAuthAPI) return;

    clearInterval(waitForFirebase);

    const auth = window.yamFirebaseAuth;
    const api = window.yamFirebaseAuthAPI;

    window.yamAuth = {
      auth,
      signIn: api.signIn,
      signUp: api.signUp,
      signOut: api.signOut,
      onAuthStateChanged: api.onAuthStateChanged
    };

    api.onAuthStateChanged(auth, (user) => {
      window.yamCurrentUser = user || null;

      window.dispatchEvent(
        new CustomEvent('yamAuthStateChanged', {
          detail: { user: user || null }
        })
      );

      console.log(
        user
          ? '✅ YamGiftET user authenticated'
          : 'ℹ️ YamGiftET no authenticated user'
      );
    });

    console.log('✅ YamGiftET Authentication Controller ready');
  }, 50);
})();
document.addEventListener('DOMContentLoaded', function () {
  const logoutBtn = document.getElementById('yamLogoutBtn');

  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async function () {
    try {
      logoutBtn.disabled = true;
      logoutBtn.textContent = '⏳ እየወጣ ነው...';

      if (!window.yamAuth || typeof window.yamAuth.signOut !== 'function') {
        throw new Error('YamAuth signOut API is not available');
      }

      await window.yamAuth.signOut(window.yamAuth.auth);

      console.log('✅ YamGiftET logout successful');
      window.location.replace('login.html');
    } catch (error) {
      console.error('❌ YamGiftET logout failed:', error); alert('DEBUG: ' + (error?.code || '') + ' | ' + (error?.message || error));
      logoutBtn.disabled = false;
      logoutBtn.textContent = '🔐 ውጣ';
      alert('❌ ከመለያው መውጣት አልተሳካም።');
    }
  });
});
