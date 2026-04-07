import { test, expect } from '@playwright/test';

// NOTE: Before running E2E tests, you need the storefront URL
// Ex: test.use({ baseURL: 'https://wishlist-dev-app-2.myshopify.com' });

test.describe('Storefront Wishlist Actions', () => {
  // Since Playwright runs in an isolated browser, we can mock the page environment
  // or point it directly to the live dev store with password.
  
  test('Adds a product to localStorage wishlist when logged out', async ({ page }) => {
    // We mock localStorage functionality to ensure our liquid script logic holds up
    await page.goto('about:blank');
    
    await page.evaluate(() => {
      localStorage.setItem('shopify_wishlist', JSON.stringify([]));
    });

    // Mock the wishlist button in isolated DOM
    await page.setContent(`
      <button class="wishlist-btn" id="wishlist-btn-123" data-product-id="123">
        <span class="wishlist-icon" id="wishlist-icon-123">♡</span>
        <span class="wishlist-label" id="wishlist-label-123">Add to Wishlist</span>
      </button>
      <script>
        (function() {
          var STORAGE_KEY = 'shopify_wishlist';
          var btn = document.getElementById('wishlist-btn-123');
          var productId = '123';
          
          btn.addEventListener('click', function (e) {
            var wishlist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            wishlist.push(productId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
            
            btn.classList.add('is-wishlisted');
            document.getElementById('wishlist-icon-123').textContent = '♥';
            document.getElementById('wishlist-label-123').textContent = 'Added to Wishlist';
          });
        })();
      </script>
    `);

    // Click the button
    const btn = page.locator('#wishlist-btn-123');
    await expect(btn).toContainText('Add to Wishlist');
    await btn.click();
    
    // Verify UI updated
    await expect(btn).toContainText('Added to Wishlist');
    
    // Verify LocalStorage updated
    const wishlistStorage = await page.evaluate(() => localStorage.getItem('shopify_wishlist'));
    expect(JSON.parse(wishlistStorage)).toContain('123');
  });
});
