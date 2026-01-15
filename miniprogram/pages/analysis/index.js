// 解析页面
Page({
  data: {
    analysisText: ''
  },

  onLoad(options) {
    // 从全局数据或 storage 获取解析内容
    const app = getApp();
    if (app.globalData && app.globalData.lastAnalysis) {
      this.setData({
        analysisText: app.globalData.lastAnalysis
      });
    } else {
      // 尝试从 storage 获取
      try {
        const analysis = wx.getStorageSync('lastAnalysis');
        if (analysis) {
          this.setData({
            analysisText: analysis
          });
        }
      } catch (e) {
        console.error('获取解析内容失败:', e);
      }
    }
  },

  onShow() {
    // 每次显示时更新内容
    const app = getApp();
    if (app.globalData && app.globalData.lastAnalysis) {
      this.setData({
        analysisText: app.globalData.lastAnalysis
      });
    }
  }
});
