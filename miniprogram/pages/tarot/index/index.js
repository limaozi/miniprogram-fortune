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
    
    const thumbMinH = 20;
    const thumbH = Math.max(thumbMinH, Math.floor(visibleH * visibleH / contentH));
    const maxScroll = Math.max(0, contentH - visibleH);
    const scrollRatio = maxScroll > 0 ? analysisScroll / maxScroll : 0;
    const thumbY = trackY + Math.floor((trackH - thumbH) * scrollRatio);
    
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(trackX, trackY, trackW, trackH);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(trackX, thumbY, trackW, thumbH);
    
    scrollbarInfo = {
      trackX, trackY, trackW, trackH,
      thumbY, thumbH,
      contentH, visibleH,
      maxScroll
    };
  }

  // 保存用于触摸事件的盒子信息
  renderAnalysisBox._box = {
    x: boxX, y: boxY, w: boxW, h: boxH,
    handleX, handleY, handleW: handleWidth, handleH: handleHeight,
    baseH: baseBoxH,
    scrollbar: scrollbarInfo
  };
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
  
  // Create a prompt that analyzes all cards combined together
  const prompt = `Based on the following tarot cards drawn together, provide a comprehensive analysis in Chinese of 150-200 words. Focus on how these cards interact and what they mean when combined. Make the response feminine and encouraging, use emoji and line breaks, and write in a natural conversational style. Do not include any thinking or reasoning process - only provide the final interpretation.\n\nCards:\n${createDetailedPrompt(cardsdraw)}\n\nPlease provide an integrated interpretation of all these cards together:`;
  
  console.log('[callDeepseek] 请求参数:', { spread: spreadKey, prompt });
  
  // 使用app.js中的callDeepseekAPI
  const app = getApp();
  return app.callDeepseekAPI(prompt)
    .then(content => {
      console.log('[callDeepseek] API 响应成功:', content);
      return content;
    })
    .catch(err => {
      console.error('[callDeepseek] API 调用失败:', err);
      return err.message || '无法生成解析';
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
  
  onLoad() {
    // 初始化状态
    lastDraw = null;
    currentSpread = null;
    lastSpread = null;
    lastAnalysis = '';
    isLoading = false;
    showSwipeHint = false;
    this.setData({
      currentPage: 0,
      showSwipeHint: false,
      analysisText: '',
      scrollViewHeight: Math.floor(wx.getSystemInfoSync().windowHeight * 0.38 * 2), // 转为 rpx
      selectedSpread: null,
      isLoading: false
    });
  },

  onReady() {
    wx.createSelectorQuery()
      .select('#tarotCanvas')
      .node()
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        canvas = res[0].node;
        ctx = canvas.getContext('2d');
        
        // 设置实际像素尺寸
        const sysInfo = wx.getSystemInfoSync();
        const pixelRatio = sysInfo.pixelRatio || 1;
        const width = sysInfo.windowWidth;
        const height = sysInfo.windowHeight;
        
        // Canvas 逻辑尺寸：宽度为窗口宽度，高度为窗口高度减去菜单区域
        const menuHeight = Math.floor(height * 0.25); // 菜单大约占 25% 的高度
        canvasWidth = Math.floor(width);
        canvasHeight = Math.floor(height - menuHeight);
        
        // 物理像素尺寸（用于实际绘制）
        canvas.width = Math.floor(canvasWidth * pixelRatio);
        canvas.height = Math.floor(canvasHeight * pixelRatio);
        ctx.scale(pixelRatio, pixelRatio);
        
        loadAtlas().then(() => {
          render();
        });
      });
  },

  onSwiperChange(e) {
    const current = e.detail.current;
    this.setData({ currentPage: current });
  },
  
  // 触摸开始：菜单 hover + 解析框滚动 + 分析框拖拽
  onCanvasTouchStart(e) {
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
      lastHoverKey = hover;
      render();
    }

    // 拖拽手柄检测（用于拉高分析框）
    const box = renderAnalysisBox._box;
    if (box) {
      const hx = box.handleX;
      const hy = box.handleY;
      const hw = box.handleW;
      const hh = box.handleH;
      if (x >= hx && x <= hx + hw && y >= hy && y <= hy + hh) {
        isDraggingBox = true;
        touchStartY = y;
        dragStartHeight = box.baseH + boxHeightOffset;
        return;
      }
    }

    if (box && box.scrollbar) {
      const sb = box.scrollbar;
      if (x >= sb.trackX && x <= sb.trackX + sb.trackW && 
          y >= sb.trackY && y <= sb.trackY + sb.trackH) {
        const relativeY = y - sb.trackY;
        const scrollRatio = relativeY / sb.trackH;
        analysisScroll = Math.min(sb.maxScroll, Math.max(0, scrollRatio * sb.maxScroll));
        clampAnalysisScroll(sb.visibleH);
        render();
        return;
      }
    }
    
    // 检查是否在分析框内（用于拖拽滚动内容）
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
      isTouchingAnalysis = true;
      touchStartY = y;
      touchStartScroll = analysisScroll;
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
      lastHoverKey = hover;
      render();
    }

    // 拖拽分析框（通过手柄拉高）
    if (isDraggingBox) {
      const dy = y - touchStartY;
      const box = renderAnalysisBox._box;
      if (box && box.baseH !== undefined) {
        const newHeightOffset = boxHeightOffset - dy;
        const maxHeightOffset = Math.floor(canvasHeight * 0.8) - box.baseH;
        boxHeightOffset = Math.max(0, Math.min(maxHeightOffset, newHeightOffset));
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
        // 滚动更新
      }
      render();
    }
  },

  // 触摸结束：如果不是在拖动解析框，则视为点击
  onCanvasTouchEnd(e) {
    // 小程序 canvas 2d 触摸事件坐标获取
    let x, y;
    if (e.detail && e.detail.x !== undefined) {
      x = e.detail.x;
      y = e.detail.y;
    } else if (e.changedTouches && e.changedTouches[0]) {
      x = e.changedTouches[0].x;
      y = e.changedTouches[0].y;
    } else {
      return;
    }
    
    if (x === undefined || y === undefined) {
      return;
    }

    if (isDraggingBox) {
      isDraggingBox = false;
      return;
    }

    if (isTouchingAnalysis) {
      isTouchingAnalysis = false;
      return;
    }

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
