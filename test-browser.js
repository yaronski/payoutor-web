const puppeteer = require('puppeteer');

async function testCopyNotifications() {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--start-maximized'],
      slowMo: 100
    });
    
    const page = await browser.newPage();
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    console.log('Page loaded, waiting for initial render...');
    await page.waitForTimeout(2000);
    
    // Fill in the form
    console.log('Filling in form...');
    
    // Select native payout type
    await page.evaluate(() => {
      const nativeRadio = document.querySelector('input[value="native"]');
      if (nativeRadio) nativeRadio.click();
    });
    await page.waitForTimeout(500);
    
    // Enter USD amount
    await page.type('#usdAmount', '100');
    await page.waitForTimeout(500);
    
    // Enter recipient address
    await page.type('#recipient', '0x123456789012345678901234567890123456789');
    await page.waitForTimeout(500);
    
    // Click calculate
    console.log('Clicking Calculate button...');
    await page.click('button[type="submit"]');
    
    // Wait for results
    console.log('Waiting for results...');
    await page.waitForSelector('[class*="result"]', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Look for Copy Full Summary button
    console.log('Looking for Copy Full Summary button...');
    const copySummaryBtn = await page.evaluateHandle(() => {
      const btn = document.querySelector('button');
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Copy Full Summary'));
    });
    
    if (copySummaryBtn) {
      console.log('Found Copy Full Summary button, clicking...');
      await copySummaryBtn.click();
      await page.waitForTimeout(1000);
      
      // Check if notification appeared
      const notification = await page.evaluate(() => {
        const notification = document.querySelector('div[style*="position: fixed"]');
        return notification ? notification.textContent : null;
      });
      
      if (notification && notification.includes('Copied')) {
        console.log('✅ Copy notification appeared!');
        console.log(`  Text: "${notification}"`);
      } else {
        console.log('❌ Copy notification did NOT appear');
        console.log('  Looking for notification with green background...');
        
        // Try alternative selector
        const altNotification = await page.evaluate(() => {
          const allDivs = Array.from(document.querySelectorAll('div'));
          return allDivs
            .filter(d => {
              const style = window.getComputedStyle(d);
              return style.position === 'fixed' && 
                   style.backgroundColor && 
                   style.backgroundColor.includes('39ff14');
            })
            .map(d => d.textContent);
        });
        
        if (altNotification && altNotification.length > 0) {
          console.log('✅ Found notification:', altNotification);
        } else {
          console.log('❌ No notification found');
        }
      }
    } else {
      console.log('❌ Copy Full Summary button not found');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Browser will stay open for 10 seconds for you to inspect...');
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (browser) {
        await browser.close();
    }
  }
}

testCopyNotifications();
