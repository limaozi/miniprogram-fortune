// index.js - 塔罗牌小游戏重写为小程序页面版
const { drawThreeCards, drawOneCard, drawFiveCardsCross, drawCelticCross } = require('./tarot-data.js');

// 通过 <canvas type="2d"> 获取 Canvas 与 Context
let canvas = null;
let ctx = null;

// Canvas 逻辑尺寸（动态获取，适配不同设备）
let canvasWidth = 375;  // 默认值，会在 onReady 中更新
let canvasHeight = 750; // 默认值，会在 onReady 中更新

// 运行时状态
let lastDraw = null;
let currentSpread = null;        // 'one' | 'three' | 'five' | 'celtic'
let menuButtons = [];
let lastSpread = null;           // 最近一次抽牌牌阵，用于高亮
let lastHoverKey = null;
let lastAnalysis = '';
let isLoading = false;           // 是否正在加载云函数结果
let loadingAnimationFrame = 0;   // 加载动画帧数（用于旋转）
let animationTimer = null;       // 动画定时器
let showSwipeHint = false;       // 是否显示滑动提示

// DeepSeek API 配置
const NVIDIA_DEEPSEEK_API_KEY = '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';
const DEEPSEEK_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// 常量 & 贴图信息
const SPREAD_HINTS = {
  one: '单张牌阵：获取当下的核心指引。',
  three: '三张牌阵：过去 / 现在 / 未来 的流动。',
  five: '五张十字：现状、挑战、过去、未来、建议。',
  celtic: '凯尔特十字（10张）：全面剖析关系与发展走向。'
};

let imagesEnabled = true;
const atlasPath = '/images/Tarot.png';
const atlasDataPath = '/images/tarot-atlas.json';
let atlasImage = null;
let framesById = {};
let atlasReady = false;

let CARD_WIDTH = 300;
let CARD_HEIGHT = 400;
let CARD_RATIO = 0.6;
const FONT_FAMILY = "'Palatino Linotype','Book Antiqua',Palatino,'Times New Roman',serif";
const TEXT_COLOR = '#ffffff';

// 解析 Deepseek 文本用的滚动文本框状态
let analysisLines = [];
let analysisLineHeight = 16;
let analysisTotalHeight = 0;
let analysisScroll = 0;
let analysisCacheText = '';
let isTouchingAnalysis = false;
let touchStartY = 0;
let touchStartScroll = 0;

// 分析框高度偏移（用于向上拖拽拉高分析框）
let boxHeightOffset = 0; // 正值表示高度增加
let isDraggingBox = false; // 是否正在拖拽分析框（而不是滚动内容）
let dragStartHeight = 0; // 开始拖拽时的分析框高度

// ----------------- 绘制 UI -----------------

function drawButtonArea() {
  if (!canvas || !ctx) return;
  // 只绘制黑色背景，不再绘制按钮和标题（按钮已移到HTML）
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

// ----------------- 贴图加载 -----------------

function loadAtlas() {
  if (!imagesEnabled || !canvas) return Promise.resolve();

  const loadImage = (src) => new Promise((resolve, reject) => {
    try {
      const img = canvas.createImage();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    } catch (e) {
      reject(e);
    }
  });

  const loadJson = (path) => new Promise((resolve, reject) => {
    try {
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath: path,
        encoding: 'utf-8',
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (e) {
            reject(e);
          }
        },
        fail: (err) => reject(err)
      });
    } catch (e) {
      reject(e);
    }
  });

  const normalizeAtlasJson = (data) => {
    const result = { frames: {} };
    if (!data) return result;

    if (data.frames && !Array.isArray(data.frames)) {
      const keys = Object.keys(data.frames);
      keys.forEach((name) => {
        const entry = data.frames[name] || {};
        const f = entry.frame || entry.textureRect || entry.rect || entry;
        let x = f.x != null ? f.x : (f[0] || 0);
        let y = f.y != null ? f.y : (f[1] || 0);
        let w = (f.w != null ? f.w : (f.width != null ? f.width : f[2])) || 0;
        let h = (f.h != null ? f.h : (f.height != null ? f.height : f[3])) || 0;
        const rotated = !!(entry.rotated || entry.rotate);
        w = CARD_WIDTH;
        h = CARD_HEIGHT;
        x = Math.round(x / CARD_WIDTH) * CARD_WIDTH;
        y = Math.round(y / CARD_HEIGHT) * CARD_HEIGHT;
        result.frames[name] = { x, y, w, h, rotated, name };
      });
      return result;
    }

    if (Array.isArray(data.frames)) {
      data.frames.forEach((entry) => {
        const name = entry.name || entry.filename || entry.n || '';
        const f = entry.frame || entry.rect || entry;
        let x = f.x != null ? f.x : 0;
        let y = f.y != null ? f.y : 0;
        let w = (f.w != null ? f.w : f.width) || 0;
        let h = (f.h != null ? f.h : f.height) || 0;
        const rotated = !!(entry.rotated || entry.rotate);
        w = CARD_WIDTH;
        h = CARD_HEIGHT;
        x = Math.round(x / CARD_WIDTH) * CARD_WIDTH;
        y = Math.round(y / CARD_HEIGHT) * CARD_HEIGHT;
        if (name) result.frames[name] = { x, y, w, h, rotated, name };
      });
      return result;
    }

    return result;
  };

  const buildFramesById = (atlas) => {
    const result = {};
    if (!atlas || !atlas.frames) return result;
    const idToKeywords = {
      0: ['fool'],
      1: ['magician'],
      2: ['highpriestess', 'priestess'],
      3: ['empress'],
      4: ['emperor'],
      5: ['hierophant', 'pope'],
      6: ['lovers', 'lover'],
      7: ['chariot'],
      8: ['strength'],
      9: ['hermit'],
      10: ['wheel', 'fortune'],
      11: ['justice'],
      12: ['hanged'],
      13: ['death'],
      14: ['temperance'],
      15: ['devil'],
      16: ['tower'],
      17: ['star'],
      18: ['moon'],
      19: ['sun'],
      20: ['judgement', 'judgment'],
      21: ['world']
    };

    const keys = Object.keys(atlas.frames);
    const lowerNameMap = keys.map(k => ({ k, lower: k.toLowerCase() }));

    for (let id = 0; id <= 21; id++) {
      const keywords = idToKeywords[id];
      let picked = null;
      if (keywords) {
        picked = lowerNameMap.find(item => keywords.some(word => item.lower.includes(word)));
      }
      if (!picked) {
        const byNum = lowerNameMap.find(item => item.lower.match(new RegExp(`[^0-9]${id}[^0-9]`)) || item.lower.endsWith(`${id}`));
        if (byNum) picked = byNum;
      }
      if (picked) {
        result[id] = atlas.frames[picked.k];
      }
    }
    return result;
  };

  return Promise.all([loadImage(atlasPath), loadJson(atlasDataPath)])
    .then(([img, json]) => {
      atlasImage = img;
      const atlasData = normalizeAtlasJson(json);
      framesById = buildFramesById(atlasData);
      atlasReady = true;
    });
}

// ----------------- 画牌 -----------------

function drawCardFromAtlas(cardId, x, y, width, height) {
  if (!canvas || !ctx) return;
  if (!atlasImage || !framesById) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#444444';
    ctx.strokeRect(x, y, width, height);
    return;
  }
  const frame = framesById[cardId];
  if (!frame) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#444444';
    ctx.strokeRect(x, y, width, height);
    return;
  }
  //console.log("the width is ", width, "the height is", height);
  //console.log("the frame width is ", frame.w, "the frame height is", frame.h);
  ctx.drawImage(
    atlasImage,
    frame.x, frame.y, frame.w, frame.h,
    x, y, width, height
  );
}

function drawCardFromAtlasRotated(cardId, x, y, width, height, rotationRad) {
  if (!canvas || !ctx) return;
  if (!atlasImage || !framesById) return;
  const frame = framesById[cardId];
  if (!frame) return;
  const cx = x + Math.floor(width / 2);
  const cy = y + Math.floor(height / 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotationRad);
  ctx.drawImage(
    atlasImage,
    frame.x, frame.y, frame.w, frame.h,
    -Math.floor(width / 2), -Math.floor(height / 2), width, height
  );
  ctx.restore();
}

function drawCardCell(item, x, y, cardWidth, cardHeight, wrapWidth, rotationRad) {
  if (!canvas || !ctx) return;

  if (imagesEnabled && atlasReady) {
    if (rotationRad && Math.abs(rotationRad) > 1e-3) {
      drawCardFromAtlasRotated(item.card.id, x, y, cardWidth, cardHeight, rotationRad);
    } else if (item.reversed) {
      drawCardFromAtlasRotated(item.card.id, x, y, cardWidth, cardHeight, Math.PI);
    } else {
      drawCardFromAtlas(item.card.id, x, y, cardWidth, cardHeight);
    }
  } else {
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, y, cardWidth, cardHeight);
    ctx.strokeStyle = '#444444';
    ctx.strokeRect(x, y, cardWidth, cardHeight);
  }

  const textX = x;
  const textY = y + cardHeight * 1.1;
  const textY_R  = y + cardWidth * 1.2
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `14px ${FONT_FAMILY}`;
  const positionLabel = item.reversed ? '逆位' : '正位';
  if (rotationRad && Math.abs(rotationRad) > 1e-3) {   
    ctx.fillText(`${item.card.nameZh} - ${positionLabel}`, textX, textY_R);
  } 
  else{
    ctx.fillText(`${item.card.nameZh} - ${positionLabel}`, textX, textY);
  }
}

function layoutAndRenderResult(result) {
  if (!canvas || !ctx || !result) return;

  // 响应式尺寸
  const padding = Math.max(12, Math.floor(canvasWidth * 0.037)); // 约 3.7% 宽度，最小 12px
  // 菜单高度大约为 280-300px (rpx转换为px后)，调整top值以在菜单下方开始绘制
  // 减少菜单高度计算，让卡片更靠上
  const menuHeight = Math.max(50, Math.floor(canvasHeight * 0.1)); // 菜单区域高度（减少）
  const top = menuHeight + Math.max(10, Math.floor(canvasHeight * 0.02)); // 菜单下方留较少间距
  const bottomReserved = Math.max(100, Math.floor(canvasHeight * 0.08)); // 减少底部预留空间
  const availableHeight = canvasHeight - top - bottomReserved;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (currentSpread === 'one') {
    const cardH = Math.min(availableHeight * 0.75, 280);
    const cardW = Math.floor(cardH * (CARD_WIDTH / CARD_HEIGHT));
    const x = Math.floor((canvasWidth - cardW) / 2);
    const y = top + Math.floor((availableHeight - cardH) / 5); // Move cards higher
    drawCardCell(result[0], x, y, cardW, cardH, canvasWidth - padding * 2);
    return;
  }

  if (currentSpread === 'three') {
    const cols = 3;
    const gap = 12;
    const cardH = Math.min(availableHeight * 0.7, 150);
    const cardW = Math.floor(cardH * (CARD_WIDTH / CARD_HEIGHT));
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = Math.max(padding, Math.floor((canvasWidth - totalW) / 2));
    const y = top + Math.floor((availableHeight - cardH) / 5); // Move cards higher
    result.forEach((item, idx) => {
      const x = startX + idx * (cardW + gap);
      drawCardCell(item, x, y, cardW, cardH, cardW);
    });
    return;
  }

  if (currentSpread === 'five') {
    const ratio = CARD_WIDTH / CARD_HEIGHT;
    let cardH = Math.min(availableHeight * 0.4, 180);
    let cardW = Math.floor(cardH * ratio);
    let gap = Math.max(30, Math.floor(cardW * 0.18));

    const maxRowWidth = canvasWidth - padding * 2;
    const totalRow = 3 * cardW + 2 * gap;
    if (totalRow > maxRowWidth) {
      const scale = maxRowWidth / totalRow;
      cardW = Math.max(70, Math.floor(cardW * scale));
      cardH = Math.max(90, Math.floor(cardW / ratio));
      gap = Math.max(10, Math.floor(gap * scale));
    }

    const cx = Math.floor(canvasWidth / 2);
    const cy = top + Math.floor(availableHeight / 2.5); // Move cards higher
    const centerX0 = cx - Math.floor(cardW / 2);
    const centerY0 = cy - Math.floor(cardH / 2);

    const positions = [
      { x: centerX0, y: centerY0 },
      { x: centerX0 - gap - cardW, y: centerY0 },
      { x: centerX0 + cardW + gap, y: centerY0 },
      { x: centerX0, y: centerY0 - gap - cardH },
      { x: centerX0, y: centerY0 + cardH + gap }
    ];
    for (let i = 0; i < Math.min(5, result.length); i++) {
      const p = positions[i];
      drawCardCell(result[i], p.x, p.y, cardW, cardH, cardW);
    }
    return;
  }

  if (currentSpread === 'celtic') {
    const ratio = CARD_WIDTH / CARD_HEIGHT;
    let cardH = Math.min(availableHeight * 0.4, 180);
    let cardW = Math.floor(cardH * ratio);
    let gap = Math.max(20, Math.floor(cardW * 0.2));
    let stackGap = Math.max(18, Math.floor(cardH * 0.15));

    const maxWidth = canvasWidth - padding * 3;
    const maxHeight = availableHeight;

    // 计算十字部分的宽度（3张牌 + 2个间距）
    const crossWidth = 3 * cardW + 2 * gap;
    // 计算右侧列的高度（4张牌 + 3个间距）
    const rightColHeight = 4 * cardH + 3 * stackGap;
    // 总宽度：十字宽度 + 右侧列宽度 + 间距
    let totalW = crossWidth + cardW + gap * 2;
    let totalRightH = rightColHeight;

    // 缩放以适应屏幕
    const scaleW = totalW > maxWidth ? maxWidth / totalW : 1;
    const scaleH = totalRightH > maxHeight ? maxHeight / totalRightH : 1;
    const scale = Math.min(scaleW, scaleH);
    if (scale < 1) {
      cardW = Math.max(50, Math.floor(cardW * scale));
      cardH = Math.max(70, Math.floor(cardH * scale));
      gap = Math.max(20, Math.floor(gap * scale));
      stackGap = Math.max(25, Math.floor(stackGap * scale));
      // 重新计算尺寸
      totalW = (3 * cardW + 2 * gap) + cardW + gap * 2;
      totalRightH = 4 * cardH + 3 * stackGap;
    }

    // 居中布局：整个布局在屏幕中央
    // 计算整个布局的起始位置，确保居中
    const layoutLeft = Math.floor((canvasWidth - totalW) / 2);
    const leftX = layoutLeft;
    const centerX = leftX + cardW + gap;
    const rightX = centerX + cardW + gap;
    const rightColX = rightX + gap + cardW + gap;

    // 垂直居中：十字部分在可用区域中央，但更靠上
    const crossCY = top + Math.floor(availableHeight / 2.2); // Move cards higher
    const cx0 = centerX;
    const cy0 = crossCY - Math.floor(cardH / 2);

    const pos = [];
    pos[0] = { x: cx0, y: cy0, r: 0 };
    pos[1] = { x: cx0, y: cy0 - cardH * 2.3, r: Math.PI / 2 };
    pos[2] = { x: cx0, y: cy0 + cardH + gap, r: 0 };
    pos[3] = { x: leftX, y: cy0, r: 0 };
    pos[4] = { x: cx0, y: cy0 - cardH - gap, r: 0 };
    pos[5] = { x: rightX, y: cy0, r: 0 };

    const rightTop = top - Math.floor(cardH / 2); // Move cards higher
    pos[6] = { x: rightColX, y: rightTop + 0 * (cardH + stackGap), r: 0 };
    pos[7] = { x: rightColX, y: rightTop + 1 * (cardH + stackGap), r: 0 };
    pos[8] = { x: rightColX, y: rightTop + 2 * (cardH + stackGap), r: 0 };
    pos[9] = { x: rightColX, y: rightTop + 3 * (cardH + stackGap), r: 0 };

    for (let i = 0; i < Math.min(10, result.length); i++) {
      const p = pos[i];
      drawCardCell(result[i], p.x, p.y, cardW, cardH, cardW, p.r || 0);
    }
  }
}

// ----------------- 解析文本滚动框 -----------------

function rebuildAnalysisLines(text, maxWidth) {
  if (!canvas || !ctx) return;
  // 响应式行高：根据屏幕宽度动态调整
  const fontSize = Math.max(12, Math.floor(canvasWidth * 0.037)); // 约 3.7% 宽度，最小 12px
  analysisLineHeight = fontSize;
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  const chars = (text || '').split('');
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const test = line + ch;
    if (ch === '\n') {
      lines.push(line);
      line = '';
    } else if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  analysisLines = lines;
  analysisTotalHeight = Math.max(0, lines.length * analysisLineHeight);
}

function clampAnalysisScroll(visibleH) {
  const maxScroll = Math.max(0, analysisTotalHeight - visibleH);
  if (analysisScroll < 0) analysisScroll = 0;
  if (analysisScroll > maxScroll) analysisScroll = maxScroll;
}

function renderAnalysisBox(text) {
  if (!canvas || !ctx) return;
  const padding = Math.max(12, Math.floor(canvasWidth * 0.037)); // 约 3.7% 宽度，最小 12px
  const boxW = canvasWidth - padding * 2;
  // 基础高度：根据屏幕高度动态调整
  const baseBoxH = Math.min(Math.floor(canvasHeight * 0.4), Math.floor(canvasHeight / 2));
  // 最大高度：不超过屏幕的 80%，最小高度为基础高度
  const maxBoxH = Math.floor(canvasHeight * 0.8);
  const minBoxH = baseBoxH;
  // 限制高度偏移范围
  const maxHeightOffset = maxBoxH - baseBoxH;
  const minHeightOffset = 0;
  boxHeightOffset = Math.max(minHeightOffset, Math.min(maxHeightOffset, boxHeightOffset));
  // 实际高度 = 基础高度 + 高度偏移
  const boxH = baseBoxH + boxHeightOffset;
  const boxX = padding;
  // Y 位置：始终在底部，根据实际高度计算
  const boxY = canvasHeight - boxH - padding;

  if (text !== analysisCacheText || boxW !== (analysisLines._lastWidth || 0)) {
    rebuildAnalysisLines(text, Math.max(8, boxW - 24));
    analysisLines._lastWidth = boxW;
    analysisCacheText = text;
    clampAnalysisScroll(boxH - 16);
    console.log('[renderAnalysisBox] 文本重建:', {
      textLength: text.length,
      linesCount: analysisLines.length,
      totalHeight: analysisTotalHeight,
      visibleH: boxH - 16,
      scroll: analysisScroll
    });
  }

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(boxX + 8, boxY + 8, boxW - 16, boxH - 16);
  ctx.clip();

  ctx.fillStyle = TEXT_COLOR;
  const fontHeight = analysisLineHeight - 2;
  ctx.font = `${fontHeight}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let y = boxY + 8 - analysisScroll;
  const left = boxX + 8;
  const bottom = boxY + boxH - 8;
  for (let i = 0; i < analysisLines.length; i++) {
    if (y + analysisLineHeight >= boxY + 8 && y <= bottom) {
      ctx.fillText(analysisLines[i], left, y);
    }
    y += analysisLineHeight;
    if (y > bottom) break;
  }
  ctx.restore();

  // 绘制拖拽手柄（顶部中央的小手图标）
  const handleWidth = 50; // 增大拖拽区域，更容易点击
  const handleHeight = 20; // 增大拖拽区域高度
  const handleX = boxX + (boxW - handleWidth) / 2;
  const handleY = boxY;
  // 拖拽手柄背景（半透明，便于识别）
  ctx.fillStyle = isDraggingBox ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
  ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
  // 绘制三个小圆点表示拖拽手柄
  const dotRadius = 3; // 稍微增大圆点
  const dotSpacing = 10;
  const dotStartX = handleX + handleWidth / 2 - dotSpacing;
  const dotY = handleY + handleHeight / 2;
  ctx.fillStyle = isDraggingBox ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(dotStartX + i * dotSpacing, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 保存拖拽手柄区域信息
  const handleInfo = {
    x: handleX,
    y: handleY,
    w: handleWidth,
    h: handleHeight
  };

  // 绘制滚动条（右侧）
  const contentH = analysisTotalHeight;
  const visibleH = boxH - 16;
  let scrollbarInfo = null;
  if (contentH > visibleH) {
    const trackW = 10; // 增加滚动条宽度使其更明显
    const trackX = boxX + boxW - trackW - 8;
    const trackY = boxY + 8;
    const trackH = visibleH;
    
    // 滚动条轨道（更明显的背景）
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(trackX, trackY, trackW, trackH);
    // 滚动条轨道边框
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(trackX, trackY, trackW, trackH);

    // 滚动条滑块
    const thumbH = Math.max(30, Math.floor(trackH * (visibleH / contentH)));
    const maxScroll = contentH - visibleH;
    const thumbY = trackY + Math.floor((analysisScroll / Math.max(1, maxScroll)) * (trackH - thumbH));
    
    // 滑块主体
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(trackX + 1, thumbY, trackW - 2, thumbH);
    // 滑块边框
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(trackX + 1, thumbY, trackW - 2, thumbH);
    
    // 滑块内部装饰线
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const lineX = trackX + trackW / 2;
    ctx.fillRect(lineX - 1, thumbY + 4, 2, thumbH - 8);
    
    // 保存滚动条信息用于点击检测
    scrollbarInfo = {
      trackX, trackY, trackW, trackH,
      thumbY, thumbH,
      contentH, visibleH, maxScroll
    };
    
    console.log('[renderAnalysisBox] 滚动条信息:', {
      trackX, trackY, trackW, trackH,
      thumbY, thumbH,
      contentH, visibleH, maxScroll,
      currentScroll: analysisScroll
    });
  }

  renderAnalysisBox._box = { 
    x: boxX, y: boxY, w: boxW, h: boxH,
    scrollbar: scrollbarInfo,
    handle: handleInfo, // 拖拽手柄区域
    baseH: baseBoxH, // 基础高度
    heightOffset: boxHeightOffset // 高度偏移
  };
  
  console.log('[renderAnalysisBox] 分析框区域:', {
    x: boxX, y: boxY, w: boxW, h: boxH,
    baseH: baseBoxH,
    heightOffset: boxHeightOffset,
    hasScrollbar: !!scrollbarInfo,
    handleArea: handleInfo
  });
}

// ----------------- 总渲染入口 -----------------

function render() {
  if (!canvas || !ctx) return;
  // Clear canvas before drawing
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  // Remove drawButtonArea() - let WXML handle the background
  if (lastDraw) {
    layoutAndRenderResult(lastDraw);
  }
  // 不再在 canvas 上渲染分析框，改为显示提示文字
  // 如果正在加载，绘制加载动画
  if (isLoading) {
    //drawLoadingSpinner();
  }
  // 如果解析已返回，绘制提示文字
  if (lastAnalysis && !isLoading) {
    //drawSwipeHint();
    console.log("Analysis return!")
  }
}

// 绘制滑动提示文字
function drawSwipeHint() {
  if (!canvas || !ctx) return;
  
  // 在菜单下方绘制提示文字
  const padding = Math.max(12, Math.floor(canvasWidth * 0.037));
  const hintY = canvasHeight - 200; // 菜单下方位置
  const hintText = '← 向左滑动，看解析';
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = `18px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hintText, canvasWidth / 2, hintY);
}

// 绘制简洁的加载旋转动画
function drawLoadingSpinner() {
  if (!canvas || !ctx) return;
  
  // 在分析框位置显示加载动画
  const padding = Math.max(10, Math.floor(canvasWidth * 0.037));
  const boxW = canvasWidth - padding * 2;
  const baseBoxH = Math.min(Math.floor(canvasHeight * 0.4), Math.floor(canvasHeight / 2));
  const boxH = baseBoxH + boxHeightOffset; // 使用实际高度
  const boxX = padding;
  const boxY = canvasHeight - boxH - padding; // 根据实际高度计算 Y 位置
  
  // 计算中心位置
  const centerX = boxX + boxW / 2;
  const centerY = boxY + boxH / 2;
  const radius = Math.min(20, Math.floor(boxW * 0.05)); // 旋转圆半径
  
  ctx.save();
  
  // 绘制旋转的圆环（简洁的单色圆环）
  const angle = (loadingAnimationFrame * 0.15) % (Math.PI * 2); // 旋转角度，0.15 控制速度
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  
  // 绘制一个不完整的圆环（270度弧，留一个缺口）
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, angle, angle + Math.PI * 1.5, false);
  ctx.stroke();
  
  ctx.restore();
  
  // 更新动画帧
  loadingAnimationFrame++;
  
  // 如果还在加载，继续动画（使用 requestAnimationFrame 或 setTimeout）
  if (isLoading) {
    if (animationTimer) {
      clearTimeout(animationTimer);
    }
    // 使用 wx.requestAnimationFrame 如果可用，否则使用 setTimeout
    if (typeof wx !== 'undefined' && wx.requestAnimationFrame) {
      const frameId = wx.requestAnimationFrame(() => {
        render();
      });
      animationTimer = frameId;
    } else {
      animationTimer = setTimeout(() => {
        render();
      }, 16); // 约 60fps
    }
  }
}

// ----------------- 抽牌 & 云函数 -----------------

function createDetailedPrompt(cards) {
  return cards.map((card, index) => {
    return `Card ${index + 1}: ${card.name} (${card.nameZh}) - ${card.reversed ? '逆位 Reversed' : '正位 Upright'}`;
  }).join('\n');
}

function callDeepseek(spreadKey, drawResult) {
  const cardsdraw = (drawResult || []).map(item => ({
    id: item.card.id,
    name: item.card.name,
    nameZh: item.card.nameZh,
    reversed: !!item.reversed
  }));
  const prompt = 'Give me a explanation in Chinese of those tarots, make it encouraging, with some breaks and emoji , and more like human-being words:\n ' + createDetailedPrompt(cardsdraw);
  
  console.log('[callDeepseek] 请求参数:', { spread: spreadKey, prompt });
  
  return new Promise((resolve, reject) => {
    try {
      if (!wx || !wx.request) {
        resolve('小程序环境不支持，无法生成解析');
        return;
      }

      wx.request({
        url: DEEPSEEK_API_URL,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${NVIDIA_DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'deepseek-ai/deepseek-r1',
          messages: [
            { role: 'system', content: prompt }
          ],
          temperature: 0.6,
          top_p: 0.7,
          max_tokens: 4096,
          stream: false  // 小程序不支持流式响应，使用非流式
        },
        success: (res) => {
          console.log('[callDeepseek] API 响应:', res);
          if (res.statusCode === 200 && res.data) {
            const content = res.data.choices?.[0]?.message?.content || '';
            if (content) {
              resolve(content);
            } else {
              console.error('[callDeepseek] 响应中没有内容:', res.data);
              resolve('API 返回数据格式异常，无法生成解析');
            }
          } else {
            console.error('[callDeepseek] API 请求失败:', res.statusCode, res.data);
            resolve(`API 请求失败 (状态码: ${res.statusCode})`);
          }
        },
        fail: (err) => {
          console.error('[callDeepseek] 请求失败:', err);
          resolve('网络请求失败，无法生成解析');
        }
      });
    } catch (e) {
      console.error('[callDeepseek] 调用出错:', e);
      resolve('调用出错，无法生成解析');
    }
  });
}

function handleTap(x, y) {
  // 按钮点击现在通过HTML按钮处理，这里不再处理菜单按钮点击
  // 保留此函数以防将来需要处理canvas上的其他点击
}

// ----------------- 小程序页面封装 -----------------

Page({
  data: {
    currentPage: 0, // 当前页面索引：0=抽卡页，1=解析页
    showSwipeHint: false, // 是否显示滑动提示
    analysisText: '', // 解析文本
    scrollViewHeight: 0, // scroll-view 的高度（rpx）
    selectedSpread: null, // 当前选中的牌阵
    isLoading: false, // 是否正在加载
    loadingText: '正在生成解析...' // 加载提示文字
  },
  
  // 计算并设置 scroll-view 的高度
  updateScrollViewHeight() {
    const sys = wx.getSystemInfoSync();
    const windowHeight = sys.windowHeight || 667;
    const rpxRatio = 750 / sys.windowWidth; // rpx 转换比例
    // 计算可用高度：窗口高度 - 头部高度(约 200rpx) - padding(约 80rpx) - 按钮区域(约 280rpx)
    const headerHeight = 200; // rpx
    const padding = 80; // rpx
    const buttonArea = 280; // rpx (按钮高度 + gap + padding)
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - padding - buttonArea;
    
    this.setData({
      scrollViewHeight: Math.max(300, scrollViewHeightRpx) // 最小高度 300rpx
    });
    
    console.log('[updateScrollViewHeight] 设置 scroll-view 高度:', {
      windowHeight,
      rpxRatio,
      scrollViewHeightRpx: this.data.scrollViewHeight
    });
  },
  
  // 滑动切换页面
  onSwiperChange(e) {
    const current = e.detail.current;
    this.setData({
      currentPage: current,
      showSwipeHint: false // 切换页面后隐藏提示
    });
    console.log('[onSwiperChange] 切换到页面:', current);
    
    // 如果切换到解析页面，更新 scroll-view 高度
    if (current === 1) {
      this.updateScrollViewHeight();
    }
    
    // 如果切换回抽卡页面，重新渲染
    if (current === 0) {
      render();
    }
  },

  onReady() {
    const sys = wx.getSystemInfoSync();
    console.log('[onReady] 系统信息:', {
      windowWidth: sys.windowWidth,
      windowHeight: sys.windowHeight,
      pixelRatio: sys.pixelRatio,
      screenWidth: sys.screenWidth,
      screenHeight: sys.screenHeight
    });

    // 先获取 canvas 节点
    const query = wx.createSelectorQuery();
    query
      .select('#tarotCanvas')
      .boundingClientRect()
      .exec((res) => {
        const rect = res && res[0];
        if (!rect) {
          console.error('无法获取 canvas 尺寸');
          return;
        }
        
        // 再次查询获取node
        const query2 = wx.createSelectorQuery();
        query2
          .select('#tarotCanvas')
          .node()
          .exec((res2) => {
            const canvasNode = res2 && res2[0] && res2[0].node;
            
            if (!canvasNode) {
              console.error('无法获取 canvas 节点');
              return;
            }
            
            canvas = canvasNode;
            ctx = canvas.getContext('2d');

            // 使用canvas的实际显示尺寸（px单位，不是rpx）
            canvasWidth = rect.width || sys.windowWidth || 375;
            canvasHeight = rect.height || sys.windowHeight || 667;
            console.log('[onReady] Canvas 显示尺寸:', { canvasWidth, canvasHeight });
            
            const dpr = sys.pixelRatio || 1;
            // 设置canvas的物理尺寸（像素）
            canvas.width = canvasWidth * dpr;
            canvas.height = canvasHeight * dpr;
            // 缩放context以匹配逻辑尺寸
            ctx.scale(dpr, dpr);
            
            console.log('[onReady] Canvas 设置:', {
              logicalSize: { width: canvasWidth, height: canvasHeight },
              physicalSize: { width: canvas.width, height: canvas.height },
              dpr,
              displaySize: { width: rect.width, height: rect.height }
            });

            loadAtlas()
              .catch(err => {
                console.log('Atlas 加载失败：', err);
              })
              .finally(() => {
                render();
              });
          });
      });
    
    // 初始化 scroll-view 高度
    this.updateScrollViewHeight();
  },

  // 触摸开始：判断是否落在解析框中，用于滚动
  onCanvasTouchStart(e) {
    console.log('[TouchStart] 原始事件:', e);
    console.log('[TouchStart] e.detail:', e.detail);
    console.log('[TouchStart] e.touches:', e.touches);
    
    // 小程序 canvas 2d 触摸事件坐标获取
    // 优先使用 e.detail，如果没有则使用 e.touches[0]
    let x, y;
    if (e.detail && e.detail.x !== undefined) {
      x = e.detail.x;
      y = e.detail.y;
      console.log('[TouchStart] 使用 e.detail 坐标:', x, y);
    } else if (e.touches && e.touches[0]) {
      x = e.touches[0].x;
      y = e.touches[0].y;
      console.log('[TouchStart] 使用 e.touches[0] 坐标:', x, y);
    } else {
      console.log('[TouchStart] 无法获取坐标，事件对象:', e);
      return;
    }
    
    if (x === undefined || y === undefined) {
      console.log('[TouchStart] 坐标无效:', { x, y });
      return;
    }
    
    const box = renderAnalysisBox._box;
    if (!box) {
      console.log('[TouchStart] 分析框未初始化');
      return;
    }
    
    console.log('[TouchStart] 触摸坐标:', { x, y });
    console.log('[TouchStart] 分析框区域:', { x: box.x, y: box.y, w: box.w, h: box.h });
    
    // 优先检查是否点击拖拽手柄（三个点）
    if (box.handle) {
      const handle = box.handle;
      console.log('[TouchStart] 拖拽手柄区域:', {
        x: handle.x, y: handle.y, w: handle.w, h: handle.h
      });
      
      if (x >= handle.x && x <= handle.x + handle.w && 
          y >= handle.y && y <= handle.y + handle.h) {
        console.log('[TouchStart] 点击拖拽手柄，开始拖拽拉高分析框');
        isDraggingBox = true;
        dragStartHeight = box.h; // 记录开始拖拽时的高度
        touchStartY = y;
        return;
      }
    }
    
    // 检查是否点击滚动条
    if (box.scrollbar) {
      const sb = box.scrollbar;
      console.log('[TouchStart] 滚动条区域:', {
        trackX: sb.trackX, trackY: sb.trackY,
        trackW: sb.trackW, trackH: sb.trackH
      });
      
      if (x >= sb.trackX && x <= sb.trackX + sb.trackW && 
          y >= sb.trackY && y <= sb.trackY + sb.trackH) {
        console.log('[TouchStart] 点击滚动条，跳转位置');
        // 点击滚动条：跳转到对应位置
        const relativeY = y - sb.trackY;
        const scrollRatio = relativeY / sb.trackH;
        analysisScroll = Math.min(sb.maxScroll, Math.max(0, scrollRatio * sb.maxScroll));
        console.log('[TouchStart] 滚动位置:', {
          relativeY, scrollRatio, analysisScroll, maxScroll: sb.maxScroll
        });
        clampAnalysisScroll(sb.visibleH);
        render();
        return;
      }
    }
    
    // 检查是否在分析框内（用于拖拽滚动内容）
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
      console.log('[TouchStart] 在分析框内，开始拖拽滚动内容');
      isTouchingAnalysis = true;
      touchStartY = y;
      touchStartScroll = analysisScroll;
      console.log('[TouchStart] 拖拽状态:', {
        isTouchingAnalysis, touchStartY, touchStartScroll, currentScroll: analysisScroll
      });
    } else {
      console.log('[TouchStart] 不在分析框内');
    }
  },

  // 触摸移动：菜单 hover + 解析框滚动 + 分析框拖拽
  onCanvasTouchMove(e) {
    // 小程序 canvas 2d 触摸事件坐标获取
    let x, y;
    if (e.detail && e.detail.x !== undefined) {
      x = e.detail.x;
      y = e.detail.y;
    } else if (e.touches && e.touches[0]) {
      x = e.touches[0].x;
      y = e.touches[0].y;
    } else {
      return;
    }
    
    if (x === undefined || y === undefined) return;

    // 菜单 hover 检测
    let hover = null;
    for (let i = 0; i < menuButtons.length; i++) {
      const b = menuButtons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        hover = b.key;
        break;
      }
    }
    if (hover !== lastHoverKey) {
      console.log('[TouchMove] 菜单 hover 变化:', { from: lastHoverKey, to: hover });
      lastHoverKey = hover;
      render();
    }

    // 拖拽分析框（通过手柄拉高）
    if (isDraggingBox) {
      const dy = y - touchStartY;
      const box = renderAnalysisBox._box;
      if (box && box.baseH !== undefined) {
        // 向上拖拽时 dy 为负，高度应该增加（boxHeightOffset 增加）
        // 所以需要取反：向上拖拽 = 负 dy = 正高度偏移
        const newHeightOffset = boxHeightOffset - dy;
        const maxHeightOffset = Math.floor(canvasHeight * 0.8) - box.baseH;
        boxHeightOffset = Math.max(0, Math.min(maxHeightOffset, newHeightOffset));
        console.log('[TouchMove] 拖拽拉高分析框:', {
          touchY: y, touchStartY, dy,
          oldHeightOffset: boxHeightOffset + dy, newHeightOffset: boxHeightOffset,
          baseH: box.baseH, maxHeightOffset,
          newHeight: box.baseH + boxHeightOffset
        });
        render();
      }
      return;
    }

    // 分析框内容滚动（在分析框内拖拽）
    if (isTouchingAnalysis) {
      const dy = y - touchStartY;
      const box = renderAnalysisBox._box;
      const oldScroll = analysisScroll;
      
      if (box && box.scrollbar) {
        analysisScroll = touchStartScroll - dy;
        clampAnalysisScroll(box.scrollbar.visibleH);
      } else {
        analysisScroll = touchStartScroll - dy;
        clampAnalysisScroll((box && box.h ? box.h - 16 : Math.floor(canvasHeight / 3)));
      }
      
      if (oldScroll !== analysisScroll) {
        console.log('[TouchMove] 滚动更新:', {
          touchY: y, touchStartY, dy,
          oldScroll, newScroll: analysisScroll,
          touchStartScroll
        });
      }
      render();
    }
  },

  // 触摸结束：如果不是在拖动解析框，则视为点击
  onCanvasTouchEnd(e) {
    console.log('[TouchEnd] 原始事件:', e);
    
    // 小程序 canvas 2d 触摸事件坐标获取
    let x, y;
    if (e.detail && e.detail.x !== undefined) {
      x = e.detail.x;
      y = e.detail.y;
      console.log('[TouchEnd] 使用 e.detail 坐标:', x, y);
    } else if (e.changedTouches && e.changedTouches[0]) {
      x = e.changedTouches[0].x;
      y = e.changedTouches[0].y;
      console.log('[TouchEnd] 使用 e.changedTouches[0] 坐标:', x, y);
    } else {
      console.log('[TouchEnd] 无法获取坐标');
      return;
    }
    
    if (x === undefined || y === undefined) {
      console.log('[TouchEnd] 坐标无效');
      return;
    }

    if (isDraggingBox) {
      console.log('[TouchEnd] 结束拖拽拉高分析框，最终高度偏移:', boxHeightOffset);
      isDraggingBox = false;
      return;
    }

    if (isTouchingAnalysis) {
      console.log('[TouchEnd] 结束拖拽滚动，最终滚动位置:', analysisScroll);
      isTouchingAnalysis = false;
      return;
    }

    console.log('[TouchEnd] 处理点击:', { x, y });
    handleTap(x, y);
  },
  
  // 重新抽牌
  restartTarot() {
    // 重置状态
    lastDraw = null;
    lastAnalysis = '';
    isLoading = false;
    showSwipeHint = false;
    currentSpread = null;
    lastSpread = null;
    
    // 清理动画定时器
    if (animationTimer) {
      if (typeof wx !== 'undefined' && wx.cancelAnimationFrame) {
        wx.cancelAnimationFrame(animationTimer);
      } else {
        clearTimeout(animationTimer);
      }
      animationTimer = null;
    }
    
    // 切换回抽卡页面
    this.setData({
      currentPage: 0,
      showSwipeHint: false,
      analysisText: '',
      selectedSpread: null,
      isLoading: false
    });
    
    // 重新渲染
    render();
  },
  
  // 返回首页
  goBackHome() {
    wx.navigateBack({
      delta: 1
    });
  },
  
  // 选择牌阵
  selectSpread(e) {
    const spreadKey = e.currentTarget.dataset.spread;
    this.setData({
      selectedSpread: spreadKey
    });
    
    // 更新全局变量
    currentSpread = spreadKey;
    if (currentSpread === 'one') {
      lastDraw = drawOneCard();
    } else if (currentSpread === 'three') {
      lastDraw = drawThreeCards();
    } else if (currentSpread === 'five') {
      lastDraw = drawFiveCardsCross();
    } else if (currentSpread === 'celtic') {
      lastDraw = drawCelticCross();
    } else {
      lastDraw = drawThreeCards();
    }
    lastSpread = currentSpread;
    lastHoverKey = null;
    lastAnalysis = '';
    showSwipeHint = false; // 重置提示
    isLoading = true; // 开始加载
    loadingAnimationFrame = 0; // 重置动画帧
    
    this.setData({
      showSwipeHint: false,
      analysisText: '',
      isLoading: true,
      loadingText: '正在生成解析...'
    });
    
    render();

    callDeepseek(currentSpread, lastDraw)
      .then(text => {
        isLoading = false; // 加载完成
        // 清理动画定时器
        if (animationTimer) {
          if (typeof wx !== 'undefined' && wx.cancelAnimationFrame) {
            wx.cancelAnimationFrame(animationTimer);
          } else {
            clearTimeout(animationTimer);
          }
          animationTimer = null;
        }
        lastAnalysis = text;
        // 保存到全局数据
        const app = getApp();
        if (app.globalData) {
          app.globalData.lastAnalysis = text;
        }
        // 显示滑动提示
        showSwipeHint = true;
        // 更新页面数据
        this.setData({
          showSwipeHint: true,
          analysisText: text,
          isLoading: false
        });
        render();
      })
      .catch(() => {
        isLoading = false; // 加载失败
        // 清理动画定时器
        if (animationTimer) {
          if (typeof wx !== 'undefined' && wx.cancelAnimationFrame) {
            wx.cancelAnimationFrame(animationTimer);
          } else {
            clearTimeout(animationTimer);
          }
          animationTimer = null;
        }
        this.setData({
          isLoading: false
        });
        render();
      });
  }
});

