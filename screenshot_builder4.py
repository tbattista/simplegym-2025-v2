import asyncio
from playwright.async_api import async_playwright

SAVE_DIR = "C:/Users/user/iCloudDrive/PARA/1 - Projects/_Websites/simple gym log/simplegym_v2/screenshots"

async def take_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})

        print("Navigating...")
        await page.goto("http://localhost:8001/workout-builder.html?new=true", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)

        # Hover over first card to reveal buttons
        cards = await page.query_selector_all(".sidebar-exercise-card")
        print(f"Found {len(cards)} cards")

        visible_cards = []
        for card in cards:
            box = await card.bounding_box()
            if box:
                visible_cards.append((card, box))

        if visible_cards:
            first_card, first_box = visible_cards[0]
            print(f"First card box: {first_box}")

            # Force-show the action buttons by adding a CSS override
            await page.add_style_tag(content="""
                .sidebar-card-actions {
                    opacity: 1 !important;
                    visibility: visible !important;
                }
                .sidebar-fav-btn, .sidebar-add-btn {
                    opacity: 1 !important;
                    visibility: visible !important;
                }
            """)

            # Also try hover
            await first_card.hover()
            await page.wait_for_timeout(300)

            # Screenshot the first card
            await page.screenshot(
                path=f"{SAVE_DIR}/10-first-card-hover.png",
                clip={
                    "x": max(0, first_box["x"] - 5),
                    "y": max(0, first_box["y"] - 5),
                    "width": first_box["width"] + 10,
                    "height": first_box["height"] + 10
                }
            )
            print("Saved 10-first-card-hover.png")

            # Screenshot first 4 cards
            last_card, last_box = visible_cards[min(3, len(visible_cards)-1)]
            clip = {
                "x": max(0, first_box["x"] - 5),
                "y": max(0, first_box["y"] - 5),
                "width": first_box["width"] + 10,
                "height": (last_box["y"] + last_box["height"]) - first_box["y"] + 10
            }
            await page.screenshot(path=f"{SAVE_DIR}/11-first-4-cards-buttons-visible.png", clip=clip)
            print(f"Saved 11-first-4-cards-buttons-visible.png, clip: {clip}")

            # Check button sizes
            fav_btns = await page.query_selector_all(".sidebar-fav-btn")
            add_btns = await page.query_selector_all(".sidebar-add-btn")

            fav_box = None
            add_box = None

            for btn in fav_btns:
                box = await btn.bounding_box()
                if box:
                    fav_box = box
                    fav_html = await page.evaluate("el => el.outerHTML", btn)
                    # Get the icon inside
                    icon = await btn.query_selector("i")
                    if icon:
                        icon_box = await icon.bounding_box()
                        print(f"Heart icon element box: {icon_box}")
                    print(f"Fav button box: {box}")
                    print(f"Fav button HTML: {fav_html}")
                    break

            for btn in add_btns:
                box = await btn.bounding_box()
                if box:
                    add_box = box
                    add_html = await page.evaluate("el => el.outerHTML", btn)
                    # Get the icon inside
                    icon = await btn.query_selector("i")
                    if icon:
                        icon_box = await icon.bounding_box()
                        print(f"Plus icon element box: {icon_box}")
                    print(f"Add button box: {box}")
                    print(f"Add button HTML: {add_html}")
                    break

            # Screenshot zoomed into the action buttons area
            if fav_box and add_box:
                btn_clip = {
                    "x": max(0, fav_box["x"] - 5),
                    "y": max(0, fav_box["y"] - 5),
                    "width": (add_box["x"] + add_box["width"]) - fav_box["x"] + 10,
                    "height": max(fav_box["height"], add_box["height"]) + 10
                }
                await page.screenshot(path=f"{SAVE_DIR}/12-action-buttons-zoom.png", clip=btn_clip)
                print(f"Saved 12-action-buttons-zoom.png, clip: {btn_clip}")

            # Get computed CSS for the buttons
            fav_styles = await page.evaluate("""
                () => {
                    const btn = document.querySelector('.sidebar-fav-btn');
                    if (!btn) return null;
                    const cs = window.getComputedStyle(btn);
                    const icon = btn.querySelector('i');
                    const ics = icon ? window.getComputedStyle(icon) : null;
                    return {
                        btn: {
                            width: cs.width,
                            height: cs.height,
                            padding: cs.padding,
                            fontSize: cs.fontSize,
                        },
                        icon: ics ? {
                            fontSize: ics.fontSize,
                            width: ics.width,
                            height: ics.height,
                        } : null
                    };
                }
            """)
            print(f"\nFav button computed styles: {fav_styles}")

            add_styles = await page.evaluate("""
                () => {
                    const btn = document.querySelector('.sidebar-add-btn');
                    if (!btn) return null;
                    const cs = window.getComputedStyle(btn);
                    const icon = btn.querySelector('i');
                    const ics = icon ? window.getComputedStyle(icon) : null;
                    return {
                        btn: {
                            width: cs.width,
                            height: cs.height,
                            padding: cs.padding,
                            fontSize: cs.fontSize,
                        },
                        icon: ics ? {
                            fontSize: ics.fontSize,
                            width: ics.width,
                            height: ics.height,
                        } : null
                    };
                }
            """)
            print(f"Add button computed styles: {add_styles}")

        # Full page screenshot with buttons visible
        await page.screenshot(path=f"{SAVE_DIR}/13-full-with-buttons.png", full_page=True)
        print("Saved 13-full-with-buttons.png")

        await browser.close()
        print("\nDone!")

asyncio.run(take_screenshots())
