// 选择作品页面 - 使用 app 中的数据
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

  selectStory(e) {
    const storyId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/destiny/select-character/index?storyId=${storyId}`
    });
  }
});
