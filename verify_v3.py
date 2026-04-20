import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Go to app
        await page.goto("http://localhost:5173")
        await page.wait_for_timeout(2000)

        # 1. Onboarding - Step 1: Avatar
        await page.click("text=Female")
        await page.wait_for_timeout(500)
        await page.screenshot(path="v3_step1_avatar.png")
        await page.click("text=Confirm Identity")

        # 2. Onboarding - Step 2: Auth
        await page.fill("input[placeholder='Email Address']", "test@example.com")
        await page.fill("input[placeholder='Secret Password']", "password123")
        await page.screenshot(path="v3_step2_auth.png")
        await page.click("button:has-text('Create Aura')")
        await page.wait_for_timeout(1000)

        # 3. Onboarding - Step 3: Config
        await page.screenshot(path="v3_step3_config.png")
        await page.click("button:has-text('Construct Workspace')")
        await page.wait_for_timeout(2000)

        # 4. Dashboard
        await page.screenshot(path="v3_dashboard.png")

        # 5. Test Calendar Interactivity
        # Select day 25
        await page.click("button:has-text('25')")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="v3_dashboard_day25.png")

        # Add a task for day 25
        await page.fill("input[placeholder='Add a task...']", "Task for the 25th")
        await page.click("button:has(svg)") # Plus button
        await page.wait_for_timeout(500)
        await page.screenshot(path="v3_dashboard_task_added.png")

        # Switch back to today
        today = await page.evaluate("new Date().getDate()")
        await page.click(f"button:has-text('{today}')")
        await page.wait_for_timeout(500)
        await page.screenshot(path="v3_dashboard_back_to_today.png")

        await browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    os.chdir("verification")
    asyncio.run(run())
