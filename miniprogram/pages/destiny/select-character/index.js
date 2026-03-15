// 选择角色页面 - 数据和资源均来自 app
Page({
  data: {
    storyId: '',
    storyName: '',
    characters: []
  },

  onLoad(options) {
    const app = getApp();
    const storyId = options.storyId;
    const storyData = app.destinyCharacters[storyId];

    if (!storyData) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }

    this.setData({
      storyId,
      storyName: storyData.name,
      characters: storyData.characters
    });
  },

  onReady() {
    this.initAllCharacterCanvasesWithRetry(0);
  },

  initAllCharacterCanvasesWithRetry(retryCount) {
    const MAX_RETRY = 15;
    if (retryCount > MAX_RETRY) {
      console.error('initAllCharacterCanvases 重试失败，未找到 canvas 节点');
      return;
    }

    const app = getApp();
    if (!app.globalData.destinyAtlas) {
      setTimeout(() => this.initAllCharacterCanvasesWithRetry(retryCount + 1), 100);
      return;
    }

    const query = this.createSelectorQuery();
    query.select('#charCanvas0').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        setTimeout(() => this.initAllCharacterCanvasesWithRetry(retryCount + 1), 100);
        return;
      }

      const { characters } = this.data;

      if (app.globalData.destinyImage) {
        characters.forEach((char, idx) => this.initCharCanvas(char, idx));
        return;
      }

      // atlas 已有但图片还没加载（直接进入此页面的情况）
      const img = res[0].node.createImage();
      img.onload = () => {
        app.globalData.destinyImage = img;
        characters.forEach((char, idx) => this.initCharCanvas(char, idx));
      };
      img.onerror = (e) => console.error('destiny图片加载失败', e);
      img.src = '/images/destiny.png';
    });
  },

  initCharCanvas(character, idx) {
    const query = this.createSelectorQuery();
    query.select(`#charCanvas${idx}`).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;

      const canvasNode = res[0].node;
      const width = res[0].width;
      const height = res[0].height;
      const dpr = wx.getSystemInfoSync().pixelRatio || 1;

      canvasNode.width = width * dpr;
      canvasNode.height = height * dpr;
      const ctx = canvasNode.getContext('2d');
      ctx.scale(dpr, dpr);

      this.drawFrame(ctx, width, height, character.frameKey);
    });
  },

  drawFrame(ctx, width, height, frameKey) {
    const { destinyImage, destinyAtlas } = getApp().globalData;
    if (!destinyImage || !destinyAtlas) return;

    const frame = destinyAtlas.frames[frameKey];
    if (!frame) {
      ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
      ctx.fillRect(0, 0, width, height);
      return;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(destinyImage, frame.x, frame.y, frame.w, frame.h, 0, 0, width, height);
  },

  selectCharacter(e) {
    const characterId = e.currentTarget.dataset.id;
    const { storyId } = this.data;
    wx.navigateTo({
      url: `/pages/destiny/questionnaire/index?storyId=${storyId}&characterId=${characterId}`
    });
  }
});
