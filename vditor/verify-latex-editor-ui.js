/**
 * 验证公式编辑器 UI：工具栏图标是否被裁 + 编辑区公式是否居中。
 *
 * 病因（见 latexeasy.js setViewBox / mathjax-tex-svg.js 的 viewBox 拼装）：
 * SVG viewBox 的 min-x / min-y 允许为负，LatexEasy 与 MathJax 都靠负原点定位——
 * 前者用 (-w/2, -h/2) 居中画布，后者用负 min-y 放基线。之前的补丁把这两个值
 * clamp 成 >= 0，于是图标上半截被裁、公式钉在左上角。
 *
 * 用法：node vditor/verify-latex-editor-ui.js
 */
const path = require("path");
const puppeteer = require(path.join(__dirname, "..", "node_modules", "puppeteer-core"));

const CHROME = path.join(
    process.env.HOME,
    ".cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
);
const PAGE = "file://" + path.join(__dirname, "latexEditor", "latexEditor.html");

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: "new",
        args: ["--allow-file-access-from-files", "--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 880, height: 580, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
    await page.goto(PAGE, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForSelector(".kf-editor", { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    const report = await page.evaluate(() => {
        const parse = (el) => {
            const vb = el && el.getAttribute("viewBox");
            if (!vb) return null;
            const [x, y, w, h] = vb.trim().split(/\s+/).map(Number);
            return { x, y, w, h };
        };

        // 工具栏 / 面板图标：createIcon() 走 latexToSvg -> MathJax.tex2svg ->
        // svgToDataUrl，最终挂在 .kf-editor-ui-* 元素的 background-image 上（不是
        // <svg>/<img>，所以得从 computed style 里把 base64 抠出来）。min-y 必须为负——
        // MathJax 用它把基线放到正确位置，clamp 成 >= 0 会把字形上半截裁掉。
        //
        // 只查 MathJax 产出的图标：LatexEasy 里还混了一批手绘 iconfont SVG（眼睛、
        // 箭头等），它们的 viewBox 本来就是 "0 0 1024 1024"，min-y 为 0 完全正常，
        // 算进来会误报。MathJax v3 的输出带 data-mml-node 标记，用它区分。
        const icons = Array.from(document.querySelectorAll("*"))
            .map((el) => {
                const m = (getComputedStyle(el).backgroundImage || "").match(
                    /data:image\/svg\+xml;base64,([^"')]+)/
                );
                if (!m) return null;
                const raw = atob(m[1]);
                if (!raw.includes("data-mml-node")) return null;
                const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
                return parse(doc.documentElement);
            })
            .filter(Boolean);
        const clippedIcons = icons.filter((v) => v.y >= 0);

        // 画布：setCanvasToCenter 传 (-w/2, -h/2)，min-x / min-y 必须为负
        const canvas = document.querySelector(".kf-editor-canvas-container svg");
        const canvasVB = parse(canvas);
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;

        return {
            iconCount: icons.length,
            clippedIconCount: clippedIcons.length,
            sampleIcons: icons.slice(0, 3),
            canvasVB,
            canvasRect: canvasRect && {
                w: Math.round(canvasRect.width),
                h: Math.round(canvasRect.height),
            },
        };
    });

    console.log(JSON.stringify(report, null, 2));

    const ok =
        report.iconCount > 0 &&
        report.clippedIconCount === 0 &&
        report.canvasVB &&
        report.canvasVB.x < 0 &&
        report.canvasVB.y < 0;
    console.log(ok ? "\nPASS: 图标未被裁，画布 viewBox 已居中" : "\nFAIL");

    await page.screenshot({ path: path.join(__dirname, "latex-editor-ui.png") });
    await browser.close();
    process.exit(ok ? 0 : 1);
})();
