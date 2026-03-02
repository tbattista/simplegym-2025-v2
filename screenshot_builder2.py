import asyncio
from playwright.async_api import async_playwright

SAVE_DIR = "C:/Users/user/iCloudDrive/PARA/1 - Projects/_Websites/simple gym log/simplegym_v2/screenshots"

async def take_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1600, "height": 900})

        print("Navigating...")
        await page.goto("http://localhost:8001/workout-builder.html", wait_until="networkidle", timeout=30000)
        print("Page loaded.")

        # Full screenshot
        await page.screenshot(path=f"{SAVE_DIR}/01-full-page.png", full_page=True)
        print("Saved 01-full-page.png")

        # Look for sidebar exercise list
        sidebar = await page.query_selector("#sidebarExerciseList")
        if sidebar:
            box = await sidebar.bounding_box()
            print(f"sidebarExerciseList box: {box}")
            if box:
                await page.screenshot(
                    path=f"{SAVE_DIR}/02-sidebar-exercise-list.png",
                    clip={"x": box["x"], "y": box["y"], "width": box["width"], "height": min(box["height"], 800)}
                )
                print("Saved 02-sidebar-exercise-list.png")

        # Look for sidebar exercise cards
        cards = await page.query_selector_all(".sidebar-exercise-card")
        print(f"Found {len(cards)} sidebar-exercise-card elements")

        if cards:
            # Screenshot first card
            first_card = cards[0]
            box = await first_card.bounding_box()
            print(f"First card box: {box}")
            if box:
                await page.screenshot(
                    path=f"{SAVE_DIR}/03-first-exercise-card.png",
                    clip={"x": max(0, box["x"] - 5), "y": max(0, box["y"] - 5),
                          "width": box["width"] + 10, "height": box["height"] + 10}
                )
                print("Saved 03-first-exercise-card.png")

            # Screenshot first 5 cards area
            if len(cards) >= 3:
                first_box = await cards[0].bounding_box()
                last_box = await cards[min(4, len(cards)-1)].bounding_box()
                if first_box and last_box:
                    clip = {
                        "x": max(0, first_box["x"] - 10),
                        "y": max(0, first_box["y"] - 10),
                        "width": first_box["width"] + 20,
                        "height": (last_box["y"] + last_box["height"]) - first_box["y"] + 20
                    }
                    await page.screenshot(path=f"{SAVE_DIR}/04-first-5-cards.png", clip=clip)
                    print(f"Saved 04-first-5-cards.png, clip={clip}")

        # Find the heart icons
        heart_icons = await page.query_selector_all(".bx-heart, .bxs-heart, [class*='heart']")
        print(f"Heart icons: {len(heart_icons)}")
        if heart_icons:
            h = heart_icons[0]
            hbox = await h.bounding_box()
            hclass = await h.get_attribute("class")
            print(f"  First heart - class: {hclass}, box: {hbox}")
            # Get parent
            parent = await page.evaluate("el => el.parentElement.outerHTML", h)
            print(f"  Parent HTML: {parent[:300]}")

        # Find plus buttons
        plus_btns = await page.query_selector_all(".bx-plus")
        print(f"Plus (bx-plus) icons: {len(plus_btns)}")
        if plus_btns:
            p_el = plus_btns[0]
            pbox = await p_el.bounding_box()
            pclass = await p_el.get_attribute("class")
            print(f"  First plus - class: {pclass}, box: {pbox}")
            parent = await page.evaluate("el => el.parentElement.outerHTML", p_el)
            print(f"  Parent HTML: {parent[:300]}")

        # Get sidebar exercise card HTML structure
        if cards:
            card_html = await page.evaluate("el => el.outerHTML", cards[0])
            print(f"\nFirst card HTML:\n{card_html}")

        # Check card actions area
        actions = await page.query_selector_all(".sidebar-card-actions")
        print(f"\nSidebar card actions: {len(actions)}")
        if actions:
            action = actions[0]
            abox = await action.bounding_box()
            ahtml = await page.evaluate("el => el.outerHTML", action)
            print(f"  Box: {abox}")
            print(f"  HTML: {ahtml}")

        await browser.close()
        print("\nDone!")

asyncio.run(take_screenshots())
