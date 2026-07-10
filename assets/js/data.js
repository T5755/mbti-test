// MBTI 题库与人格数据
// 计分说明：每题极化到某一极(pole)。作答值 r(1..5)：
//   pole 对应极得分 += r；相反极得分 += (6 - r)
// 每个维度两极高和为定值 42，最终占比 = 胜出极 / 42。

// 全量题库：每维度 13 题（共 52），按维度连续排列，便于分档均衡取样
const ALL_QUESTIONS = [
  // EI 外向 / 内向
  { id: 1,  dim: 'EI', pole: 'E', text: '在聚会或社交场合中，我通常精力充沛，也乐于成为焦点。' },
  { id: 2,  dim: 'EI', pole: 'I', text: '独处或安静思考时，我感到最放松，也最能恢复精力。' },
  { id: 3,  dim: 'EI', pole: 'E', text: '我倾向于先行动、边做边想，喜欢把想法说出来与人讨论。' },
  { id: 4,  dim: 'EI', pole: 'I', text: '我更喜欢先想清楚再表达，朋友不在多而在精。' },
  { id: 5,  dim: 'EI', pole: 'E', text: '进入新环境或面对陌生人时，我很快就能自来熟。' },
  { id: 6,  dim: 'EI', pole: 'I', text: '密集社交一整天后，我需要独处来给自己充电。' },
  { id: 7,  dim: 'EI', pole: 'E', text: '我习惯通过说话来整理思路，也喜欢团队头脑风暴。' },
  { id: 29, dim: 'EI', pole: 'E', text: '在群体讨论中我更容易激发灵感，独处太久反而有点无聊。' },
  { id: 30, dim: 'EI', pole: 'I', text: '对我而言，深度的一两知己，远胜过热闹的百人聚会。' },
  { id: 31, dim: 'EI', pole: 'E', text: '遇到开心的事，我第一反应是想分享给很多人。' },
  { id: 32, dim: 'EI', pole: 'I', text: '我常在心里反复斟酌，确定无误才开口表达。' },
  { id: 33, dim: 'EI', pole: 'E', text: '稍显热闹的环境，反而让我思路更活跃。' },
  { id: 34, dim: 'EI', pole: 'I', text: '高强度的社交对我是一种消耗，需要独处来恢复电量。' },

  // SN 实感 / 直觉
  { id: 8,  dim: 'SN', pole: 'S', text: '我更信任具体的事实、细节和亲身经验。' },
  { id: 9,  dim: 'SN', pole: 'N', text: '我更关注可能性、未来趋势和事情背后的含义。' },
  { id: 10, dim: 'SN', pole: 'S', text: '我倾向于按部就班、脚踏实地地把事情做完。' },
  { id: 11, dim: 'SN', pole: 'N', text: '新奇的想法和理论，常常比琐碎细节更吸引我。' },
  { id: 12, dim: 'SN', pole: 'S', text: '我更擅长处理眼前具体、现实的问题。' },
  { id: 13, dim: 'SN', pole: 'N', text: '我喜欢想象“如果……会怎样”，乐于探索各种可能。' },
  { id: 14, dim: 'SN', pole: 'S', text: '我偏好清晰明确的说明，而不是模糊的概括。' },
  { id: 35, dim: 'SN', pole: 'S', text: '我更相信“眼见为实”的具体证据，而非凭空推测。' },
  { id: 36, dim: 'SN', pole: 'N', text: '我常能从一件小事，联想到更宏观的图景。' },
  { id: 37, dim: 'SN', pole: 'S', text: '步骤清晰、可落地的任务，让我最有安全感。' },
  { id: 38, dim: 'SN', pole: 'N', text: '我乐于探讨抽象概念与长远的可能性。' },
  { id: 39, dim: 'SN', pole: 'S', text: '我偏好稳妥可行的方案，而不是天马行空。' },
  { id: 40, dim: 'SN', pole: 'N', text: '隐喻和象征，往往比直白描述更能打动我。' },

  // TF 思考 / 情感
  { id: 15, dim: 'TF', pole: 'T', text: '做决定时，我更看重逻辑与客观事实。' },
  { id: 16, dim: 'TF', pole: 'F', text: '做决定时，我更看重他人的感受与关系和谐。' },
  { id: 17, dim: 'TF', pole: 'T', text: '我倾向于直接、坦诚地指出问题所在。' },
  { id: 18, dim: 'TF', pole: 'F', text: '我很容易察觉别人的情绪，并希望照顾到大家。' },
  { id: 19, dim: 'TF', pole: 'T', text: '我认为公平比“让人舒服”更重要。' },
  { id: 20, dim: 'TF', pole: 'F', text: '维护人际关系的融洽，对我来说很重要。' },
  { id: 21, dim: 'TF', pole: 'T', text: '我习惯用分析的方式来化解冲突。' },
  { id: 41, dim: 'TF', pole: 'T', text: '即便众人都认同，违背逻辑的结论我也难以接受。' },
  { id: 42, dim: 'TF', pole: 'F', text: '做决定时，我会优先考虑会不会伤到相关的人。' },
  { id: 43, dim: 'TF', pole: 'T', text: '我习惯把情绪和判断分开，就事论事。' },
  { id: 44, dim: 'TF', pole: 'F', text: '团队氛围是否和谐，对我的工作状态影响很大。' },
  { id: 45, dim: 'TF', pole: 'T', text: '若批评能指出具体逻辑漏洞，我会很欢迎。' },
  { id: 46, dim: 'TF', pole: 'F', text: '我容易代入他人处境，真切共情他们的难处。' },

  // JP 判断 / 感知
  { id: 22, dim: 'JP', pole: 'J', text: '我喜欢提前计划，把事情安排得井井有条。' },
  { id: 23, dim: 'JP', pole: 'P', text: '我喜欢保持灵活，临场发挥让我更自在。' },
  { id: 24, dim: 'JP', pole: 'J', text: '我倾向于尽早完成任务，不喜欢拖到最后一刻。' },
  { id: 25, dim: 'JP', pole: 'P', text: '我喜欢保留选项，不喜欢被固定计划束缚。' },
  { id: 26, dim: 'JP', pole: 'J', text: '清单和日程表让我感到安心且高效。' },
  { id: 27, dim: 'JP', pole: 'P', text: '我享受自发与即兴带来的惊喜。' },
  { id: 28, dim: 'JP', pole: 'J', text: '我更喜欢有结论、有终点的工作方式。' },
  { id: 47, dim: 'JP', pole: 'J', text: '拖延会让我焦虑，尽早推进才安心。' },
  { id: 48, dim: 'JP', pole: 'P', text: '计划赶不上变化时，我更倾向随机应变。' },
  { id: 49, dim: 'JP', pole: 'J', text: '我习惯把目标拆解成步骤，并跟踪进度。' },
  { id: 50, dim: 'JP', pole: 'P', text: '保留弹性，才能抓住意外出现的机会。' },
  { id: 51, dim: 'JP', pole: 'J', text: '决策之后我倾向尽快落地，而非反复权衡。' },
  { id: 52, dim: 'JP', pole: 'P', text: '开放式、尚无定论的状态，反而让我自在。' },
];

// 测试分档：每档按维度均衡取样，题量越多结果越稳
const TIERS = [
  { key: 'quick',    name: '极速版', perDim: 3,  time: '约 2 分钟',  note: '12 题 · 快速了解大致倾向' },
  { key: 'standard', name: '标准版', perDim: 7,  time: '约 5 分钟',  note: '28 题 · 准确度良好（推荐）' },
  { key: 'pro',      name: '专业版', perDim: 13, time: '约 10 分钟', note: '52 题 · 题量充分，结果更稳' },
];
const TIER_DIMS = ['EI', 'SN', 'TF', 'JP'];
function getTierQuestions(key) {
  const tier = TIERS.find((t) => t.key === key) || TIERS[1];
  const out = [];
  TIER_DIMS.forEach((dim) => {
    ALL_QUESTIONS.filter((q) => q.dim === dim).slice(0, tier.perDim).forEach((q) => out.push(q));
  });
  return out;
}

// 默认题集（标准版），保持向后兼容
const QUESTIONS = getTierQuestions('standard');

// 16 型人格数据
// celebrities / love 为坊间常见说法，仅作趣味参考
const TYPES = {
  ISTJ: { name: '物流师', en: 'Logistician', tagline: '务实可靠的秩序守护者',
    desc: '你务实、负责，重视事实与承诺。喜欢清晰的规则和可预期的结果，是团队里最让人放心的那块基石。',
    strengths: ['可靠守信', '注重细节', '条理清晰'],
    growth: ['偶尔过于固执', '不擅长表达情感', '对变化较抗拒'],
    fields: ['财务 / 审计', '行政管理', '法律 / 合规'],
    celebrities: ['乔治·华盛顿', '安吉拉·默克尔'],
    love: '慢热但长情，用行动而非甜言蜜语表达爱，需要对方给足稳定与信任。' },
  ISFJ: { name: '守卫者', en: 'Defender', tagline: '温暖细心的守护者',
    desc: '你温柔而周到，总在默默照顾身边的人。责任感极强，愿意为在乎的人付出时间与精力。',
    strengths: ['体贴入微', '责任感强', '踏实可靠'],
    growth: ['容易过度付出', '回避正面冲突', '不擅长自我主张'],
    fields: ['医疗护理', '教育', '客户服务'],
    celebrities: ['碧昂丝', '特蕾莎修女'],
    love: '付出型恋人，记住每个细节与纪念日；记得也留出空间照顾自己的需求。' },
  INFJ: { name: '提倡者', en: 'Advocate', tagline: '理想而深邃的引路人',
    desc: '你富有洞察与同理心，心怀坚定的价值信念。看似安静，却能深刻影响他人与世界。',
    strengths: ['深刻洞察', '信念坚定', '善解人意'],
    growth: ['容易自我内耗', '对他人期望偏高', '难以敞开心扉'],
    fields: ['心理咨询', '公益 / NGO', '写作 / 内容'],
    celebrities: ['马丁·路德·金', '泰勒·斯威夫特'],
    love: '渴望灵魂深处的共鸣，宁缺毋滥；给足真诚与深度，你会回报以全部真心。' },
  INTJ: { name: '建筑师', en: 'Architect', tagline: '运筹帷幄的战略家',
    desc: '你独立、理性，擅长在脑中搭建复杂的系统。追求能力与效率，对低效毫无耐心。',
    strengths: ['系统思维', '独立果断', '目标导向'],
    growth: ['显得有些冷漠', '容易过度批判', '不耐低效'],
    fields: ['战略 / 研究', '工程技术', '创业'],
    celebrities: ['埃隆·马斯克', '牛顿'],
    love: '独立又专一，不黏人但认定后极认真；需要思想层面的对等交流。' },
  ISTP: { name: '鉴赏家', en: 'Virtuoso', tagline: '冷静灵巧的探索者',
    desc: '你沉着、灵活，动手能力极强。喜欢拆解世界、亲自验证，临场应变是你的天赋。',
    strengths: ['临场应变', '动手力强', '沉着冷静'],
    growth: ['缺乏长远规划', '回避情感交流', '容易感到厌倦'],
    fields: ['工程 / 技术', '应急救援', '户外运动'],
    celebrities: ['克林特·伊斯特伍德', '米娅·哈姆'],
    love: '安静陪伴型，给彼此空间是最高级的浪漫；别逼他过早承诺。' },
  ISFP: { name: '探险家', en: 'Adventurer', tagline: '温柔的当下艺术家',
    desc: '你温和、审美敏锐，享受当下的美好。不喜冲突，更愿意用行动与作品表达自己。',
    strengths: ['审美敏感', '温柔体贴', '适应力强'],
    growth: ['回避正面冲突', '难做长期承诺', '对批评较敏感'],
    fields: ['设计 / 艺术', '手作 / 匠艺', '自然相关'],
    celebrities: ['迈克尔·杰克逊', '布里特妮·斯皮尔斯'],
    love: '用体验与小事制造浪漫，讨厌被控制；和你一起探索世界最能俘获他心。' },
  INFP: { name: '调停者', en: 'Mediator', tagline: '理想温柔的追梦人',
    desc: '你真诚、善良，内心有片丰盈的天地。重视意义与价值，渴望让世界变得更好一点。',
    strengths: ['富有同理', '创意丰富', '真诚善良'],
    growth: ['容易理想化', '回避现实冲突', '决策时易犹豫'],
    fields: ['写作 / 创作', '心理咨询', '公益'],
    celebrities: ['威廉·莎士比亚', '约翰尼·德普'],
    love: '浪漫而理想化，重视情感连接；需要被理解而非被纠正。' },
  INTP: { name: '逻辑学家', en: 'Logician', tagline: '好奇思辨的思想家',
    desc: '你好奇、理性，热爱拆解概念与逻辑。享受纯粹的思考，对未知永远保持开放。',
    strengths: ['抽象思维强', '客观中立', '热爱学习'],
    growth: ['行动力偏弱', '容易忽视细节', '社交上较为疏离'],
    fields: ['科研', '软件 / 算法', '哲学'],
    celebrities: ['阿尔伯特·爱因斯坦', '查尔斯·达尔文'],
    love: '脑性恋，被智慧吸引；给他自由与讨论空间，比甜言蜜语更动人。' },
  ESTP: { name: '企业家', en: 'Entrepreneur', tagline: '敢闯敢拼的行动派',
    desc: '你精力充沛、务实果断，是天生的行动家。喜欢真实世界里的挑战与刺激。',
    strengths: ['行动迅速', '临场机敏', '善于社交'],
    growth: ['缺乏耐心', '偶尔冒险过度', '忽视长远规划'],
    fields: ['销售 / 创业', '市场营销', '体育 / 竞技'],
    celebrities: ['麦当娜', '厄内斯特·海明威'],
    love: '热烈直接、爱玩爱冒险；一起尝试新鲜刺激，比安稳更让他心动。' },
  ESFP: { name: '表演者', en: 'Entertainer', tagline: '热情洋溢的生活家',
    desc: '你活泼、亲切，天生自带感染力。享受当下、乐于分享，是人群中的快乐源泉。',
    strengths: ['感染力强', '亲切随和', '适应力好'],
    growth: ['容易冲动', '缺乏长远规划', '回避严肃议题'],
    fields: ['演艺 / 活动', '销售', 'hospitality 服务'],
    celebrities: ['玛丽莲·梦露', '杰米·奥利弗'],
    love: '阳光型恋人，把日常过成派对；需要被看见、被欣赏、被热烈回应。' },
  ENFP: { name: '竞选者', en: 'Campaigner', tagline: '热血创意的可能主义者',
    desc: '你热情、富有创意，对人和世界都充满好奇。总能看到可能性，并感染他人一起行动。',
    strengths: ['富有感染力', '创意十足', '真诚热情'],
    growth: ['容易分心', '项目难收尾', '对评价较敏感'],
    fields: ['市场 / 品牌', '创意行业', '公益'],
    celebrities: ['罗宾·威廉姆斯', '昆汀·塔伦蒂诺'],
    love: '热情似火又重灵魂契合，点子不断；需要同样愿意陪你疯、陪你聊的人。' },
  ENTP: { name: '辩论家', en: 'Debater', tagline: '机智善辩的挑战者',
    desc: '你机智、善辩，热衷于打破常规。思维敏捷，把争论当作探索真理的游戏。',
    strengths: ['思维敏捷', '善于创新', '不畏争论'],
    growth: ['容易抬杠', '缺乏耐心', '落地执行偏弱'],
    fields: ['创业', '咨询', '产品 / 策略'],
    celebrities: ['托马斯·爱迪生', '塞斯·罗根'],
    love: '智性恋，享受思想交锋；别把辩论当攻击，要当共同探索。' },
  ESTJ: { name: '总经理', en: 'Executive', tagline: '高效务实的组织者',
    desc: '你高效、可靠，重视秩序与责任。擅长把混乱梳理成流程，是天然的管理者。',
    strengths: ['组织力强', '可靠负责', '直率果断'],
    growth: ['有时过于固执', '不够灵活', '易忽视他人感受'],
    fields: ['管理 / 运营', '金融', '项目执行'],
    celebrities: ['史蒂夫·乔布斯', '约翰·D·洛克菲勒'],
    love: '靠谱担当型，用负责与规划表达爱；偶尔放下控制欲，听听对方的心声。' },
  ESFJ: { name: '执政官', en: 'Consul', tagline: '热心周到的和谐使者',
    desc: '你热心、合作，重视人际和谐。乐于助人、组织周到，是团体里温暖的粘合剂。',
    strengths: ['乐于助人', '组织周到', '社交圆融'],
    growth: ['过度在意外界评价', '回避冲突', '难以拒绝他人'],
    fields: ['教育', '医护', '人力资源'],
    celebrities: ['泰勒·佩里', '詹妮弗·加纳'],
    love: '奉献型伴侣，把对方照顾得无微不至；记得先爱自己，才能爱得更久。' },
  ENFJ: { name: '主人公', en: 'Protagonist', tagline: '魅力利他的激励者',
    desc: '你富有魅力与同理心，天生擅长激励他人。心怀善意却目标坚定，能凝聚起一群人。',
    strengths: ['感染与领导力', '善解人意', '可靠负责'],
    growth: ['容易过度付出', '难以拒绝他人', '易被情绪牵动'],
    fields: ['教育 / 培训', '公益', '团队领导'],
    celebrities: ['奥普拉·温弗瑞', '约翰·传奇'],
    love: '温柔而有力量的引路人，把伴侣捧在手心；也请允许自己被照顾。' },
  ENTJ: { name: '指挥官', en: 'Commander', tagline: '果敢清晰的天生领袖',
    desc: '你果断、战略清晰，天生具备统筹全局的气场。目标明确，追求把事情真正做成。',
    strengths: ['战略清晰', '高效果决', '善于统筹'],
    growth: ['显得有些专断', '缺乏耐心', '易忽视情感细节'],
    fields: ['企业高管 / 创业', '战略咨询', '投资'],
    celebrities: ['拿破仑·波拿巴', '玛格丽特·撒切尔'],
    love: '目标感强的领航者，把关系也当事业经营；偶尔示弱，会让伴侣更靠近你。' },
};

const DIM_LABELS = {
  EI: { E: '外向 E', I: '内向 I' },
  SN: { S: '实感 S', N: '直觉 N' },
  TF: { T: '思考 T', F: '情感 F' },
  JP: { J: '判断 J', P: '感知 P' },
};

// 四维解读模板：renderResult 时按结果字母拼出逐维度解读
const DIM_EXPLAIN = {
  EI: {
    E: '能量来自外部互动，在人群与协作中充电，想说就说、边说边想。',
    I: '能量来自独处与内省，需要自己的安静空间，先想清楚再开口。',
  },
  SN: {
    S: '信任具体事实与亲身经验，关注当下能握住的细节与现实。',
    N: '着迷于可能性与未来趋势，习惯追问“这背后意味着什么”。',
  },
  TF: {
    T: '用逻辑与客观事实做决定，追求公平与truth，直言不讳。',
    F: '用价值与感受做决定，优先考虑关系和谐与他人的心情。',
  },
  JP: {
    J: '喜欢计划与确定性，早早收尾、清单在手才安心。',
    P: '喜欢灵活与开放，保留选项、临场发挥更自在。',
  },
};

// 16 型展示顺序（用于档案页 / 列表）
const TYPE_ORDER = [
  'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP',
];

// 每种类型的典型四维强度：每个数组为 [E%, S%, T%, J%]（首极占比，0~100）
// 用于双人格对比的星象与雷达图，让每个类型形状各异。
const TYPE_PROFILE = {
  INTJ: [30, 28, 62, 68], INTP: [32, 26, 60, 38],
  ENTJ: [72, 30, 64, 70], ENTP: [70, 28, 58, 40],
  INFJ: [34, 30, 42, 66], INFP: [36, 28, 40, 40],
  ENFJ: [70, 32, 42, 68], ENFP: [68, 30, 44, 42],
  ISTJ: [28, 68, 58, 72], ISFJ: [30, 70, 42, 70],
  ESTJ: [70, 66, 60, 74], ESFJ: [68, 68, 44, 72],
  ISTP: [30, 66, 62, 40], ISFP: [34, 64, 42, 42],
  ESTP: [70, 64, 60, 42], ESFP: [68, 66, 46, 44],
};

// 由类型代码推导四维占比（与 computeResult 同形），供可视化复用
const PROFILE_DIMS = ['EI', 'SN', 'TF', 'JP'];
const PROFILE_FIRST = { EI: 'E', SN: 'S', TF: 'T', JP: 'J' };
function typeDims(code) {
  const p = TYPE_PROFILE[code] || [50, 50, 50, 50];
  return PROFILE_DIMS.map((dim, i) => {
    const first = PROFILE_FIRST[dim];
    const second = first === 'E' ? 'I' : first === 'S' ? 'N' : first === 'T' ? 'F' : 'P';
    const win = code[i] === first ? first : second;
    const pct = code[i] === first ? p[i] : 100 - p[i];
    return { dim, win, pct, fromLeft: win === first };
  });
}
