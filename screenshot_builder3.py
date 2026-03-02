import asyncio
from playwright.async_api import async_playwright

SAVE_DIR = "C:/Users/user/iCloudDrive/PARA/1 - Projects/_Websites/simple gym log/simplegym_v2/screenshots"

async def take_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})

        print("Navigating...")
        await page.goto("http://localhost:8001/workout-builder.html", wait_until="networkidle", timeout=30000)
        print("Page loaded.")

        # Close the workout selection offcanvas that's showing
        offcanvas = await page.query_selector("#workoutSelectionOffcanvas")
        if offcanvas:
            print("Found workoutSelectionOffcanvas, hiding it...")
            await page.evaluate("""
                const el = document.getElementById('workoutSelectionOffcanvas');
                if (el) {
                    const bs = bootstrap.Offcanvas.getInstance(el);
                    if (bs) bs.hide();
                    else {
                        el.classList.remove('show');
                        document.querySelector('.offcanvas-backdrop')?.remove();
                    }
                }
                document.querySelector('.offcanvas-backdrop')?.remove();
                document.body.classList.remove('offcanvas-open');
                document.body.style.overflow = '';
            """)
            await page.wait_for_timeout(800)

        # Check if there's a "new workout" button or click to create/open a workout
        new_btns = await page.query_selector_all("button")
        for btn in new_btns[:20]:
            txt = await btn.inner_text()
            if txt.strip():
                print(f"Button: '{txt.strip()[:50]}'")

        # Screenshot after closing offcanvas
        await page.screenshot(path=f"{SAVE_DIR}/05-after-close-offcanvas.png")
        print("Saved 05-after-close-offcanvas.png")

        # Try to navigate directly to create a new workout or use ?new=true param
        # First check current URL and what's on screen
        url = page.url
        print(f"Current URL: {url}")

        # Try clicking "New Workout" or "Create" button
        for label in ["New Workout", "Create Workout", "New", "+ New", "Create", "+ New Workout"]:
            try:
                btn = await page.query_selector(f"text={label}")
                if btn:
                    print(f"Clicking '{label}'...")
                    await btn.click()
                    await page.wait_for_timeout(1500)
                    await page.screenshot(path=f"{SAVE_DIR}/06-after-new-workout.png")
                    print("Saved 06-after-new-workout.png")
                    break
            except:
                pass

        # Navigate to a URL that should show the builder with the exercise panel
        print("\nNavigating to workout-builder.html?new=true ...")
        await page.goto("http://localhost:8001/workout-builder.html?new=true", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{SAVE_DIR}/07-new-true-full.png", full_page=True)
        print("Saved 07-new-true-full.png")

        # Check what's visible now
        cards = await page.query_selector_all(".sidebar-exercise-card")
        print(f"Sidebar cards: {len(cards)}")

        first_card = None
        for card in cards[:10]:
            box = await card.bounding_box()
            if box:
                print(f"  Card visible at: {box}")
                first_card = card
                break

        if first_card:
            # Take screenshot of the sidebar with cards visible
            sidebar_box = await first_card.bounding_box()
            # Get the full sidebar region
            await page.screenshot(
                path=f"{SAVE_DIR}/08-sidebar-cards-visible.png",
                clip={"x": max(0, sidebar_box["x"] - 10), "y": 0,
                      "width": sidebar_box["width"] + 20, "height": 900}
            )
            print("Saved 08-sidebar-cards-visible.png")

            # Zoom into first few cards
            cards_visible = []
            for card in cards:
                box = await card.bounding_box()
                if box:
                    cards_visible.append((card, box))
                if len(cards_visible) >= 4:
                    break

            if len(cards_visible) >= 2:
                first_box = cards_visible[0][1]
                last_box = cards_visible[-1][1]
                clip = {
                    "x": max(0, first_box["x"] - 5),
                    "y": max(0, first_box["y"] - 5),
                    "width": first_box["width"] + 10,
                    "height": (last_box["y"] + last_box["height"]) - first_box["y"] + 10
                }
                await page.screenshot(path=f"{SAVE_DIR}/09-cards-closeup.png", clip=clip)
                print(f"Saved 09-cards-closeup.png, clip: {clip}")

                # Get details on the heart and plus button sizes
                fav_btns = await page.query_selector_all(".sidebar-fav-btn")
                add_btns = await page.query_selector_all(".sidebar-add-btn")
                print(f"\nFav buttons: {len(fav_btns)}, Add buttons: {len(add_btns)}")

                for i, btn in enumerate(fav_btns[:3]):
                    box = await btn.bounding_box()
                    if box:
                        html = await page.evaluate("el => el.outerHTML", btn)
                        print(f"  Fav btn {i}: {box} | HTML: {html}")
                        break

                for i, btn in enumerate(add_btns[:3]):
                    box = await btn.bounding_box()
                    if box:
                        html = await page.evaluate("el => el.outerHTML", btn)
                        print(f"  Add btn {i}: {box} | HTML: {html}")
                        break

        await browser.close()
        print("\nDone!")

asyncio.run(take_screenshots())
