const { chromium } = require("playwright");
const fs = require("fs");

const OUTPUT_FILE = "linkedin_posts.json";
const TARGET_POSTS = 20;

function save(posts) {
    fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(posts, null, 2)
    );
}

function cleanCaption(text = "") {
    return text
        .replace(/\u2026\s*more/gi, "")
        .replace(/\.\.\.\s*more/gi, "")
        .trim();
}

(async () => {

    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext({
        storageState: "linkedin-session.json"
    });

    const page = await context.newPage();

    console.log("\n=================================");
    console.log("LinkedIn Feed Scraper Started");
    console.log("=================================\n");

    await page.goto(
        "https://www.linkedin.com/feed/",
        {
            waitUntil: "domcontentloaded",
            timeout: 120000
        }
    );

    const posts = [];
    const seenPosts = new Set();

    let scrollCycle = 0;

    while (posts.length < TARGET_POSTS) {

        scrollCycle++;

        console.log(
            `\n========== SCROLL ${scrollCycle} ==========`
        );

        //--------------------------------------------------
        // Expand all "see more"
        //--------------------------------------------------

        try {

            const buttons =
                page.locator(
                    '[data-testid="expandable-text-button"]'
                );

            const count =
                await buttons.count();

            console.log(
                `[INFO] Expand buttons found: ${count}`
            );

            for (
                let i = 0;
                i < count;
                i++
            ) {
                try {

                    const btn =
                        buttons.nth(i);

                    if (
                        await btn.isVisible()
                    ) {

                        await btn.click({
                            timeout: 500
                        });

                        await page.waitForTimeout(
                            100
                        );
                    }

                } catch { }
            }

        } catch { }

        //--------------------------------------------------
        // Posts
        //--------------------------------------------------

        const commentaryBlocks =
            page.locator(
                'p[componentkey^="feed-commentary_"]'
            );

        const totalBlocks =
            await commentaryBlocks.count();

        console.log(
            `[INFO] Commentary Blocks: ${totalBlocks}`
        );

        for (
            let i = 0;
            i < totalBlocks;
            i++
        ) {

            if (
                posts.length >= TARGET_POSTS
            ) {
                break;
            }

            try {

                const commentary =
                    commentaryBlocks.nth(i);

                let caption =
                    await commentary.innerText();

                caption =
                    cleanCaption(caption);

                if (
                    !caption ||
                    caption.length < 20
                ) {
                    continue;
                }

                //--------------------------------------------------
                // Parent Card
                //--------------------------------------------------

                const card =
                    commentary.locator(
                        'xpath=ancestor::*[@role="listitem"][1]'
                    );

                const cardText =
                    await card.innerText();

                //--------------------------------------------------
                // Skip non-post cards
                //--------------------------------------------------

                const skipPatterns = [

                    "Recommended for you",

                    "People you may know",

                    "Jobs recommended for you",

                    "Popular course on LinkedIn Learning",

                    "Open more opportunities",

                    "Start for free",

                    "Grow your network",

                    "New comment in your group"
                ];

                if (
                    skipPatterns.some(
                        x =>
                            cardText.includes(x)
                    )
                ) {
                    continue;
                }

                //--------------------------------------------------
                // Social Context
                //--------------------------------------------------

                let socialActor = null;
                let socialAction = null;

                const socialPatterns = [
                    "loved this",

                    "likes this",

                    "commented on this",

                    "supports this",

                    "celebrates this",

                    "finds this insightful",

                    "finds this funny",

                    "reposted this"
                ];

                for (
                    const pattern
                    of socialPatterns
                ) {

                    const idx =
                        cardText.indexOf(
                            pattern
                        );

                    if (
                        idx > 0
                    ) {

                        socialAction =
                            pattern;

                        socialActor =
                            cardText
                                .substring(
                                    0,
                                    idx
                                )
                                .split("\n")
                                .pop()
                                .trim();

                        break;
                    }
                }

                //--------------------------------------------------
                // Post URL
                //--------------------------------------------------

                let postUrl =
                    null;

                let postId =
                    null;

                try {

                    const urls =
                        await card
                            .locator(
                                'a[href*="/feed/update/"]'
                            )
                            .evaluateAll(
                                els =>
                                    els.map(
                                        e =>
                                            e.href
                                    )
                            );

                    postUrl =
                        urls.find(
                            Boolean
                        ) || null;

                    postId =
                        postUrl
                            ?.match(
                                /(\d{10,})/
                            )
                            ?.[1] ||
                        null;

                } catch { }

                //--------------------------------------------------
                // Duplicate Check
                //--------------------------------------------------

                if (
                    postId &&
                    seenPosts.has(
                        postId
                    )
                ) {
                    continue;
                }

                if (
                    postId
                ) {
                    seenPosts.add(
                        postId
                    );
                }

                //--------------------------------------------------
                // Author
                //--------------------------------------------------

                let author = "";
                let profileUrl =
                    "";

                try {

                    const profileLinks =
                        await card
                            .locator(
                                'a[href*="/in/"], a[href*="/company/"]'
                            )
                            .evaluateAll(
                                links =>
                                    links.map(
                                        link => ({
                                            href:
                                                link.href,
                                            text:
                                                link.textContent?.trim()
                                        })
                                    )
                            );

                    const validAuthors =
                        profileLinks.filter(
                            x =>
                                x.text &&
                                x.text.length >
                                1 &&
                                x.text !==
                                socialActor
                        );

                    const authorEntry =
                        validAuthors[
                        validAuthors.length -
                        1
                        ];

                    if (
                        authorEntry
                    ) {

                        author =
                            authorEntry.text;

                        profileUrl =
                            authorEntry.href;
                    }

                } catch { }

                //--------------------------------------------------
                // Images
                //--------------------------------------------------

                let images =
                    [];

                try {

                    images =
                        await card
                            .locator(
                                'img[srcset*="feedshare"], img[src*="feedshare-image"], img[src*="feedshare-shrink"]'
                            )
                            .evaluateAll(
                                imgs => {

                                    return imgs.map(
                                        img => {

                                            const srcset =
                                                img.getAttribute(
                                                    "srcset"
                                                );

                                            if (
                                                !srcset
                                            ) {
                                                return img.src;
                                            }

                                            const urls =
                                                srcset
                                                    .split(
                                                        ","
                                                    )
                                                    .map(
                                                        x =>
                                                            x
                                                                .trim()
                                                                .split(
                                                                    " "
                                                                )[0]
                                                    );

                                            const highRes =
                                                urls.find(
                                                    url =>
                                                        url.includes(
                                                            "feedshare-image-high-res"
                                                        )
                                                );

                                            return (
                                                highRes ||
                                                urls[
                                                urls.length -
                                                1
                                                ]
                                            );
                                        }
                                    );
                                }
                            );

                    images =
                        [
                            ...new Set(
                                images
                            )
                        ];

                } catch { }

                //--------------------------------------------------
                // Video
                //--------------------------------------------------

                let hasVideo =
                    false;

                try {

                    hasVideo =
                        (
                            await card
                                .locator(
                                    "video"
                                )
                                .count()
                        ) > 0;

                } catch { }

                //--------------------------------------------------
                // Document
                //--------------------------------------------------

                let hasDocument =
                    false;

                try {

                    hasDocument =
                        (
                            await card
                                .locator(
                                    'img[src*="document"]'
                                )
                                .count()
                        ) > 0;

                } catch { }

                //--------------------------------------------------
                // Poll Detection
                //--------------------------------------------------

                let isPoll =
                    false;

                try {

                    isPoll =
                        cardText.includes(
                            "votes"
                        ) &&
                        (
                            await card
                                .locator(
                                    '[role="radio"]'
                                )
                                .count()
                        ) > 0;

                } catch { }

                //--------------------------------------------------
                // Timestamp
                //--------------------------------------------------

                let timestamp =
                    null;

                try {

                    timestamp =
                        cardText.match(
                            /\b\d+[smhdwy]\b/
                        )?.[0] ||
                        null;

                } catch { }

                //--------------------------------------------------
                // Stats
                //--------------------------------------------------

                let reactions =
                    null;

                let comments =
                    null;

                let reposts =
                    null;

                try {

                    reactions =
                        cardText
                            .match(
                                /([\d,]+)\s+reactions/i
                            )
                            ?.[1]
                            ?.replaceAll(
                                ",",
                                ""
                            ) ||
                        null;

                    comments =
                        cardText
                            .match(
                                /([\d,]+)\s+comments/i
                            )
                            ?.[1]
                            ?.replaceAll(
                                ",",
                                ""
                            ) ||
                        null;

                    reposts =
                        cardText
                            .match(
                                /([\d,]+)\s+repost/i
                            )
                            ?.[1]
                            ?.replaceAll(
                                ",",
                                ""
                            ) ||
                        null;

                } catch { }

                //--------------------------------------------------
                // Post Type
                //--------------------------------------------------

                let postType =
                    "post";

                if (
                    hasVideo
                ) {
                    postType =
                        "video";
                }

                if (
                    hasDocument
                ) {
                    postType =
                        "document";
                }

                if (
                    isPoll
                ) {
                    postType =
                        "poll";
                }

                if (
                    cardText.includes(
                        "View job"
                    )
                ) {
                    postType =
                        "job";
                }

                if (
                    socialAction ===
                    "reposted this"
                ) {
                    postType =
                        "repost";
                }

                //--------------------------------------------------
                // Final Object
                //--------------------------------------------------

                const post = {

                    postId,

                    postUrl,

                    postType,

                    author,

                    profileUrl,

                    socialContext:
                    {
                        actor:
                            socialActor,

                        action:
                            socialAction
                    },

                    caption,

                    media: {

                        images,

                        hasVideo,

                        hasDocument
                    },

                    stats: {

                        reactions,

                        comments,

                        reposts
                    },

                    timestamp,

                    scrapedAt:
                        new Date().toISOString()
                };

                posts.push(
                    post
                );

                save(
                    posts
                );

                console.log(
                    `\n[POST ${posts.length}]`
                );

                console.log(
                    `Type: ${postType}`
                );

                console.log(
                    `Author: ${author}`
                );

                console.log(
                    `Social: ${socialActor || "None"}`
                );

                console.log(
                    `Images: ${images.length}`
                );

                console.log(
                    `Video: ${hasVideo}`
                );

                console.log(
                    `URL: ${postUrl}`
                );

            } catch (
                err
            ) {

                console.log(
                    "[ERROR]"
                );

                console.log(
                    err.message
                );
            }
        }

        if (
            posts.length >=
            TARGET_POSTS
        ) {
            break;
        }

        console.log(
            "\n[INFO] Scrolling..."
        );

        await page.mouse.wheel(
            0,
            6000
        );

        await page.waitForTimeout(
            3000
        );
    }

    save(posts);

    console.log(
        "\n================================="
    );

    console.log(
        `DONE: ${posts.length} posts saved`
    );

    console.log(
        "=================================\n"
    );

    await browser.close();

})();