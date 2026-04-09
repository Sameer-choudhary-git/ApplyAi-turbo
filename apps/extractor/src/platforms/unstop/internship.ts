import { Extractor } from "../../core/types"
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';

const TARGET_URL = 'https://unstop.com/internships?quickApply=true&datePosted=1&oppstatus=open';
const DATA_FILE = 'internships.json';

const SELECTORS = {
    card: 'app-competition-listing a.item',
    title: '.cptn h3',
    company: '.cptn > p',
    
    otherFields: '.other_fields',
    skills: '.center-bullet .left-tags', 
    tags: '.skill_list un-chip',
    stipend: '.cash_container',
    footerDates: '.dates-fields',

    nextButton: 'li.right-arrow:not(.disabled) img[alt="Angle right icon"]',
};

interface Internship {
    title: string;
    company: string;
    link: string;
    experience: string;
    type: string;
    location: string;
    skills: string[];
    tags: string[];
    stipend: string;
    postedDate: string;
    daysLeft: string;
}

export const unstopInternships: Extractor = {
  platform: "unstop",
  category: "internships",

  async run() {
    let allInternships: Internship[] = [];
    if (!fs.existsSync('auth.json')) {
            console.error('❌ Error: auth.json not found. Run auth-setup.ts first.');
            return [];
        }
    
        const browser: Browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ storageState: 'auth.json' });
        const page: Page = await context.newPage();
        
        let currentPage = 1;
    
        try {
            console.log('--- Scraper Started ---');
            // Use domcontentloaded for faster wait
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log(`Mapsd to ${TARGET_URL}`);
    
            while (true) {
                console.log(`\n📄 Scraping Page ${currentPage}...`);
    
                // 1. Wait for cards
                try {
                    await page.waitForSelector(SELECTORS.card, { timeout: 10000 });
                } catch (e) {
                    console.log('   🛑 No cards found (End of results).');
                    break;
                }
    
                // 2. Extract All Details
                const pageData = await page.evaluate((sel) => {
                    const cards = document.querySelectorAll(sel.card);
                    const results: any[] = [];
    
                    cards.forEach((card) => {
                        const anchor = card as HTMLAnchorElement;
    
                        // --- Helpers for cleaner extraction ---
                        const getText = (selector: string) => 
                            anchor.querySelector(selector)?.textContent?.trim() || '';
                        
                        // --- Field Extraction ---
                        const title = getText(sel.title) || 'Unknown Title';
                        const company = getText(sel.company) || 'Unknown Company';
                        const stipend = getText(sel.stipend).replace(/\s+/g, ' ') || 'Not Disclosed';
    
                        // -- Skills & Tags --
                        const skills = Array.from(anchor.querySelectorAll(`${sel.skills} span`))
                            .map(s => s.textContent?.trim() || '').filter(s => s);
                        
                        const tags = Array.from(anchor.querySelectorAll(`${sel.tags} .chip_text`))
                            .map(t => t.textContent?.trim() || '').filter(t => t);
    
                        // -- Complex Fields (Experience, Type, Location) --
                        // We iterate through the .other_fields divs and check icons or order
                        let experience = '';
                        let type = '';
                        let location = '';
    
                        const metaDivs = anchor.querySelectorAll(`${sel.otherFields} > div`);
                        metaDivs.forEach(div => {
                            const text = div.textContent?.trim() || '';
                            const img = div.querySelector('img'); // Playwright renders svgs often, but Unstop uses img tags in your HTML
                            const iconSrc = img?.src || '';
                            
                            // Heuristic based on icon name or text content
                            if (text.includes('experience') || iconSrc.includes('job')) experience = text;
                            else if (text.includes('Time') || iconSrc.includes('schedule')) type = text;
                            else if (iconSrc.includes('location') || text.includes('Office') || text.includes('Remote') || text.includes('Hybrid')) location = text;
                        });
    
                        // -- Dates (Posted / Days Left) --
                        let postedDate = '';
                        let daysLeft = '';
                        const dateLabels = anchor.querySelectorAll(`${sel.footerDates} .tag-text`);
                        dateLabels.forEach(lbl => {
                            const txt = lbl.textContent?.trim() || '';
                            if (txt.includes('Posted')) postedDate = txt;
                            else if (txt.includes('left') || txt.includes('End')) daysLeft = txt;
                        });
    
                        results.push({
                            title,
                            company,
                            link: anchor.href,
                            stipend,
                            experience,
                            type,
                            location,
                            skills,
                            tags,
                            postedDate,
                            daysLeft
                        });
                    });
    
                    return results;
                }, SELECTORS);
    
                console.log(`   Found ${pageData.length} internships.`);
                allInternships = allInternships.concat(pageData);
    
                // 3. Pagination Logic (Fixed for Strict Mode)
                const nextBtn = page.locator(SELECTORS.nextButton);
    
                // We use .first() or check count just to be absolutely safe, 
                // but the selector `img[alt="Angle right icon"]` should be unique per active button.
                if (await nextBtn.count() > 0 && await nextBtn.first().isVisible()) {
                    console.log('   ➡️ Clicking Next Page...');
                    await nextBtn.first().click(); // Click the specific image
                    await page.waitForTimeout(5000); // Wait for API reload
                    currentPage++;
                } else {
                    console.log('   🛑 Next button hidden or disabled. Finished.');
                    break;
                }
            }
    
            console.log(`\n💾 Saving ${allInternships.length} internships to ${DATA_FILE}...`);
            fs.writeFileSync(DATA_FILE, JSON.stringify(allInternships, null, 2));
            console.log('✅ Done! Check internships.json');
    
        } catch (error) {
            console.error('Agent Error:', error);
        } finally {
            await browser.close();
        }       
        return allInternships; 
    }
}