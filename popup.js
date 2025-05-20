document.addEventListener('DOMContentLoaded', function() {
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
