// 问卷页面 - 数据和工具函数均来自 app
Page({
  data: {
    storyId: '',
    characterId: '',
    storyName: '',
    characterName: '',
    characterFrameKey: '',   // 用于结果页绘制角色图
    questions: [],
    currentIndex: 0,
    selectedAnswer: null,
    answers: [],             // 存储每题选中的选项 index（数字）
    showResult: false,
    isLoading: false,
    generateLoading: true,
    resultPage: 0,
    resultIcon: '',
    resultTitle: '',
    resultContent: '',
    reviewScrollHeight: 0,
    resultScrollHeight: 0
  },

  onLoad(options) {
    const app = getApp();
    const { storyId, characterId } = options;
    const characterInfo = app.destinyCharacterInfo[storyId]?.[characterId];

    if (!characterInfo) {
      //wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }

    // 找到角色的 frameKey
    const charList = app.destinyCharacters[storyId]?.characters || [];
    const charData = charList.find(c => c.id === characterId);

    this.setData({
      storyId,
      characterId,
      storyName: app.destinyCharacters[storyId]?.name || '',
      characterName: characterInfo.name,
      characterFrameKey: charData?.frameKey || '',
      generateLoading: true,
      isLoading: true
    });

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
    //console.log(prompt);
    const app = getApp();
    app.callDeepseekAPI(prompt)
      .then(response => {
        //console.log('生成的问题原始响应:', response);
        
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
              //console.log('提取的JSON字符串:', jsonStr.substring(0, 200) + '...');
              
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
          questions = getApp().destinyDefaultQuestions.slice();
        }

        // 确保有5个问题
        if (questions.length < 5) {
          const defaults = getApp().destinyDefaultQuestions;
          questions = questions.concat(defaults.slice(questions.length));
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
        const defaultQuestions = getApp().destinyDefaultQuestions.slice();
        this.setData({
          questions: defaultQuestions,
          answers: new Array(defaultQuestions.length).fill(null),
          generateLoading: false,
          isLoading: false
        });
        //wx.showToast({ title: '使用默认问题', icon: 'none', duration: 1500 });
      });
  },

  selectOption(e) {
    const index = e.currentTarget.dataset.index;
    const { currentIndex } = this.data;
    const answers = [...this.data.answers];
    answers[currentIndex] = index;
    
    this.setData({
      selectedAnswer: index,
      answers
    });
  },

  nextQuestion() {
    const { selectedAnswer, currentIndex, questions, answers } = this.data;

    if (selectedAnswer === null) {
      //wx.showToast({ title: '请选择一个选项', icon: 'none' });
      return;
    }

    // 确保当前题答案已写入（防止 selectOption 的异步问题）
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = selectedAnswer;

    if (currentIndex === questions.length - 1) {
      // 最后一题：先同步写入答案，再提交
      this.setData({ answers: updatedAnswers }, () => {
        this.submitAnswers();
      });
      return;
    }

    const nextIndex = currentIndex + 1;
    this.setData({
      answers: updatedAnswers,
      currentIndex: nextIndex,
      selectedAnswer: updatedAnswers[nextIndex] !== undefined ? updatedAnswers[nextIndex] : null
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
      //wx.showToast({ title: '请选择一个选项', icon: 'none' });
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
4. Write a 150-200 word analysis with literary depth and thoughtfulness
5. Use line breaks and emojis to make the response feel human-like and engaging
6. Include encouraging comments about the user's choices where appropriate
7. Response format should be clear and easy to understand

Output format (respond ONLY in this format):
标题：[Destiny type title]
分析：[Detailed analysis with paragraphs and emojis]

Return ONLY the formatted response, no extra content. And the results must in Chinese`;
    //console.log(prompt);
    const app = getApp();
    app.callDeepseekAPI(prompt)
      .then(response => {
        console.log('AI响应:', response);
        const { title, content } = app.parseAnalysisResponse(response);

        this.setData({
          showResult: true,
          isLoading: false,
          resultPage: 0,
          resultIcon: app.getIconByTitle(title),
          resultTitle: title,
          resultContent: content
        });
        this.updateReviewScrollHeight();
        this.updateResultScrollHeight();
        // 延迟初始化结果页角色 canvas（等 swiper 切换后再绘制）
        setTimeout(() => this.initResultCharCanvas(), 300);
      })
      .catch(error => {
        console.error('AI分析失败:', error);
        this.setData({ isLoading: false });
        // API超时或失败时，不显示toast提示
      });
  },

  getIconByTitle(title) {
    return getApp().getIconByTitle(title);
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

  onResultSwiperChange(e) {
    const current = e.detail.current;
    this.setData({ resultPage: current });
    if (current === 0) this.updateReviewScrollHeight();
    if (current === 1) {
      this.updateResultScrollHeight();
      setTimeout(() => this.initResultCharCanvas(), 100);
    }
  },

  initResultCharCanvas() {
    const { characterFrameKey } = this.data;
    if (!characterFrameKey) return;

    const query = this.createSelectorQuery();
    query.select('#resultCharCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;

      const canvasNode = res[0].node;
      const cssWidth = res[0].width;
      const cssHeight = res[0].height;
      const dpr = wx.getSystemInfoSync().pixelRatio || 1;

      canvasNode.width = cssWidth * dpr;
      canvasNode.height = cssHeight * dpr;
      const ctx = canvasNode.getContext('2d');
      ctx.scale(dpr, dpr);

      const { destinyImage, destinyAtlas } = getApp().globalData;
      if (!destinyImage || !destinyAtlas) return;

      const frame = destinyAtlas.frames[characterFrameKey];
      if (!frame) return;

      // 保持比例居中绘制（cover 效果）
      const srcRatio = frame.w / frame.h;
      const dstRatio = cssWidth / cssHeight;
      let sx = frame.x, sy = frame.y, sw = frame.w, sh = frame.h;

      if (srcRatio > dstRatio) {
        // 源图更宽，裁左右
        sw = frame.h * dstRatio;
        sx = frame.x + (frame.w - sw) / 2;
      } else {
        // 源图更高，裁上下
        sh = frame.w / dstRatio;
        sy = frame.y + (frame.h - sh) / 2;
      }

      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.drawImage(destinyImage, sx, sy, sw, sh, 0, 0, cssWidth, cssHeight);
    });
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
