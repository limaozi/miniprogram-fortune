// 选择作品页面 - 使用 app 中的数据
let destinyCanvasMap = {};
let destinyCtxMap = {};
let destinyImage = null;
let destinyAtlas = null;
const destinyImagePath = '/images/destiny.png';
const destinyAtlasPath = '/images/destiny-atlas.json';
const destinyFrameByStory = {
  hongloumeng: 'honglou',
  zhenhuanzhuan: 'zhenhuanzhuan',
  zhifou: 'zhifou'
};

Page({
  data: {
    stories: []
  },

  onLoad() {
    const app = getApp();
    this.setData({
      stories: app.destinyStories
    });
  },

  onReady() {
    this.loadDestinyAtlas()
      .then(() => {
        this.initAllCoverCanvasesWithRetry(0);
      })
      .catch((err) => {
        console.error('加载命运封面atlas失败', err);
      });
  },

  loadDestinyAtlas() {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath: destinyAtlasPath,
        encoding: 'utf-8',
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            destinyAtlas = data;
            resolve(data);
          } catch (e) {
            reject(e);
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  loadDestinyImage(canvas) {
    return new Promise((resolve, reject) => {
      try {
        const img = canvas.createImage();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = destinyImagePath;
      } catch (e) {
        reject(e);
      }
    });
  },

  initAllCoverCanvasesWithRetry(retryCount) {
    const MaxRetry = 10;
    if (retryCount > MaxRetry) {
      console.error('initAllCoverCanvases 重试失败，未找到 canvas 节点');
      return;
    }

    const query = this.createSelectorQuery();
    const selector = query.select('#coverCanvas0');
    if (!selector || !selector.fields) {
      setTimeout(() => this.initAllCoverCanvasesWithRetry(retryCount + 1), 80);
      return;
    }

    selector.fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        setTimeout(() => this.initAllCoverCanvasesWithRetry(retryCount + 1), 80);
        return;
      }

      this.loadDestinyImage(res[0].node)
        .then((img) => {
          destinyImage = img;
          const stories = this.data.stories || [];
          stories.forEach((story, idx) => {
            this.initCoverCanvasWithRetry(story, idx, 0);
          });
        })
        .catch((err) => {
          console.error('加载命运封面图片失败', err);
        });
    });
  },

  initCoverCanvasWithRetry(story, idx, retryCount) {
    const MaxRetry = 10;
    if (retryCount > MaxRetry) {
      console.warn('initCoverCanvas 重试失败', story.id, idx);
      return;
    }

    const canvasId = `#coverCanvas${idx}`;
    const query = this.createSelectorQuery();
    const selector = query.select(canvasId);
    if (!selector || !selector.fields) {
      setTimeout(() => this.initCoverCanvasWithRetry(story, idx, retryCount + 1), 80);
      return;
    }

    selector.fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        setTimeout(() => this.initCoverCanvasWithRetry(story, idx, retryCount + 1), 80);
        return;
      }

      const canvasNode = res[0].node;
      const width = res[0].width;
      const height = res[0].height;
      const dpr = wx.getSystemInfoSync().pixelRatio || 1;

      canvasNode.width = width * dpr;
      canvasNode.height = height * dpr;
      const ctx = canvasNode.getContext('2d');
      ctx.scale(dpr, dpr);

      destinyCanvasMap[story.id] = canvasNode;
      destinyCtxMap[story.id] = { ctx, width, height };
      this.drawStoryCover(story.id);
    });
  },

  initCoverCanvas(story, idx) {
    const canvasId = `#coverCanvas${idx}`;
    const query = wx.createSelectorQuery();
    query
      .select(canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          console.warn('未找到canvas节点', canvasId);
          return;
        }

        const canvasNode = res[0].node;
        const width = res[0].width;
        const height = res[0].height;
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;

        canvasNode.width = width * dpr;
        canvasNode.height = height * dpr;
        const ctx = canvasNode.getContext('2d');
        ctx.scale(dpr, dpr);

        destinyCanvasMap[story.id] = canvasNode;
        destinyCtxMap[story.id] = { ctx, width, height };
        this.drawStoryCover(story.id);
      });
  },

  drawStoryCover(storyId) {
    if (!destinyImage || !destinyAtlas || !destinyCtxMap[storyId]) {
      return;
    }

    const frameName = destinyFrameByStory[storyId];
    const frame = destinyAtlas.frames[frameName];
    if (!frame) {
      console.error('未找到封面frame', frameName);
      return;
    }

    const { ctx, width, height } = destinyCtxMap[storyId];
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
