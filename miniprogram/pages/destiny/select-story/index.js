// 选择作品页面
const DESTINY_IMAGE_PATH = '/images/destiny.png';
const DESTINY_ATLAS_PATH = '/images/destiny-atlas.json';

Page({
  data: {
    stories: []
  },

  onLoad() {
    const app = getApp();
    this.setData({ stories: app.destinyStories });
  },

  onReady() {
    this.loadDestinyResources()
      .then(() => this.initAllCoverCanvasesWithRetry(0))
      .catch(err => console.error('加载destiny资源失败，跳过封面绘制', err));
  },

  loadDestinyResources() {
    const app = getApp();
    if (app.globalData.destinyAtlas) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath: DESTINY_ATLAS_PATH,
        encoding: 'utf-8',
        success: (res) => {
          try {
            app.globalData.destinyAtlas = JSON.parse(res.data);
            resolve();
          } catch (e) { reject(e); }
        },
        fail: reject
      });
    });
  },

  initAllCoverCanvasesWithRetry(retryCount) {
    const MAX_RETRY = 15;
    if (retryCount > MAX_RETRY) {
      console.error('initAllCoverCanvases 重试失败，未找到 canvas 节点');
      return;
    }

    const query = this.createSelectorQuery();
    query.select('#coverCanvas0').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        setTimeout(() => this.initAllCoverCanvasesWithRetry(retryCount + 1), 100);
        return;
      }

      const app = getApp();
      const stories = app.destinyStories;

      if (app.globalData.destinyImage) {
        stories.forEach((story, idx) => this.initCoverCanvas(story, idx));
        return;
      }

      const img = res[0].node.createImage();
      img.onload = () => {
        app.globalData.destinyImage = img;
        stories.forEach((story, idx) => this.initCoverCanvas(story, idx));
      };
      img.onerror = (e) => console.error('destiny图片加载失败', e);
      img.src = DESTINY_IMAGE_PATH;
    });
  },

  initCoverCanvas(story, idx) {
    const query = this.createSelectorQuery();
    query.select(`#coverCanvas${idx}`).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;

      const canvasNode = res[0].node;
      const width = res[0].width;
      const height = res[0].height;
      const dpr = wx.getSystemInfoSync().pixelRatio || 1;

      canvasNode.width = width * dpr;
      canvasNode.height = height * dpr;
      const ctx = canvasNode.getContext('2d');
      ctx.scale(dpr, dpr);

      this.drawFrame(ctx, width, height, story.frameKey);
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

  selectStory(e) {
    const storyId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/destiny/select-character/index?storyId=${storyId}`
    });
  }
});
