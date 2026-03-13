// 问卷页面 - 使用 API 动态生成问题
const characterBasicInfo = {
  hongloumeng: {
    lind: { name: '林黛玉', desc: '才华横溢、敏感多情的女子，红楼梦中的悲剧人物' },
    baoc: { name: '贾宝玉', desc: '木石前盟的痴情公子，反叛传统但又不得不接受命运' },
    xueb: { name: '薛宝钗', desc: '端庄贤淑、处事圆融的公侯千金' },
    wangx: { name: '王熙凤', desc: '精明能干、权谋高手、贾府的实际管理者' }
  },
  zhenhuanzhuan: {
    zhenh: { name: '甄嬛', desc: '从天真少女到后宫之主的蜕变者，经历过陷害、复仇与权谋' },
    huanghou: { name: '皇后', desc: '高贵冷艳、心机深沉的皇后，为维护地位不惜一切' },
    huafei: { name: '华妃', desc: '骄纵跋扈、爱恨分明的妃嫔，权势者的悲剧' },
    jingfei: { name: '敬妃', desc: '温柔善良、隐忍坚韧的妃嫔，沉默中蕴含力量' }
  },
  zhifou: {
    minglan: { name: '盛明兰', desc: '聪慧隐忍、步步为营的庶女，用智慧改变命运' },
    molan: { name: '盛墨兰', desc: '野心勃勃、不择手段的庶女，最终为所作所为付出代价' },
    rulan: { name: '盛如兰', desc: '直率真诚、敢爱敢恨的二女儿' },
    hualan: { name: '盛华兰', desc: '温婉大气、持家有道的长女' }
  }
};

Page({
  data: {
    storyId: '',
    characterId: '',
    storyName: '',
    characterName: '',
    questions: [],
    currentIndex: 0,
    selectedAnswer: null,
    answers: [],
    showResult: false,
    isLoading: false,
    generateLoading: true,
    resultIcon: '',
    resultTitle: '',
    resultContent: '',
    loadingText: '',
    reviewScrollHeight: 0, // 回顾页面scroll-view高度
    resultScrollHeight: 0  // 结果页面scroll-view高度
  },

  onLoad(options) {
    const { storyId, characterId } = options;
    const characterInfo = characterBasicInfo[storyId]?.[characterId];
    
    if (!characterInfo) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }

    const storyNames = {
      hongloumeng: '红楼梦',
      zhenhuanzhuan: '甄嬛传',
      zhifou: '知否知否应是绿肥红瘦'
    };

    this.setData({
      storyId,
      characterId,
      storyName: storyNames[storyId],
      characterName: characterInfo.name,
      generateLoading: true,
      isLoading: true,
      loadingText: '正在生成命运相关的问题……'
    });

    // 生成问题
    this.generateQuestions(storyId, characterId, characterInfo);
  },

  generateQuestions(storyId, characterId, characterInfo) {
    const prompt = `You are a creative designer expert in classical Chinese literature and TV dramas. Generate 5 destiny choice questions for the character "${characterInfo.name}" from "《${this.data.storyName}》".

Character Background: ${characterInfo.desc}

Requirements:
1. Create 5 questions based on the character's personality, story background, and life choices
2. Each question represents a major plot point or life turning point in the story
3. Each question has 4-5 options (all in Chinese)
4. Options should be specific actions this character might take in that situation
5. Questions should be literary and dramatic, thought-provoking and engaging

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "问题文本（中文）",
      "options": ["选项1（中文）", "选项2（中文）", "选项3（中文）", "选项4（中文）"]
    }
  ]
}`;

    const app = getApp();
    app.callDeepseekAPI(prompt)
      .then(response => {
        console.log('生成的问题原始响应:', response);
        
        let questions = [];
        try {
          // 改进的JSON提取方法：使用括号匹配找到完整的最外层JSON对象
          const firstBraceIndex = response.indexOf('{');
          
          if (firstBraceIndex !== -1) {
            // 从第一个 { 开始，计算括号匹配来找到对应的 }
            let braceCount = 0;
            let lastBraceIndex = -1;
            
            for (let i = firstBraceIndex; i < response.length; i++) {
              const char = response[i];
              
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  lastBraceIndex = i;
                  break;
                }
              }
            }
            
            if (lastBraceIndex !== -1) {
              let jsonStr = response.substring(firstBraceIndex, lastBraceIndex + 1);
              console.log('提取的JSON字符串:', jsonStr.substring(0, 200) + '...');
              
              // 清理JSON字符串
              jsonStr = jsonStr.trim();
              // 移除BOM字符（如果有）
              if (jsonStr.charCodeAt(0) === 0xFEFF) {
                jsonStr = jsonStr.substring(1);
              }
              
              console.log('清理后的JSON长度:', jsonStr.length);
              
              const parsed = JSON.parse(jsonStr);
              questions = parsed.questions || [];
              console.log('成功解析JSON，获得问题数:', questions.length);
            }
          }
        } catch (e) {
          console.error('JSON 解析失败:', e);
          console.error('原始响应长度:', response.length);
          console.error('错误详情:', e.message);
        }

        // 如果解析失败或没有问题，使用备用方案
        if (!questions || questions.length === 0) {
          console.log('使用备用问题');
          questions = this.getDefaultQuestions(characterInfo.name);
        }

        // 确保有5个问题
        if (questions.length < 5) {
          const defaultQuestions = this.getDefaultQuestions(characterInfo.name);
          questions = questions.concat(defaultQuestions.slice(questions.length));
        } else if (questions.length > 5) {
          questions = questions.slice(0, 5);
        }

        this.setData({
          isLoading: false,
          questions,
          answers: new Array(questions.length).fill(null),
          generateLoading: false
        });
      })
      .catch(error => {
        console.error('生成问题失败:', error);
        
        // 使用备用方案
        const defaultQuestions = this.getDefaultQuestions(characterInfo.name);
        this.setData({
          questions: defaultQuestions,
          answers: new Array(defaultQuestions.length).fill(null),
          generateLoading: false,
          isLoading: false
        });
        
        wx.showToast({ 
          title: '使用默认问题', 
          icon: 'none',
          duration: 1500
        });
      });
  },

  getDefaultQuestions(characterName) {
    // 备用问题集
    const defaults = [
      { question: '面对生活中的重大抉择，你会？', options: ['顺从本心', '听从劝告', '寻求平衡', '倾听直觉'] },
      { question: '在利益与信念冲突时，你选择？', options: ['坚守信念', '权衡利益', '寻求折中', '随遇而安'] },
      { question: '面对误解和指责，你会？', options: ['直言相对', '沉默承受', '冷静化解', '远离喧嚣'] },
      { question: '在感情与责任之间，你更看重？', options: ['追求感情', '肩负责任', '两者兼顾', '保持独立'] },
      { question: '面对未知的未来，你的态度是？', options: ['勇敢前行', '谨慎筹谋', '珍惜当下', '接纳变化'] }
    ];
    return defaults;
  },

  selectOption(e) {
    const index = e.currentTarget.dataset.index;
    const { currentIndex, answers } = this.data;
    answers[currentIndex] = index;
    
    this.setData({
      selectedAnswer: index,
      answers
    });
  },

  nextQuestion() {
    if (this.data.selectedAnswer === null) {
      wx.showToast({ title: '请选择一个选项', icon: 'none' });
      return;
    }

    // 如果是最后一题，提交答案
    if (this.data.currentIndex === this.data.questions.length - 1) {
      this.submitAnswers();
      return;
    }

    // 否则进入下一题
    const nextIndex = this.data.currentIndex + 1;
    this.setData({
      currentIndex: nextIndex,
      selectedAnswer: this.data.answers[nextIndex]
    });
  },

  prevQuestion() {
    const prevIndex = this.data.currentIndex - 1;
    this.setData({
      currentIndex: prevIndex,
      selectedAnswer: this.data.answers[prevIndex]
    });
  },

  submitAnswers() {
    if (this.data.selectedAnswer === null) {
      wx.showToast({ title: '请选择一个选项', icon: 'none' });
      return;
    }

    this.setData({ 
      isLoading: true, 
      loadingText: '正在分析您的命运和结局...'
    });
    this.analyzeDestiny();
  },

  analyzeDestiny() {
    const { questions, answers, characterName, storyName } = this.data;
    
    // 构建问答对（中文）
    const qaList = questions.map((q, index) => {
      return `Question ${index + 1}: ${q.question}\nYour choice: ${q.options[answers[index]]}`;
    }).join('\n\n');

    // 构建 prompt
    const prompt = `You are a destiny analyst expert in classical Chinese literature and TV dramas. A user chose to play the character "${characterName}" from "《${storyName}》" and answered the following life choice questions:

${qaList}

Based on the user's choices, analyze what kind of destiny path this character would have and this character's ending. You don't have to follow the original story line. You can estimate the character's ending accoridng his/her decision. 

Requirements (respond in Chinese):
1. Combine ${characterName}'s personality traits and destiny trajectory from the original work
2. Based on user's choices, analyze the resulting destiny outcome
3. Give a poetic destiny title (4-6 Chinese characters)
4. Write a 200-300 word analysis with literary depth and thoughtfulness
5. Use line breaks and emojis to make the response feel human-like and engaging
6. Include encouraging comments about the user's choices where appropriate
7. Response format should be clear and easy to understand

Output format (respond ONLY in this format):
标题：[Destiny type title]
分析：[Detailed analysis with paragraphs and emojis]

Return ONLY the formatted response, no extra content. And the results must in Chinese`;

    const app = getApp();
    app.callDeepseekAPI(prompt)
      .then(response => {
        console.log('AI响应:', response);
        
        // 解析响应
        const lines = response.split('\n');
        let title = '';
        let content = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('标题：') || line.startsWith('标题:')) {
            title = line.replace(/^标题[：:]/, '').trim();
          } else if (line.startsWith('分析：') || line.startsWith('分析:')) {
            content = line.replace(/^分析[：:]/, '').trim();
            // 收集后续所有行作为内容
            for (let j = i + 1; j < lines.length; j++) {
              if (lines[j].trim()) {
                content += '\n' + lines[j].trim();
              }
            }
            break;
          }
        }

        // 如果没有找到标题和分析，尝试直接使用响应
        if (!title || !content) {
          const parts = response.split('\n\n');
          if (parts.length >= 2) {
            title = parts[0].replace(/^标题[：:]/, '').trim();
            content = parts.slice(1).join('\n\n').replace(/^分析[：:]/, '').trim();
          } else {
            title = '命运之轮';
            content = response;
          }
        }

        this.setData({
          showResult: true,
          isLoading: false,
          resultIcon: this.getIconByTitle(title),
          resultTitle: title,
          resultContent: content
        });
        // 延迟更新高度，确保DOM已更新
        setTimeout(() => {
          this.updateResultScrollHeight();
        }, 100);
      })
      .catch(error => {
        console.error('AI分析失败:', error);
        this.setData({ isLoading: false });
        // API超时或失败时，不显示toast提示
      });
  },

  getIconByTitle(title) {
    // 根据标题关键词返回合适的图标
    if (title.includes('勇') || title.includes('开拓') || title.includes('进取')) return '🌟';
    if (title.includes('智') || title.includes('谋') || title.includes('慧')) return '🌙';
    if (title.includes('平衡') || title.includes('和') || title.includes('圆满')) return '🌸';
    if (title.includes('安') || title.includes('静') || title.includes('淡')) return '🍃';
    if (title.includes('权') || title.includes('势') || title.includes('强')) return '👑';
    if (title.includes('情') || title.includes('爱') || title.includes('心')) return '💖';
    if (title.includes('悲') || title.includes('苦') || title.includes('难')) return '🥀';
    if (title.includes('福') || title.includes('喜') || title.includes('乐')) return '🌺';
    return '✨';
  },

  // 计算并设置回顾页面scroll-view的高度
  updateReviewScrollHeight() {
    const sys = wx.getSystemInfoSync();
    const windowHeight = sys.windowHeight || 667;
    const rpxRatio = 750 / sys.windowWidth;
    // 计算可用高度：窗口高度 - 头部高度(约 100rpx) - 顶部padding(40rpx) - 底部padding(40rpx) - header margin-bottom(30rpx)
    const headerHeight = 100;
    const topPadding = 40;
    const bottomPadding = 40;
    const headerMarginBottom = 30;
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - topPadding - bottomPadding - headerMarginBottom;
    
    this.setData({
      reviewScrollHeight: Math.max(400, scrollViewHeightRpx)
    });
  },

  // 计算并设置结果页面scroll-view的高度
  updateResultScrollHeight() {
    const sys = wx.getSystemInfoSync();
    const windowHeight = sys.windowHeight || 667;
    const rpxRatio = 750 / sys.windowWidth;
    // 计算可用高度：窗口高度 - 头部高度(约 100rpx) - 顶部padding(40rpx) - 底部padding(40rpx) - header margin-bottom(30rpx) - 按钮区域(约 240rpx) - 按钮gap(15rpx)
    const headerHeight = 100;
    const topPadding = 40;
    const bottomPadding = 40;
    const headerMarginBottom = 30;
    const buttonArea = 240;
    const buttonGap = 15;
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - topPadding - bottomPadding - headerMarginBottom - buttonArea - buttonGap;
    
    this.setData({
      resultScrollHeight: Math.max(400, scrollViewHeightRpx)
    });
  },

  // 结果页面swiper切换
  onResultSwiperChange(e) {
    const current = e.detail.current;
    // 切换到任何一页时都更新高度
    if (current === 0) {
      this.updateReviewScrollHeight();
    } else if (current === 1) {
      this.updateResultScrollHeight();
    }
  },

  retry() {
    wx.navigateBack({ delta: 2 });
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/home/index'
    });
  }
});
