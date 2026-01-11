document.addEventListener('DOMContentLoaded', async function() {
  // Compatibility shim
  globalThis.browser = globalThis.browser || globalThis.chrome;

  // Load and display Rewards Points
  const userData = await browser.storage.local.get({ rewardsPoints: null });
  if (userData.rewardsPoints !== null) {
    const points = userData.rewardsPoints;
    document.getElementById('rewards-points').textContent = points;
    const euros = (points / 1338).toFixed(2);
    document.getElementById('amazon-value').textContent = `${euros}€`;
  }

  // Open Bing Search
  document.getElementById('open-bing').addEventListener('click', function() {
    browser.tabs.create({ url: 'https://www.bing.com' });
    window.close();
  });

  // Open Options Page
  document.getElementById('open-options').addEventListener('click', function() {
    browser.runtime.openOptionsPage();
    window.close();
  });
});
