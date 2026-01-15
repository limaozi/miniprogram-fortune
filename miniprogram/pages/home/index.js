// home.js - 入口页面
Page({
  data: {},
  
  onLoad() {
    console.log('入口页面加载');
  },
  
  // 跳转到塔罗牌页面
  goToTarot() {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  },
  
  // 跳转到MBTI测试页面
  goToMBTI() {
    wx.navigateTo({
      url: '/pages/mbti/index'
    });
  }
});
