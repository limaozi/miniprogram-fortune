// love.js - 情感咨询测试页面

const LOVE_QUESTIONS = [
  {
    question: "你和伴侣感情稳定，但他在事业上安于现状，而你渴望更积极向上的伴侣。双方父母已开始催婚，你内心犹豫是否要继续这段关系。",
    options: [
      "直接提出分手，寻找与自己价值观更匹配的人。",
      "与伴侣深入沟通，表达对未来的期待，观察他是否愿意调整。",
      "暂时妥协，认为婚姻可以慢慢改变对方。",
      "听从父母建议，先结婚再考虑其他问题。"
    ]
  },
  {
    question: "你刚升任项目主管，工作压力大，但伴侣希望你能多花时间照顾家庭，并暗示“女人应以家庭为重”。",
    options: [
      "坚持自己的职业规划，明确告诉伴侣工作需要投入，要求他分担家务。",
      "主动减少工作量，将重心转向家庭，避免夫妻矛盾。",
      "寻求折中方案，如调整工作节奏，同时与伴侣协商家庭分工。",
      "表面答应伴侣，实际继续专注工作，暂时隐瞒忙碌程度。"
    ]
  },
  {
    question: "婆婆经常未经同意进入你们的卧室整理东西，你感到隐私被侵犯，但伴侣认为“妈妈只是好心”。",
    options: [
      "直接向婆婆提出不满，要求她尊重隐私。",
      "让伴侣出面沟通，避免自己与婆婆产生正面冲突。",
      "忍耐并适应，避免家庭关系紧张。",
      "更换卧室门锁，事后才告知婆婆。"
    ]
  },
  {
    question: "你认为孩子需要自主进食，但伴侣和公婆认为孩子需要喂饭，并指责你“不负责任”。",
    options: [
      "坚持己见，用育儿书籍或专家观点说服家人。",
      "妥协，按家人的方式照顾孩子，放弃自己的理念。",
      "与伴侣私下协商，争取他的支持，再共同与公婆沟通。",
      "表面上听从，趁家人不在时按自己的方式育儿。"
    ]
  },
  {
    question: "周末你计划在家休息，但父母未提前打招呼就直接来访，并开始对你的房间整理、衣柜收纳提出意见，让你感到私人空间被干涉。",
    options: [
      "立即告诉父母自己需要个人空间，希望他们下次提前联系，并停止整理自己的物品。",
      "先感谢父母的关心，再温和说明自己希望独立管理私人空间，建议未来来访前先商量时间。",
      "为避免冲突，暂时接受父母的举动，但通过提议外出吃饭或聊天来转移他们的注意力。",
      "表面上配合父母，事后通过减少联系或找借口避免类似情况再次发生。"
    ]
  }
];

Page({
  data: {
    questions: LOVE_QUESTIONS,
    currentQuestion: 0,
    totalQuestions: 5,
    currentQuestionData: LOVE_QUESTIONS[0],
    selectedOption: null,
    answers: [],
    showResult: false,
    analysis: '',
    isLoading: false,
    loadingText: "正在分析你的关系特质...",
    resultPage: 0,
    reviewScrollHeight: 0,
    resultScrollHeight: 0
  },
  // 重新测试
  restartTest() {
    // 重置状态
    this.setData({
      showResult: false,
      mbtiType: "",
      mbtiDescription: "",
      mbtiShortDescription: "",
      currentQuestion: 0,
      selectedOption: null,
      answers: [],
      resultPage: 0
    });
    
    // 重新生成题目
    this.generateQuestions();
  },
  onLoad() {
    this.updateReviewScrollHeight();
    this.updateResultScrollHeight();
  },
  
  updateReviewScrollHeight() {
    const systemInfo = wx.getSystemInfoSync();
    const windowHeight = systemInfo.windowHeight || 667;
    const rpxRatio = 750 / systemInfo.windowWidth;
    const headerHeight = 150;
    const topPadding = 40;
    const bottomPadding = 40;
    const headerMarginBottom = 30;
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - topPadding - bottomPadding - headerMarginBottom;
    
    this.setData({
      reviewScrollHeight: Math.max(400, scrollViewHeightRpx)
    });
  },
  
  updateResultScrollHeight() {
    const systemInfo = wx.getSystemInfoSync();
    const windowHeight = systemInfo.windowHeight || 667;
    const rpxRatio = 750 / systemInfo.windowWidth;
    const headerHeight = 150;
    const topPadding = 40;
    const bottomPadding = 40;
    const headerMarginBottom = 30;
    const buttonArea = 120;
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - topPadding - bottomPadding - headerMarginBottom - buttonArea;
    
    this.setData({
      resultScrollHeight: Math.max(400, scrollViewHeightRpx)
    });
  },
  
  onResultSwiperChange(e) {
    this.setData({
      resultPage: e.detail.current
    });
  },
  
  selectOption(e) {
    if (this.data.showResult || this.data.isLoading) return;
    this.setData({
      selectedOption: e.currentTarget.dataset.index
    });
  },
  
  nextQuestion() {
    if (this.data.selectedOption === null) {
      wx.showToast({
        title: '请先选择答案',
        icon: 'none'
      });
      return;
    }
    
    const answers = [...this.data.answers];
    answers.push({
      question: this.data.currentQuestionData.question,
      selectedAnswer: this.data.currentQuestionData.options[this.data.selectedOption],
      selectedIndex: this.data.selectedOption
    });
    
    if (this.data.currentQuestion < this.data.totalQuestions - 1) {
      const nextIndex = this.data.currentQuestion + 1;
      this.setData({
        currentQuestion: nextIndex,
        currentQuestionData: this.data.questions[nextIndex],
        answers: answers,
        selectedOption: null
      });
    } else {
      this.submitTest(answers);
    }
  },
  
  submitTest(answers) {
    this.setData({
      isLoading: true,
      loadingText: "正在分析你的关系特质..."
    });
    
    const answersText = answers.map((a, idx) => {
      return `第${idx + 1}题: ${a.question}\n答案: ${a.selectedAnswer}`;
    }).join('\n\n');
    
    const prompt = `Based on the following 5 responses from a female user regarding scenarios in relationships, analyze her characteristics and provide suggestions of 150-200 words in Chinese. Use a feminine and encouraging tone. Use line break and emoji to make the reponse more like human-being's lanuguage. Remember to praise and appreciate users' personalities and behaviors.

${answersText}

Please provide:
1. Analysis of Relationship Traits
2. Relationship Advice (3-5 suggestions)
3. Areas for Improvement

Organize in a clear format for easy understanding.`;

    const app = getApp();
    app.callDeepseekAPI(prompt)
      .then(response => {
        console.log('[callDeepseek] API 响应成功:', response);
        this.setData({
          isLoading: false,
          showResult: true,
          analysis: response,
          answers: answers
        });
      })
      .catch(err => {
        console.error('[callDeepseek] API 调用失败:', err);
        this.setData({
          isLoading: false
        });
        wx.showToast({
          title: '分析失败，请重试',
          icon: 'none'
        });
      });
  },
  
  showError(msg) {
    this.setData({
      isLoading: false
    });
    wx.showToast({
      title: msg,
      icon: 'none'
    });
  },
  
  goHome() {
    wx.redirectTo({
      url: '/pages/home/index'
    });
  }
});
