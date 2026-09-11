export const HUD = {
  width: 2380,
  height: 848,
  slots: {
    model: [164,220,436,426],
    passive: [752,221,170,175],
    q: [971,221,235,237],
    w: [1264,221,237,237],
    e: [1556,221,234,237],
    r: [1843,221,238,237]
  },
  bars: {
    hp: [755,568,1356,70],
    res: [764,648,1348,70]
  },
  texts: {
    level: { rect: [468,602,112,110], value: "18", fontSize: 64 }
  }
};

export function position(node, [x, y, width, height]) {
  Object.assign(node.style, {
    left: x / HUD.width * 100 + '%',
    top: y / HUD.height * 100 + '%',
    width: width / HUD.width * 100 + '%',
    height: height / HUD.height * 100 + '%'
  });
}

export function initHUDPositions() {
  Object.entries(HUD.slots).forEach(([key, rect]) => {
    const el = document.getElementById('u-' + key);
    if (el) position(el, rect);
  });
  Object.entries(HUD.bars).forEach(([key, rect]) => {
    const el = document.getElementById('u-' + key);
    if (el) position(el, rect);
  });
  const lvl = document.getElementById('o-lvl');
  if (lvl) position(lvl, HUD.texts.level.rect);
}

export function drawCover(ctx, image, [x, y, w, h]) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

export async function exportPNG(slots, resourceColour, frameElement, slotTasks) {
  const tasks = Array.from(slotTasks.values());
  await Promise.all(tasks);
  const frame = frameElement;
  if (!frame || !frame.naturalWidth) throw new Error('Frame not loaded');

  const canvas = document.createElement('canvas');
  canvas.width = HUD.width;
  canvas.height = HUD.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, HUD.width, HUD.height);
  ctx.fillStyle = '#1d8f45';
  ctx.fillRect(...HUD.bars.hp);
  ctx.fillStyle = resourceColour;
  ctx.fillRect(...HUD.bars.res);

  Object.keys(HUD.slots).forEach(key => {
    if (slots[key]?.asset?.image) {
      drawCover(ctx, slots[key].asset.image, HUD.slots[key]);
    }
  });

  ctx.drawImage(frame, 0, 0, HUD.width, HUD.height);

  const { rect: [x, y, w, h], fontSize, value } = HUD.texts.level;
  ctx.font = `700 ${fontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f0e6d2';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillText(value, x + w / 2, y + h / 2);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('PNG creation failed');
  return { blob, file: new File([blob], 'riftcrafter-build.png', { type: 'image/png' }) };
}
