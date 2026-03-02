import asyncio
from playwright.async_api import async_playwright

async def take_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1600, "height": 900})

        print("Navigating to workout-builder.html...")
        await page.goto("http://localhost:8001/workout-builder.html", wait_until="networkidle", timeout=30000)
        print("Page loaded.")

        # Full page screenshot
        await page.screenshot(path="C:/Users/user/iCloudDrive/PARA/1 - Projects/_Websites/simple gym log/simplegym_v2/screenshots/workout-builder-full.png", full_page=True)
        print("Saved full page screenshot")

        # Viewport screenshot
        await page.screenshot(path="C:/Users/user/iCloudDrive/PARA/1 - Projects/_Websites/simple gym log/simplegym_v2/screenshots/workout-builder-viewport.png")
        print("Saved viewport screenshot")

        # Get page HTML snapshot to understand structure
        html = await page.content()
        import re
        exercise_ids = re.findall(r'id="([^"]*exercise[^"]*)"', html, re.IGNORECASE)
        print(f"Exercise-related IDs: {exercise_ids[:30]}")

        card_classes = re.findall(r'class="([^"]*card[^"]*)"', html, re.IGNORECASE)
        print(f"Card classes found: {card_classes[:20]}")

        # Try finding the right-side exercise panel
        selectors_to_try = [
            "#exercise-database-panel",
            ".exercise-database-panel",
            "#exercise-search-panel",
            ".exercise-card",
            "[data-exercise-id]",
            ".exercise-list",
            "#exerciseSearchResults",
            ".exercise-item",
            "#offcanvasExerciseDB",
            ".exercise-db-panel",
            "#exercise-db",
            ".col-exercises",
        ]

        for sel in selectors_to_try:
            el = await page.query_selector(sel)
            if el:
                print(f"Found: {sel}")
                box = await el.bounding_box()
                print(f"  Box: {box}")
                if box and box['width'] > 50 and box['height'] > 50:
                    await el.screenshot(path=f"C:/Users/user/iCloudDrive/PARA/1 - Projects/_Websites/simple gym log/simplegym_v2/screenshots/exercise-panel.png")
                    print(f"  Saved exercise panel screenshot")
                    break

        # Count visible exercise cards
        cards = await page.query_selector_all(".exercise-card")
        print(f"Exercise cards found: {len(cards)}")

        # Look for heart icons and plus buttons
        heart_icons = await page.query_selector_all("[class*='heart'], [class*='favorite'], .bx-heart, .bxs-heart")
        print(f"Heart icons found: {len(heart_icons)}")

        plus_btns = await page.query_selector_all("[class*='plus'], [class*='add'], .bx-plus, button.btn-add")
        print(f"Plus buttons found: {len(plus_btns)}")

        # Check offcanvases
        offcanvases = await page.query_selector_all(".offcanvas")
        print(f"Number of offcanvas elements: {len(offcanvases)}")
        for i, oc in enumerate(offcanvases):
            oc_id = await oc.get_attribute("id")
            oc_class = await oc.get_attribute("class")
            print(f"  Offcanvas {i}: id={oc_id}, class={oc_class}")

        await browser.close()
        print("Done!")

asyncio.run(take_screenshots())
