// 选择角色页面
const characterData = {
  hongloumeng: {
    name: '红楼梦',
    characters: [
      { id: 'lind', name: '林黛玉', avatar: '🌺', desc: '才华横溢，敏感多情' },
      { id: 'baoc', name: '贾宝玉', avatar: '💎', desc: '叛逆不羁，情深意重' },
      { id: 'xueb', name: '薛宝钗', avatar: '🦋', desc: '端庄贤淑，处事圆融' },
      { id: 'wangx', name: '王熙凤', avatar: '👸', desc: '精明能干，权谋高手' }
    ]
  },
  zhenhuanzhuan: {
    name: '甄嬛传',
    characters: [
      { id: 'zhenh', name: '甄嬛', avatar: '👑', desc: '从天真到成熟的蜕变' },
      { id: 'huanghou', name: '皇后', avatar: '🦚', desc: '高贵冷艳，心机深沉' },
      { id: 'huafei', name: '华妃', avatar: '🔥', desc: '骄纵跋扈，爱恨分明' },
      { id: 'jingfei', name: '敬妃', avatar: '🌙', desc: '温柔善良，隐忍坚韧' }
    ]
  },
  zhifou: {
    name: '知否知否应是绿肥红瘦',
    characters: [
      { id: 'minglan', name: '盛明兰', avatar: '🌸', desc: '聪慧隐忍，步步为营' },
      { id: 'molan', name: '盛墨兰', avatar: '🥀', desc: '野心勃勃，不择手段' },
      { id: 'rulan', name: '盛如兰', avatar: '🌼', desc: '直率真诚，敢爱敢恨' },
      { id: 'hualan', name: '盛华兰', avatar: '🌹', desc: '温婉大气，持家有道' }
    ]
  }
};

Page({
  data: {
    storyId: '',
    storyName: '',
    characters: []
  },

  onLoad(options) {
    const storyId = options.storyId || 'hongloumeng';
    const storyData = characterData[storyId];
    
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
