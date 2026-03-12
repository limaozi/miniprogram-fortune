// 选择角色页面 - 使用 app 中的数据
Page({
  data: {
    storyId: '',
    storyName: '',
    characters: []
  },

  onLoad(options) {
    const app = getApp();
    const storyId = options.storyId || 'hongloumeng';
    const storyData = app.destinyCharacters[storyId];
    
    this.setData({
      storyId,
      storyName: storyData.name,
      characters: storyData.characters
    });
  },

  selectCharacter(e) {
    const characterId = e.currentTarget.dataset.id;
    const { storyId } = this.data;
    
    wx.navigateTo({
      url: `/pages/destiny/questionnaire/index?storyId=${storyId}&characterId=${characterId}`
    });
  }
});
