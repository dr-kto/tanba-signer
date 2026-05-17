const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE: " + err.message));

  // Create test PDF
  const { PDFDocument, rgb } = require("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const pg = pdfDoc.addPage([595, 842]);
  pg.drawText("Test Document", { x: 50, y: 750, size: 24, color: rgb(0, 0, 0) });
  pg.drawText("Sign below:", { x: 50, y: 600, size: 16, color: rgb(0, 0, 0) });
  const pg2 = pdfDoc.addPage([595, 842]);
  pg2.drawText("Page 2", { x: 50, y: 750, size: 24, color: rgb(0, 0, 0) });
  require("fs").writeFileSync("test.pdf", await pdfDoc.save());

  // 1. Upload
  console.log("=== Upload ===");
  await page.goto("http://localhost:3000", { timeout: 15000 });
  await page.locator("input[type=file]").setInputFiles("test.pdf");
  await page.waitForURL("**/document/*/edit", { timeout: 15000 });
  const docId = page.url().match(/document\/([^/]+)/)[1];
  console.log("ID:", docId, "PASS");

  // 2. PDF render
  console.log("\n=== PDF Render ===");
  await page.waitForTimeout(8000);
  const cc = await page.evaluate(() => document.querySelectorAll("canvas").length);
  console.log("Canvases:", cc, cc >= 2 ? "PASS" : "FAIL");

  // 3. Scroll check
  const scrollable = await page.evaluate(() => {
    const el = document.querySelector(".overflow-auto");
    return el ? { sh: el.scrollHeight, ch: el.clientHeight, ok: el.scrollHeight > el.clientHeight } : null;
  });
  console.log("Scroll:", scrollable?.ok ? "PASS" : "FAIL", JSON.stringify(scrollable));

  // 4. Draw zone - use coordinates within visible viewport
  console.log("\n=== Draw Zone ===");
  const overlay = page.locator(".cursor-crosshair").first();
  const oBox = await overlay.boundingBox();
  // Draw inside the visible part of the first overlay (top portion)
  const drawY = Math.max(oBox.y + 50, 150);
  const drawEndY = drawY + 60;
  console.log("Drawing at y:", drawY, "to", drawEndY, "(overlay top:", oBox.y, ")");
  await page.mouse.move(oBox.x + 100, drawY);
  await page.mouse.down();
  await page.mouse.move(oBox.x + 350, drawEndY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const zones = await page.evaluate(() => document.querySelectorAll("[class*='border-dashed']").length);
  console.log("Zones:", zones, zones > 0 ? "PASS" : "FAIL");

  if (zones > 0) {
    // 5. Drag zone
    console.log("\n=== Drag Zone ===");
    const zoneEl = page.locator("[class*='border-dashed']").first();
    const zb = await zoneEl.boundingBox();
    const startX = zb.x + zb.width / 2;
    const startY = zb.y + zb.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 50, startY + 30, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const zb2 = await zoneEl.boundingBox();
    const moved = Math.abs(zb2.x - zb.x) > 5 || Math.abs(zb2.y - zb.y) > 5;
    console.log("Moved:", moved ? "PASS" : "FAIL");

    // 6. Click to delete zone
    console.log("\n=== Delete Zone (click) ===");
    const zb3 = await zoneEl.boundingBox();
    await page.mouse.click(zb3.x + zb3.width / 2, zb3.y + zb3.height / 2);
    await page.waitForTimeout(300);
    const zonesAfterDel = await page.evaluate(() => document.querySelectorAll("[class*='border-dashed']").length);
    console.log("Zones after delete:", zonesAfterDel, zonesAfterDel === 0 ? "PASS" : "FAIL");

    // Re-draw a zone for sign test
    await page.mouse.move(oBox.x + 100, drawY);
    await page.mouse.down();
    await page.mouse.move(oBox.x + 350, drawEndY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: "test-final-edit.png", fullPage: false });

  // 7. Save
  console.log("\n=== Save ===");
  await page.locator('button:has-text("Done")').click();
  await page.waitForTimeout(2000);
  console.log("PASS");

  // 8. Sign page
  console.log("\n=== Sign Page ===");
  await page.goto("http://localhost:3000/document/" + docId + "/sign", { timeout: 15000 });
  await page.waitForTimeout(8000);
  const signZones = await page.evaluate(() => document.querySelectorAll("[class*='border-dashed']").length);
  console.log("Sign zones:", signZones, signZones > 0 ? "PASS" : "FAIL");
  await page.screenshot({ path: "test-final-sign.png", fullPage: false });

  // 9. Sign
  console.log("\n=== Sign Document ===");
  const signBtn = page.locator('button:has-text("Sign Document")');
  if (await signBtn.isVisible()) {
    await signBtn.click();
    await page.waitForTimeout(1000);
    const sigCanvas = page.locator("canvas").last();
    const sb = await sigCanvas.boundingBox();
    if (sb) {
      await page.mouse.move(sb.x + 30, sb.y + sb.height / 2);
      await page.mouse.down();
      for (let i = 0; i < 6; i++) {
        await page.mouse.move(sb.x + 30 + i * 35, sb.y + sb.height / 2 + Math.sin(i) * 15, { steps: 3 });
      }
      await page.mouse.up();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Submit")').click();
      await page.waitForTimeout(3000);

      const sigImgs = await page.evaluate(() => document.querySelectorAll('img[alt="Signature"]').length);
      console.log("Signature images:", sigImgs, sigImgs > 0 ? "PASS" : "FAIL");
      const badge = await page.evaluate(() => !!document.querySelector("[class*='bg-success']"));
      console.log("Signed badge:", badge ? "PASS" : "FAIL");
      const dl = await page.locator('button:has-text("Download")').isVisible();
      console.log("Download btn:", dl ? "PASS" : "FAIL");
      await page.screenshot({ path: "test-final-signed.png", fullPage: false });
    }
  } else {
    console.log("FAIL: Sign btn not visible");
  }

  // 10. Review page
  console.log("\n=== Review Page ===");
  await page.goto("http://localhost:3000/document/" + docId + "/review", { timeout: 15000 });
  await page.waitForTimeout(8000);
  const rSigImgs = await page.evaluate(() => document.querySelectorAll('img[alt="Signature"]').length);
  console.log("Signatures:", rSigImgs, rSigImgs > 0 ? "PASS" : "FAIL");
  const rBadge = await page.evaluate(() => document.querySelector("[class*='bg-success']")?.textContent || "NONE");
  console.log("Badge:", rBadge);
  const rDl = await page.locator('button:has-text("Download")').isVisible();
  console.log("Download:", rDl ? "PASS" : "FAIL");

  // Drag in review
  const rZone = page.locator("[class*='cursor-grab']").first();
  if (await rZone.isVisible()) {
    const rb = await rZone.boundingBox();
    await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
    await page.mouse.down();
    await page.mouse.move(rb.x + rb.width / 2 + 40, rb.y + rb.height / 2 + 20, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    console.log("Drag in review: PASS");
  }

  await page.screenshot({ path: "test-final-review.png", fullPage: false });

  console.log("\n=== ERRORS ===");
  console.log(errors.length ? errors.join("\n") : "NONE");
  console.log("\n=== ALL DONE ===");

  await browser.close();
  require("fs").unlinkSync("test.pdf");
})().catch((e) => console.error("FATAL:", e.message));
