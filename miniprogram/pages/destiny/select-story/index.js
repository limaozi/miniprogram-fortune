// 选择作品页面
Page({
  data: {
    stories: [
      {
        id: 'hongloumeng',
        name: '红楼梦',
        icon: '🏮',
        desc: '四大名著之首，封建社会的百科全书'
      },
      {
        id: 'zhenhuanzhuan',
        name: '甄嬛传',
        icon: '👑',
        desc: '宫廷权谋，女性成长史诗'
      },
      {
        id: 'zhifou',
        name: '知否知否应是绿肥红瘦',
        icon: '🌸',
        desc: '古代女性的智慧与抉择'
      }
    ]
  },

  selectStory(e) {
    const storyId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/destiny/select-character/index?storyId=${storyId}`
    });
  }
});
