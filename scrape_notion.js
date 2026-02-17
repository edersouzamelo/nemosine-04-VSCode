const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: false }); // Visible browser so user can see/debug if needed
    const page = await browser.newPage();

    console.log('Navigating to Notion page...');
    await page.goto('https://olive-gray-fd2.notion.site/2536d61a950e808d9b78e3b8fa3d0d4f?v=2536d61a950e8132a38e000c73a348d7', {
        waitUntil: 'networkidle0',
        timeout: 60000
    });

    console.log('Waiting for table data to load...');
    // Wait for the specific Notion table selector or text
    await page.waitForSelector('.notion-collection-item', { timeout: 30000 }).catch(() => console.log("Timeout waiting for selector, trying to scrape anyway"));

    // Scroll to bottom to ensure lazy-loaded rows are present
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    // Extract data
    const data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.notion-collection-item'));
        return rows.map(row => {
            // Notion class names are dynamic/obfuscated, so we try to find by column position or text content
            // This is heuristic and might need adjustment
            const spans = Array.from(row.querySelectorAll('span'));

            // Heuristic: Name is usually the first big text, Script is the long text
            // Let's try to map specific columns if we can identify headers, otherwise just dump text
            const texts = spans.map(s => s.innerText);
            return {
                raw: texts
            };
        });
    });

    console.log(`Extracted ${data.length} rows.`);

    // Save to file
    fs.writeFileSync('notion_dump.json', JSON.stringify(data, null, 2));
    console.log('Data saved to notion_dump.json');

    await browser.close();
})();
