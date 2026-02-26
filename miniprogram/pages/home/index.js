// home.js - 入口页面
Page({
  data: {
    currentDateStr: '',
    currentSeasonZh: ''
  },
  
  onLoad() {
    console.log('入口页面加载');
    const app = getApp();
    const global = app && app.globalData ? app.globalData : {};
    let { currentDateStr, currentSeasonZh } = global;

    // 兜底：如果全局数据不存在，则本地再计算一次
    if (!currentDateStr || !currentSeasonZh) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (month === 3 || month === 4 || month === 5) {
        currentSeasonZh = '春季';
      } else if (month === 6 || month === 7 || month === 8) {
        currentSeasonZh = '夏季';
      } else if (month === 9 || month === 10 || month === 11) {
        currentSeasonZh = '秋季';
      } else {
        currentSeasonZh = '冬季';
      }
    }

    this.setData({
      currentDateStr,
      currentSeasonZh
    });
  },
  
  // 跳转到塔罗牌页面
  goToTarot() {
    wx.navigateTo({
      url: '/pages/tarot/index/index'
    });
  },
  
  // 跳转到MBTI测试页面
  goToMBTI() {
    wx.navigateTo({
      url: '/pages/mbti/index'
    });
  },
  goToConstellation() {
    wx.navigateTo({
      url: '/pages/constellation/index',
    });
  },
  goToStyle() {
    wx.navigateTo({
      url: '/pages/style/index',
    });
  },
  
  // 跳转到情感咨询页面
  goToLove() {
    wx.navigateTo({
      url: '/pages/love/index/index'
    });
  },
});
