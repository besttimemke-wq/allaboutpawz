// Make the UnLeashe logo background transparent (remove near-white pixels).
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src = path.join(__dirname, "..", "public", "unleashe-logo.png");
const tmp = path.join(__dirname, "..", "public", "unleashe-logo-tmp.png");

(async () => {
  const img = sharp(src);
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Near-white background → transparent. Threshold 238 keeps the navy
    // text and orange icon crisp while cutting the white field.
    if (r >= 238 && g >= 238 && b >= 238) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels } })
    .png()
    .toFile(tmp);

  fs.renameSync(tmp, src);
  console.log("Logo background made transparent:", src);
})();
