const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');

// --- HELPERS ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* Visual Helpers */
async function highlight(page, selector) {
    try {
        await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) {
                el.style.transition = 'all 0.2s';
                el.style.outline = '4px solid #ef4444';
                el.style.transform = 'scale(1.05)';
            }
        }, selector);
        await wait(400); // Fast highlight
    } catch (e) { }
}

async function unhighlight(page, selector) {
    try {
        await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) {
                el.style.outline = '';
                el.style.transform = '';
            }
        }, selector);
        await wait(100);
    } catch (e) { }
}

async function clickWithHighlight(page, selector) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout: 3000 });
        await highlight(page, selector);
        await page.click(selector);
        await unhighlight(page, selector);
    } catch (e) {
        console.log(`⚠️ Click failed: ${selector}`);
    }
}

async function typeWithHighlight(page, selector, text) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout: 3000 });
        await highlight(page, selector);
        await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
        await page.type(selector, text, { delay: 50 }); // Fast typing
        await unhighlight(page, selector);
    } catch (e) {
        console.log(`⚠️ Type failed: ${selector}`);
    }
}

async function scrollPage(page) {
    await page.evaluate(() => {
        window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await wait(800);
    await page.evaluate(() => {
        window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await wait(800);
}

// --- MAIN ---
(async () => {
    console.log('🎬 Starting 1-Min Demo...');

    // Launch Browser
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        slowMo: 40, // Very fast actions
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: true,
        fps: 30,
        ffmpeg_Path: null,
        videoFrame: { width: 1920, height: 1080 },
        aspectRatio: '16:9',
    });

    const videoPath = path.join(__dirname, 'demo_silent_1min.mp4');
    await recorder.start(videoPath);
    console.log(`🔴 Recording to: ${videoPath}`);

    const appUrl = `file://${path.join(__dirname, 'index.html')}`;
    await page.goto(appUrl, { waitUntil: 'networkidle0' });

    // 1. DASHBOARD (3s)
    console.log('Scene 1: Dashboard');
    await wait(2000);

    // 2. CREATE ROOM (10s)
    console.log('Scene 2: Rooms');
    await clickWithHighlight(page, '.nav-item:nth-child(2)');
    await clickWithHighlight(page, '#view-rooms button.btn-primary');
    await typeWithHighlight(page, '#m_room_name', 'Premium');
    await typeWithHighlight(page, '#m_room_code', 'PREM');

    // Just save fast
    await page.click('button[onclick="saveRoom()"]');
    await wait(800);

    // Quick scroll to show list
    await scrollPage(page);

    // 3. CREATE RATE & SUPPLEMENTS (15s)
    console.log('Scene 3: Rates');
    await clickWithHighlight(page, '.nav-item:nth-child(3)');

    // Add Rate
    await clickWithHighlight(page, '#view-rates button.btn-primary');
    await typeWithHighlight(page, '#m_rate_name', 'Weekend');
    await typeWithHighlight(page, '#m_rate_code', 'WKND');

    // Set Derived
    await page.select('#m_rate_type', 'derived');
    await wait(200);
    await page.select('#m_rate_rule', 'percent');
    await typeWithHighlight(page, '#m_rate_val', '-15');
    await page.click('button[onclick="saveRate()"]');
    await wait(800);

    // Scroll to Supplements
    console.log('>> Scrolling to Supplements...');
    await page.evaluate(() => {
        const el = document.getElementById('suppMatrixTable');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await wait(1500);

    // Edit 1st input (Fixed)
    try {
        const inputs = await page.$$('#suppMatrixBody input[type="number"]');
        if (inputs.length > 0) {
            await highlight(page, '#suppMatrixBody input[type="number"]');
            await inputs[0].type('20');
            await unhighlight(page, '#suppMatrixBody input[type="number"]');
        }
    } catch (e) { }

    // Edit 2nd input (Percent)
    try {
        await page.evaluate(() => {
            const inputs = document.querySelectorAll('#suppMatrixBody input[type="number"]');
            if (inputs[1]) {
                inputs[1].value = '10';
                inputs[1].dispatchEvent(new Event('change'));
                const select = inputs[1].nextElementSibling;
                if (select) { select.value = 'percent'; select.dispatchEvent(new Event('change')); }
            }
        });
        await wait(1000);
    } catch (e) { }

    // 4. POLICIES (10s)
    console.log('Scene 4: Policies');
    await clickWithHighlight(page, '.nav-item:nth-child(5)');
    await wait(800);

    // Create Policy
    await clickWithHighlight(page, '#view-policies button.btn-primary');
    await typeWithHighlight(page, '#m_policy_name', 'Strict');
    await page.click('button[onclick="savePolicy()"]');
    await wait(800);

    // Scroll policies
    await scrollPage(page);

    // 5. MATRIX (20s) - CRITICAL PART
    console.log('Scene 5: Matrix');
    await clickWithHighlight(page, '.nav-item:nth-child(4)');
    await wait(1500);

    // Ensure Matrix is visible
    await page.evaluate(() => {
        const el = document.getElementById('matrixVisualTable');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    await wait(1000);

    // Change Day 1, 2, 3
    // Use evaluate for speed and reliability in finding inputs
    await page.evaluate(async () => {
        const inputs = document.querySelectorAll('#matrixTbody input[type="number"]');
        // Edit first 3 inputs (Day 1, 2, 3 for first room)
        // Wait, looping here is instantaneous. We want visual delay.
        // We'll stick to puppeteer actions for visuals.
    });

    const matInputs = await page.$$('#matrixTbody input[type="number"]');
    if (matInputs.length > 2) {
        // Day 1
        await matInputs[0].type('120');
        await page.keyboard.press('Enter');
        await wait(400);

        // Day 2 
        await matInputs[1].type('130');
        await page.keyboard.press('Enter');
        await wait(400);

        // Day 3
        await matInputs[2].type('140');
        await page.keyboard.press('Enter');
        await wait(400);
    }

    // Scroll Horizontal Matrix
    await page.evaluate(() => {
        const container = document.querySelector('#matrixVisualTable').parentElement;
        container.scrollBy({ left: 400, behavior: 'smooth' });
    });
    await wait(1500);

    // Scroll Vertical Page
    await scrollPage(page);

    // 6. END (2s)
    console.log('Scene 6: End');
    await clickWithHighlight(page, '.nav-item:nth-child(1)');
    await wait(1500);

    console.log('🛑 Done.');
    await recorder.stop();
    await browser.close();

})();
