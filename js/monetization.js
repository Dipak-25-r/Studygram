/* ============================================================
   monetization.js — ad slots + premium membership (simulated)
   Real ad networks (AdSense/AdMob) and payment gateways
   (Razorpay/Stripe) are NOT wired up — see README "Roadmap"
   for exactly how to plug them in later.
   ============================================================ */

const Monetization = {
  PREMIUM_PRICE_COINS: 200,

  isPremium(user) {
    return !!user?.premium;
  },

  /** Simulated in-feed ad card — every Nth post */
  adSlotHTML(n) {
    const messages = [
      'Sponsored — Crack NEET 2027 with AI mock tests',
      'Sponsored — Upgrade to Premium and remove all ads',
      'Sponsored — Find scholarships you qualify for'
    ];
    return `<div class="ad-slot glass-card"><span class="ad-label">Advertisement</span>${messages[n % messages.length]}</div>`;
  },

  /** Banner shown to free users, hidden for premium */
  upgradeBannerHTML(user) {
    if (this.isPremium(user)) return '';
    return `
      <div class="upgrade-banner glass-card">
        <div>
          <h4>⭐ Go Premium</h4>
          <div class="muted small">Remove ads, get a profile badge & unlock 2 free paid posts/month.</div>
        </div>
        <button class="btn btn-primary btn-sm" id="go-premium-btn">Upgrade — ${this.PREMIUM_PRICE_COINS} coins</button>
      </div>`;
  },

  wireUpgradeBanner(container) {
    const btn = container.querySelector('#go-premium-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const user = Auth.currentUser();
      if (!Auth.requireLogin()) return;
      if (user.xp < this.PREMIUM_PRICE_COINS) {
        toast(`Not enough coins. You need ${this.PREMIUM_PRICE_COINS}, you have ${user.xp}.`, 'error');
        return;
      }
      Modal.confirm(`Upgrade to Premium for ${this.PREMIUM_PRICE_COINS} coins? (Simulated payment — wire a real gateway later.)`, () => {
        DB.update(DB_KEYS.users, user.id, { xp: user.xp - this.PREMIUM_PRICE_COINS, premium: true });
        toast('🎉 Welcome to Premium!', 'success');
        Router.go(Router.current);
      });
    });
  }
};
