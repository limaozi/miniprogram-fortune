Page({
  data: {
    questions: [
      { question: "请选择您的年龄范围", options: ["<25岁", "25-30岁", "30-35岁", "35-40岁", "40-45岁", ">45岁"] },
      { question: "请选择您的身高范围", options: ["<150cm", "150-155cm", "155-160cm", "160-165cm", "165-170cm", ">170cm"] },
      { question: "请选择您的体重范围", options: ["<45kg", "45-50kg", "50-55kg", "55-60kg", "60-65kg", ">65kg"] },
      { question: "请选择您的脸型", options: ["圆形", "瓜子脸", "方形", "菱形"] },
      { question: "请选择您的头发长度", options: ["短发", "中长发", "长发", "光头"] },
      { question: "请选择您的肤色", options: ["白皙", "偏白", "偏黄", "古铜", "小麦色", "黝黑"] },
      { question: "请选择您喜欢的色系", options: ["冷色系", "暖色系", "中性色", "高饱和色", "低饱和色", "混合风格"] }
    ],
    currentQuestion: 0,
    totalQuestions: 7,
    currentQuestionData: {},
    currentOptionsDecorated: [],
    selectedOption: null,
    answers: [],
    showResult: false,
    styleSuggestion: "",
    isLoading: false,
    loadingText: "正在生成穿搭建议...",
    resultPage: 0,
    reviewScrollHeight: 1200,
    resultScrollHeight: 1200,
    swiperHeight: 1200
  },
  onLoad() {
    const sys = wx.getSystemInfoSync();
    const rpxH = Math.floor(sys.windowHeight * 750 / sys.windowWidth);
    
    // 计算scroll-view高度：窗口高度 - 头部高度(约 150rpx) - 底部按钮区域(约 240rpx)
    const headerHeight = 150;
    const buttonArea = 240;
    const scrollHeight = rpxH - headerHeight - buttonArea;
    
    this.setData({
      currentQuestionData: this.data.questions[0],
      reviewScrollHeight: Math.max(400, scrollHeight),
      resultScrollHeight: Math.max(400, scrollHeight),
      swiperHeight: rpxH,
      currentOptionsDecorated: this.decorateOptions(this.data.questions[0].question, this.data.questions[0].options)
    });
  },
  decorateOptions(question, options) {
    const isSkin = question.indexOf("肤色") !== -1;
    const isPalette = question.indexOf("色系") !== -1;
    const skinColors = {
      "白皙": "#f7e3c5",
      "偏白": "#f3d6b8",
      "偏黄": "#e2c288",
      "古铜": "#b8804a",
      "小麦色": "#c89a6b",
      "黝黑": "#4b3a2b"
    };
    const paletteGradients = {
      "冷色系": "linear-gradient(135deg, #667eea 0%, #43cea2 100%)",
      "暖色系": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "中性色": "linear-gradient(135deg, #e0e0e0 0%, #9e9e9e 100%)",
      "高饱和色": "linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)",
      "低饱和色": "linear-gradient(135deg, #b2bec3 0%, #636e72 100%)",
      "混合风格": "linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)"
    };
    return options.map(text => ({
      text,
      bg: isSkin ? (skinColors[text] || null) : (isPalette ? (paletteGradients[text] || null) : null)
    }));
  },
  selectOption(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ selectedOption: idx });
  },
  nextQuestion() {
    const { currentQuestion, selectedOption, answers, questions, totalQuestions } = this.data;
    if (selectedOption === null) return;
    const answer = {
      index: currentQuestion,
      choice: questions[currentQuestion].options[selectedOption],
      question: questions[currentQuestion].question,
      bg: this.data.currentOptionsDecorated[selectedOption].bg
    };
    const newAnswers = answers.slice();
    newAnswers[currentQuestion] = answer;
    if (currentQuestion < totalQuestions - 1) {
      const nextIdx = currentQuestion + 1;
      this.setData({
        answers: newAnswers,
        currentQuestion: nextIdx,
        currentQuestionData: questions[nextIdx],
          currentOptionsDecorated: this.decorateOptions(questions[nextIdx].question, questions[nextIdx].options),
        selectedOption: null
      });
    } else {
      this.setData({
        answers: newAnswers,
        isLoading: true
      });
      this.generateSuggestion(newAnswers);
    }
  },
  restartTest() {
    this.setData({
      currentQuestion: 0,
      currentQuestionData: this.data.questions[0],
      selectedOption: null,
      answers: [],
      showResult: false,
      styleSuggestion: "",
      isLoading: false
    });
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  generateSuggestion(answers) {
    const summary = answers.map(a => `${a.question}：${a.choice}`).join("\n");
    const app = getApp();
    const global = app && app.globalData ? app.globalData : {};
    const { currentDateStr, currentSeasonEn, currentSeasonZh } = global;
    const dateSeasonContext = currentDateStr
      ? `Today is ${currentDateStr}, and the current season is ${currentSeasonEn || 'unknown'} (${currentSeasonZh || ''}). Please make sure the outfit suggestions fit this specific date and season (for example, temperature, atmosphere, and typical activities in this time of year). All your response MUST be in Chinese.`
      : `All your response MUST be in Chinese.`;

    const prompt = `You are a professional fashion stylist.
${dateSeasonContext}
Based on the following user basic information, generate outfit suggestions in Chinese, 150-200 words, using a friendly, feminine and encouraging tone. Remember to praise the user's look from the beginning. Include specific types of clothing, cuts, color combinations, and material recommendations, and suggest suitable occasions (commuting/casual/dating/sports). Use emoji and line breaks to be more like human conversation. Do not include any thinking or reasoning process - only provide the final suggestion.

User info:
${summary}
`;
    console.log(prompt);
    //const app = getApp();
    
    try {
      app.callDeepseekAPI(prompt)
        .then(content => {
          const cleanedContent = content.replace(/[\s\S]*?<\/think>/, '').trim();
          this.setData({
            showResult: true,
            styleSuggestion: cleanedContent,
            isLoading: false,
            resultPage: 0
          });
        })
        .catch(error => {
          console.error('API调用失败:', error);
          const fallback = "建议选择简洁有型的基础款进行搭配：上衣可选合身T恤或衬衫，搭配直筒或锥形长裤；色彩以黑白灰与低饱和色为主，适当加入点缀色提升层次。材质可选棉麻或轻薄针织，既舒适又有质感。通勤建议衬衫+西裤，休闲选择T恤+牛仔或工装，约会可增加软糯针织或小香风元素，运动选择速干面料。根据身形比例注意上短下长或高腰线，鞋履选择简洁的运动鞋或乐福鞋。";
          this.setData({
            showResult: true,
            styleSuggestion: fallback,
            isLoading: false,
            resultPage: 0
          });
        });
    } catch (error) {
      console.error('调用API时出错:', error);
      const fallback = "建议选择简洁有型的基础款进行搭配：上衣可选合身T恤或衬衫，搭配直筒或锥形长裤；色彩以黑白灰与低饱和色为主，适当加入点缀色提升层次。材质可选棉麻或轻薄针织，既舒适又有质感。通勤建议衬衫+西裤，休闲选择T恤+牛仔或工装，约会可增加软糯针织或小香风元素，运动选择速干面料。根据身形比例注意上短下长或高腰线，鞋履选择简洁的运动鞋或乐福鞋。";
      this.setData({
        showResult: true,
        styleSuggestion: fallback,
        isLoading: false,
        resultPage: 0
      });
    }
  },
  onResultSwiperChange(e) {
    this.setData({ resultPage: e.detail.current || 0 });
  }
});
