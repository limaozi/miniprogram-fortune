// 22 Major Arcana, simplified Chinese names with brief upright/reversed meanings
const TAROT_CARDS = [
  { id: 5, name: 'The Fool', nameZh: '愚者', up: '冒险 开始 自由', rev: '鲁莽 迷惘 犹豫' },
  { id: 12, name: 'The Magician', nameZh: '魔术师', up: '意志 技能 显化', rev: '欺骗 能量分散 迟滞' },
  { id: 14, name: 'The High Priestess', nameZh: '女祭司', up: '直觉 秘密 内在智慧', rev: '压抑 迟钝 混乱' },
  { id: 4, name: 'The Empress', nameZh: '女皇', up: '丰盛 关怀 创造', rev: '依赖 过度 懒散' },
  { id: 3, name: 'The Emperor', nameZh: '皇帝', up: '结构 领导 规则', rev: '僵化 专断 控制' },
  { id: 8, name: 'The Hierophant', nameZh: '教皇', up: '传统 教导 信念', rev: '教条 叛逆 形式化' },
  { id: 11, name: 'The Lovers', nameZh: '恋人', up: '选择 爱 情感连结', rev: '分歧 诱惑 犹豫' },
  { id: 0, name: 'The Chariot', nameZh: '战车', up: '意志 胜利 前进', rev: '分心 停滞 失控' },
  { id: 16, name: 'Strength', nameZh: '力量', up: '勇气 温柔 自律', rev: '怀疑 软弱 冲动' },
  { id: 7, name: 'The Hermit', nameZh: '隐者', up: '独处 省思 指引', rev: '孤立 逃避 顽固' },
  { id: 20, name: 'Wheel of Fortune', nameZh: '命运之轮', up: '循环 转机 机会', rev: '延误 固着 阻滞' },
  { id: 10, name: 'Justice', nameZh: '正义', up: '公平 责任 诚实', rev: '偏差 逃避 不公' },
  { id: 6, name: 'The Hanged Man', nameZh: '倒吊人', up: '换位牺牲 停顿 觉察', rev: '僵局 牺牲过度 顽固' },
  { id: 1, name: 'Death', nameZh: '死神', up: '结束 转化 解脱', rev: '抗拒改变 执念 迟滞' },
  { id: 18, name: 'Temperance', nameZh: '节制', up: '平衡 调和 渐进', rev: '失衡 急躁 过度' },
  { id: 2, name: 'The Devil', nameZh: '恶魔', up: '欲望 束缚 物质诱惑', rev: '觉醒 释放 突破' },
  { id: 19, name: 'The Tower', nameZh: '高塔', up: '突变 崩解 觉醒', rev: '延迟灾变 恐惧 抗拒' },
  { id: 15, name: 'The Star', nameZh: '星星', up: '希望 修复 灵感', rev: '失望 疲惫 幻灭' },
  { id: 13, name: 'The Moon', nameZh: '月亮', up: '潜意识 迷雾 想象', rev: '清明 洞察 疑虑缓解' },
  { id: 17, name: 'The Sun', nameZh: '太阳', up: '成功 喜悦 透明', rev: '延迟 成果受阻 自负' },
  { id: 9, name: 'Judgement', nameZh: '审判', up: '复苏 召唤 觉醒', rev: '犹豫 自我怀疑 拖延' },
  { id: 21, name: 'The World', nameZh: '世界', up: '完成 圆满 统合', rev: '未竟 循环未闭 松散' }
];

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawThreeCards() {
  const deck = shuffle(TAROT_CARDS);
  const selected = deck.slice(0, 3);
  return selected.map(card => {
    const reversed = Math.random() < 0.5;
    const meaning = reversed ? card.rev : card.up;
    const interpretation = `${card.nameZh}：${meaning}`;
    return { card, reversed, interpretation };
  });
}

function drawOneCard() {
  const deck = shuffle(TAROT_CARDS);
  const selected = deck.slice(0, 1);
  return selected.map(card => {
    const reversed = Math.random() < 0.5;
    const meaning = reversed ? card.rev : card.up;
    const interpretation = `${card.nameZh}：${meaning}`;
    return { card, reversed, interpretation };
  });
}

function drawFiveCardsCross() {
  const deck = shuffle(TAROT_CARDS);
  const selected = deck.slice(0, 5);
  return selected.map(card => {
    const reversed = Math.random() < 0.5;
    const meaning = reversed ? card.rev : card.up;
    const interpretation = `${card.nameZh}：${meaning}`;
    return { card, reversed, interpretation };
  });
}

function drawCelticCross() {
  const deck = shuffle(TAROT_CARDS);
  const selected = deck.slice(0, 10);
  return selected.map(card => {
    const reversed = Math.random() < 0.5;
    const meaning = reversed ? card.rev : card.up;
    const interpretation = `${card.nameZh}：${meaning}`;
    return { card, reversed, interpretation };
  });
}

module.exports = { TAROT_CARDS, drawThreeCards, drawOneCard, drawFiveCardsCross, drawCelticCross };

