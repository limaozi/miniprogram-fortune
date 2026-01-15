// mbti.js - MBTI测试页面

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-fb3403d7e4e94fe7815646045c2ca171';
const NVIDIA_DEEPSEEK_API_KEY = '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';
const DEEPSEEK_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Canvas相关变量
let canvas = null;
let ctx = null;
let mbtiImage = null;
let mbtiAtlas = null;
const mbtiImagePath = '/images/mbti.png';
const mbtiAtlasPath = '/images/mbti-atlas.json';

// MBTI题库 - 每个维度5道题，共20道题，随机选择5道
const MBTI_QUESTIONS = [
  // E/I 维度 (外向/内向)
  {
    question: "在社交聚会中，你更倾向于：",
    options: ["主动与陌生人交谈", "只与熟悉的人聊天"],
    dimension: "EI",
    optionA: "E",
    optionB: "I"
  },
  {
    question: "周末你更愿意：",
    options: ["参加聚会或活动", "在家休息或做自己喜欢的事"],
    dimension: "EI",
    optionA: "E",
    optionB: "I"
  },
  {
    question: "做决定时，你更倾向于：",
    options: ["与他人讨论后再决定", "独自思考后决定"],
    dimension: "EI",
    optionA: "E",
    optionB: "I"
  },
  {
    question: "在团队中，你更愿意：",
    options: ["积极参与讨论", "先观察再发言"],
    dimension: "EI",
    optionA: "E",
    optionB: "I"
  },
  {
    question: "面对压力时，你更倾向于：",
    options: ["向他人寻求支持", "独自处理"],
    dimension: "EI",
    optionA: "E",
    optionB: "I"
  },
  
  // S/N 维度 (感觉/直觉)
  {
    question: "你更关注：",
    options: ["具体的事实和细节", "可能性和潜在意义"],
    dimension: "SN",
    optionA: "S",
    optionB: "N"
  },
  {
    question: "阅读时，你更偏好：",
    options: ["直接明了的说明", "富有想象力的故事"],
    dimension: "SN",
    optionA: "S",
    optionB: "N"
  },
  {
    question: "学习新知识时，你更倾向于：",
    options: ["通过实际练习", "通过理论理解"],
    dimension: "SN",
    optionA: "S",
    optionB: "N"
  },
  {
    question: "你更相信：",
    options: ["经验证明的事实", "直觉和灵感"],
    dimension: "SN",
    optionA: "S",
    optionB: "N"
  },
  {
    question: "解决问题时，你更倾向于：",
    options: ["使用已知的方法", "尝试创新的方法"],
    dimension: "SN",
    optionA: "S",
    optionB: "N"
  },
  
  // T/F 维度 (思考/情感)
  {
    question: "做决定时，你更注重：",
    options: ["逻辑和客观分析", "价值观和他人感受"],
    dimension: "TF",
    optionA: "T",
    optionB: "F"
  },
  {
    question: "面对冲突时，你更倾向于：",
    options: ["直接指出问题", "考虑对方感受"],
    dimension: "TF",
    optionA: "T",
    optionB: "F"
  },
  {
    question: "评价他人时，你更看重：",
    options: ["能力和效率", "人品和态度"],
    dimension: "TF",
    optionA: "T",
    optionB: "F"
  },
  {
    question: "工作中，你更重视：",
    options: ["完成任务的质量", "团队和谐的氛围"],
    dimension: "TF",
    optionA: "T",
    optionB: "F"
  },
  {
    question: "批评他人时，你更倾向于：",
    options: ["直接指出错误", "委婉表达建议"],
    dimension: "TF",
    optionA: "T",
    optionB: "F"
  },
  
  // J/P 维度 (判断/感知)
  {
    question: "你更偏好：",
    options: ["有计划的生活", "灵活自由的生活"],
    dimension: "JP",
    optionA: "J",
    optionB: "P"
  },
  {
    question: "面对截止日期，你更倾向于：",
    options: ["提前完成", "在截止前完成"],
    dimension: "JP",
    optionA: "J",
    optionB: "P"
  },
  {
    question: "旅行时，你更愿意：",
    options: ["制定详细计划", "随性探索"],
    dimension: "JP",
    optionA: "J",
    optionB: "P"
  },
  {
    question: "工作方式上，你更倾向于：",
    options: ["按计划执行", "根据情况调整"],
    dimension: "JP",
    optionA: "J",
    optionB: "P"
  },
  {
    question: "你更享受：",
    options: ["完成任务的成就感", "探索过程的新鲜感"],
    dimension: "JP",
    optionA: "J",
    optionB: "P"
  }
];

// MBTI类型描述
const MBTI_DESCRIPTIONS = {
  "INTJ": "建筑师 - 富有想象力和战略性的思想家，对自己的计划坚定不移。",
  "INTP": "逻辑学家 - 具有创新精神的思想家，对知识有着不可抑制的渴望。",
  "ENTJ": "指挥官 - 大胆、富有想象力且意志坚强的领导者，总能找到或创造解决方法。",
  "ENTP": "辩论家 - 聪明好奇的思想家，从不回避智力上的挑战。",
  "INFJ": "提倡者 - 富有创造力和洞察力的理想主义者，总是准备着帮助他人。",
  "INFP": "调停者 - 诗意、善良的利他主义者，总是热情地为好的事业提供帮助。",
  "ENFJ": "主人公 - 富有魅力、鼓舞人心的领导者，有使听众着迷的能力。",
  "ENFP": "竞选者 - 热情、有创造力且社交自由的人，永远不会被生活所困。",
  "ISTJ": "物流师 - 实用且注重事实的人，可靠性无可争议。",
  "ISFJ": "守卫者 - 非常专注而温暖的保护者，随时准备保护所爱的人。",
  "ESTJ": "总经理 - 出色的管理者，在管理事物或人员方面无与伦比。",
  "ESFJ": "执政官 - 极有同情心、受欢迎且尽责的人，总是热情地为他人提供帮助。",
  "ISTP": "鉴赏家 - 大胆而实用的实验家，善于使用各种工具。",
  "ISFP": "探险家 - 灵活而迷人的艺术家，随时准备探索新的可能性。",
  "ESTP": "企业家 - 聪明、精力充沛且善于感知的人，真正享受生活。",
  "ESFP": "表演者 - 自发的、精力充沛且热情的人，生活永远不会无聊。"
};

// 随机选择5道题，确保每个维度至少有一道题
function getRandomQuestions() {
  // 按维度分组
  const questionsByDimension = {
    EI: MBTI_QUESTIONS.filter(q => q.dimension === 'EI'),
    SN: MBTI_QUESTIONS.filter(q => q.dimension === 'SN'),
    TF: MBTI_QUESTIONS.filter(q => q.dimension === 'TF'),
    JP: MBTI_QUESTIONS.filter(q => q.dimension === 'JP')
  };
  
  // 从每个维度随机选择一道题
  const selected = [];
  const dimensions = ['EI', 'SN', 'TF', 'JP'];
  dimensions.forEach(dim => {
    const dimQuestions = questionsByDimension[dim];
    const randomIndex = Math.floor(Math.random() * dimQuestions.length);
    selected.push(dimQuestions[randomIndex]);
  });
  
  // 从所有题目中随机选择第5道题
  const remaining = MBTI_QUESTIONS.filter(q => !selected.includes(q));
  const randomIndex = Math.floor(Math.random() * remaining.length);
  selected.push(remaining[randomIndex]);
  
  // 打乱顺序
  return selected.sort(() => Math.random() - 0.5);
}

Page({
  data: {
    questions: [],
    currentQuestion: 0,
    totalQuestions: 5,
    currentQuestionData: {},
    selectedOption: null,
    answers: [],
    showResult: false,
    mbtiType: "",
    mbtiDescription: "",
    isLoading: false,
    loadingText: "正在生成测试题目...",
    resultPage: 0, // 结果页面索引：0=回顾页，1=结果页
    reviewScrollHeight: 0, // 回顾页面scroll-view高度
    resultScrollHeight: 0 // 结果页面scroll-view高度
  },
  
  onLoad() {
    // 调用API生成5道问题
    this.generateQuestions();
    // 计算scroll-view高度
    this.updateReviewScrollHeight();
    this.updateResultScrollHeight();
  },
  
  // 计算并设置回顾页面scroll-view的高度
  updateReviewScrollHeight() {
    const sys = wx.getSystemInfoSync();
    const windowHeight = sys.windowHeight || 667;
    const rpxRatio = 750 / sys.windowWidth;
    // 计算可用高度：窗口高度 - 头部高度(约 150rpx) - 顶部padding(40rpx) - 底部padding(40rpx) - header margin-bottom(30rpx)
    const headerHeight = 150; // header本身高度
    const topPadding = 40;
    const bottomPadding = 40;
    const headerMarginBottom = 30;
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - topPadding - bottomPadding - headerMarginBottom;
    
    this.setData({
      reviewScrollHeight: Math.max(400, scrollViewHeightRpx)
    });
    
    console.log('[updateReviewScrollHeight] 设置 scroll-view 高度:', {
      windowHeight,
      rpxRatio,
      scrollViewHeightRpx: this.data.reviewScrollHeight
    });
  },
  
  // 计算并设置结果页面scroll-view的高度
  updateResultScrollHeight() {
    const sys = wx.getSystemInfoSync();
    const windowHeight = sys.windowHeight || 667;
    const rpxRatio = 750 / sys.windowWidth;
    // 计算可用高度：窗口高度 - 头部高度(约 150rpx) - 顶部padding(40rpx) - 底部padding(40rpx) - header margin-bottom(30rpx) - 按钮区域(约 240rpx) - 按钮margin-bottom(20rpx)
    const headerHeight = 150;
    const topPadding = 40;
    const bottomPadding = 40;
    const headerMarginBottom = 30;
    const buttonArea = 240;
    const buttonMarginBottom = 20;
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - topPadding - bottomPadding - headerMarginBottom - buttonArea - buttonMarginBottom;
    
    this.setData({
      resultScrollHeight: Math.max(400, scrollViewHeightRpx)
    });
    
    console.log('[updateResultScrollHeight] 设置 scroll-view 高度:', {
      windowHeight,
      rpxRatio,
      scrollViewHeightRpx: this.data.resultScrollHeight
    });
  },
  
  // 结果页面swiper切换
  onResultSwiperChange(e) {
    const current = e.detail.current;
    this.setData({
      resultPage: current
    });
    
    // 如果切换到回顾页面，更新scroll-view高度
    if (current === 0) {
      this.updateReviewScrollHeight();
    }
    
    // 如果切换到结果页面，更新scroll-view高度并延迟绘制图片
    if (current === 1 && this.data.mbtiType) {
      this.updateResultScrollHeight();
      setTimeout(() => {
        if (!canvas) {
          this.initCanvas();
        }
        if (mbtiImage && mbtiAtlas) {
          this.drawMBTIImage(this.data.mbtiType);
        } else {
          const checkAndDraw = () => {
            if (mbtiImage && mbtiAtlas && canvas && ctx) {
              this.drawMBTIImage(this.data.mbtiType);
            } else {
              setTimeout(checkAndDraw, 50);
            }
          };
          checkAndDraw();
        }
      }, 200);
    }
  },
  
  // 第一次调用API：生成5道MBTI测试问题
  generateQuestions() {
    this.setData({
      isLoading: true,
      loadingText: "正在生成测试题目..."
    });
    
    const prompt = `Please generate 5 MBTI personality test questions. Requirements:
1. Each question should have 2 options
2. Questions should cover all four MBTI dimensions: E/I (Extraversion/Introversion), S/N (Sensing/Intuition), T/F (Thinking/Feeling), J/P (Judging/Perceiving)
3. Ensure at least one question from each dimension
4. Questions should be relatable to daily life and easy to understand
5. Return format should be a JSON array, each question containing:
   - question: question content
   - options: array of options (2 options)
   - dimension: dimension it belongs to (EI/SN/TF/JP)
   - optionA: MBTI tendency for the first option (E/I/S/N/T/F/J/P)
   - optionB: MBTI tendency for the second option

IMPORTANT: All questions and options must be written in Chinese. Only return the JSON array, no other text.`;

    this.callDeepseekAPI(prompt)
      .then(response => {
        try {
          // 尝试解析JSON
          let questions = [];
          
          // 尝试从响应中提取JSON
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0]);
            console.log(questions);
          } else {
            // 如果无法解析，使用备用题目
            console.warn('无法解析API返回的题目，使用备用题目');
            questions = getRandomQuestions();
          }
          
          // 验证题目格式
          if (!Array.isArray(questions) || questions.length === 0) {
            questions = getRandomQuestions();
          }
          
          // 确保有5道题
          if (questions.length < 5) {
            const backup = getRandomQuestions();
            questions = questions.concat(backup.slice(0, 5 - questions.length));
          }
          questions = questions.slice(0, 5);
          
          this.setData({
            questions: questions,
            currentQuestionData: questions[0],
            answers: [],
            isLoading: false
          });
        } catch (error) {
          console.error('解析题目失败:', error);
          // 使用备用题目
          const randomQuestions = getRandomQuestions();
          this.setData({
            questions: randomQuestions,
            currentQuestionData: randomQuestions[0],
            answers: [],
            isLoading: false
          });
        }
      })
      .catch(error => {
        console.error('生成题目失败:', error);
        // 使用备用题目
        const randomQuestions = getRandomQuestions();
        this.setData({
          questions: randomQuestions,
          currentQuestionData: randomQuestions[0],
          answers: [],
          isLoading: false
        });
      });
  },
  
  // 调用DeepSeek API
  callDeepseekAPI(prompt) {
    return new Promise((resolve, reject) => {
      try {
        if (!wx || !wx.request) {
          reject(new Error('小程序环境不支持'));
          return;
        }

        wx.request({
          url: DEEPSEEK_API_URL,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${NVIDIA_DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          data: {
            model: 'deepseek-ai/deepseek-r1',
            messages: [
              { role: 'system', content: prompt }
            ],
            temperature: 0.7,
            top_p: 0.8,
            max_tokens: 4096,
            stream: false
          },
          success: (res) => {
            console.log('[callDeepseekAPI] API 响应:', res);
            if (res.statusCode === 200 && res.data) {
              const content = res.data.choices?.[0]?.message?.content || '';
              if (content) {
                resolve(content);
              } else {
                console.error('[callDeepseekAPI] 响应中没有内容:', res.data);
                reject(new Error('API 返回数据格式异常'));
              }
            } else {
              console.error('[callDeepseekAPI] API 请求失败:', res.statusCode, res.data);
              reject(new Error(`API 请求失败 (状态码: ${res.statusCode})`));
            }
          },
          fail: (err) => {
            console.error('[callDeepseekAPI] 请求失败:', err);
            reject(new Error('网络请求失败'));
          }
        });
      } catch (e) {
        console.error('[callDeepseekAPI] 调用出错:', e);
        reject(e);
      }
    });
  },
  
  onReady() {
    // 初始化canvas并加载资源
    this.initCanvas();
  },
  
  // 初始化canvas
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#mbtiCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          // 如果canvas不存在（可能还没显示结果），延迟重试
          setTimeout(() => this.initCanvas(), 100);
          return;
        }
        
        const canvasNode = res[0].node;
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const width = res[0].width;
        const height = res[0].height;
        
        canvas = canvasNode;
        ctx = canvasNode.getContext('2d');
        
        canvasNode.width = width * dpr;
        canvasNode.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        // 加载MBTI资源
        this.loadMBTIResources();
      });
  },
  
  // 加载MBTI图片和atlas数据
  loadMBTIResources() {
    if (!canvas) {
      return;
    }
    
    // 加载JSON
    const loadJson = () => {
      return new Promise((resolve, reject) => {
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: mbtiAtlasPath,
          encoding: 'utf-8',
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              resolve(data);
            } catch (e) {
              reject(e);
            }
          },
          fail: reject
        });
      });
    };
    
    // 加载图片
    const loadImage = () => {
      return new Promise((resolve, reject) => {
        const img = canvas.createImage();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = mbtiImagePath;
      });
    };
    
    Promise.all([loadJson(), loadImage()])
      .then(([atlas, img]) => {
        mbtiAtlas = atlas;
        mbtiImage = img;
        // 如果已有结果，绘制图片
        if (this.data.mbtiType) {
          this.drawMBTIImage(this.data.mbtiType);
        }
      })
      .catch(err => {
        console.error('加载MBTI资源失败:', err);
      });
  },
  
  // 绘制MBTI图片
  drawMBTIImage(mbtiType) {
    if (!canvas || !ctx || !mbtiImage || !mbtiAtlas) {
      return;
    }
    
    const frame = mbtiAtlas.frames[mbtiType];
    if (!frame) {
      console.error('未找到MBTI类型:', mbtiType);
      return;
    }
    
    // 获取canvas显示尺寸（rpx转px）
    const query = wx.createSelectorQuery();
    query.select('#mbtiCanvas')
      .boundingClientRect()
      .exec((res) => {
        if (!res[0]) return;
        
        const displayWidth = res[0].width;
        const displayHeight = res[0].width; // 保持正方形
        
        // 清空canvas
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        
        // 绘制图片
        ctx.drawImage(
          mbtiImage,
          frame.x, frame.y, frame.w, frame.h,
          0, 0, displayWidth, displayHeight
        );
      });
  },
  
  // 选择选项
  selectOption(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedOption: index
    });
  },
  
  // 下一题或提交
  nextQuestion() {
    if (this.data.selectedOption === null) {
      return;
    }
    
    const currentQ = this.data.questions[this.data.currentQuestion];
    const answer = {
      dimension: currentQ.dimension,
      choice: this.data.selectedOption === 0 ? currentQ.optionA : currentQ.optionB
    };
    
    const answers = [...this.data.answers, answer];
    
    if (this.data.currentQuestion < this.data.totalQuestions - 1) {
      // 下一题
      this.setData({
        currentQuestion: this.data.currentQuestion + 1,
        currentQuestionData: this.data.questions[this.data.currentQuestion + 1],
        selectedOption: null,
        answers: answers
      });
    } else {
      // 提交测试，先保存答案，再计算MBTI类型
      this.setData({
        answers: answers
      }, () => {
        this.submitTest(answers);
      });
    }
  },
  
  // 提交测试并调用API获取MBTI类型和解释
  submitTest(answers) {
    this.setData({
      isLoading: true,
      loadingText: "正在分析您的性格类型..."
    });
    
    // 构建题目和答案的文本
    const questionsText = this.data.questions.map((q, index) => {
      const answer = answers[index];
      const selectedOption = answer.choice === q.optionA ? q.options[0] : q.options[1];
      return `问题${index + 1}：${q.question}\n选项：${q.options.join(' / ')}\n您的选择：${selectedOption}`;
    }).join('\n\n');
    
    const prompt = `Based on the following MBTI test questions and user's answers, determine the user's MBTI personality type and generate an encouraging explanation.

Test questions and answers:
${questionsText}

Requirements:
1. Determine the user's MBTI type based on the answers (one of 16 types: INTJ, INTP, ENTJ, ENTP, INFJ, INFP, ENFJ, ENFP, ISTJ, ISFJ, ESTJ, ESFJ, ISTP, ISFP, ESTP, ESFP)
2. Generate an encouraging explanation of 200-300 words, describing the characteristics and strengths of this personality type in a warm, positive, and encouraging tone
3. Return format should be a JSON object:
   {
     "type": "MBTI type (e.g., INTJ)",
     "description": "encouraging explanation text"
   }

IMPORTANT: The type should be in English (e.g., INTJ), but the description must be written in Chinese. Only return the JSON object, no other text.`;

    this.callDeepseekAPI(prompt)
      .then(response => {
        try {
          // 尝试解析JSON
          let result = null;
          
          // 尝试从响应中提取JSON
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          }
          
          // 验证结果
          if (!result || !result.type || !result.description) {
            // 如果解析失败，使用备用方法计算
            result = this.calculateMBTIType(answers);
          }
          
          const mbtiType = result.type || this.calculateMBTIType(answers).type;
          const description = result.description || MBTI_DESCRIPTIONS[mbtiType] || "您的性格类型：" + mbtiType;
          
          this.setData({
            showResult: true,
            mbtiType: mbtiType,
            mbtiDescription: description,
            isLoading: false,
            resultPage: 0 // 默认显示回顾页面
          }, () => {
            // 更新scroll-view高度
            this.updateReviewScrollHeight();
          });
        } catch (error) {
          console.error('解析结果失败:', error);
          // 使用备用方法计算
          const result = this.calculateMBTIType(answers);
          this.setData({
            showResult: true,
            mbtiType: result.type,
            mbtiDescription: result.description,
            isLoading: false,
            resultPage: 0 // 默认显示回顾页面
          }, () => {
            // 更新scroll-view高度
            this.updateReviewScrollHeight();
          });
        }
      })
      .catch(error => {
        console.error('获取结果失败:', error);
        // 使用备用方法计算
        const result = this.calculateMBTIType(answers);
        this.setData({
          showResult: true,
          mbtiType: result.type,
          mbtiDescription: result.description,
          isLoading: false,
          resultPage: 0 // 默认显示回顾页面
        }, () => {
          // 更新scroll-view高度
          this.updateReviewScrollHeight();
          setTimeout(() => {
            if (!canvas) {
              this.initCanvas();
            }
            if (mbtiImage && mbtiAtlas) {
              this.drawMBTIImage(result.type);
            }
          }, 200);
        });
      });
  },
  
  // 备用方法：计算MBTI类型（当API失败时使用）
  calculateMBTIType(answers) {
    // 统计每个维度的得分
    const scores = {
      E: 0, I: 0,
      S: 0, N: 0,
      T: 0, F: 0,
      J: 0, P: 0
    };
    
    answers.forEach(answer => {
      scores[answer.choice]++;
    });
    
    // 确定每个维度的类型
    const ei = scores.E >= scores.I ? 'E' : 'I';
    const sn = scores.S >= scores.N ? 'S' : 'N';
    const tf = scores.T >= scores.F ? 'T' : 'F';
    const jp = scores.J >= scores.P ? 'J' : 'P';
    
    const mbtiType = ei + sn + tf + jp;
    const description = MBTI_DESCRIPTIONS[mbtiType] || "您的性格类型：" + mbtiType;
    
    return { type: mbtiType, description: description };
  },
  
  // 重新测试
  restartTest() {
    // 重置状态
    this.setData({
      showResult: false,
      mbtiType: "",
      mbtiDescription: "",
      currentQuestion: 0,
      selectedOption: null,
      answers: [],
      resultPage: 0
    });
    
    // 重新生成题目
    this.generateQuestions();
  },
  
  // 返回首页
  goBack() {
    wx.navigateBack();
  }
});
