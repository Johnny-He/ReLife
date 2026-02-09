import type { Character } from '../types'

// 完整 15 個角色
export const characters: Character[] = [
  // === 低收入戶 ===
  {
    id: 'chen-jian-zhi',
    name: '陳建志',
    gender: 'male',
    initialMoney: 3000,
    initialStats: {
      intelligence: 4,
      stamina: 6,
      charisma: 5,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是農夫，母親是艾薇家的幫傭。王漢堯去他家作客的時候，從來沒拿水果出來請他吃過，是個摳門的人，但還是很善良。跟柯若亞同班，全班同學都因為建志窮而歧視他，只有若亞沒有，所以建志喜歡若亞，雖然很摳門，但是會拿水果請柯若亞吃。',
    familyExpectation: '成為農產大亨',
    personalDream: '跟柯若亞結婚',
  },
  {
    id: 'zheng-an-qi',
    name: '鄭安琪',
    gender: 'female',
    initialMoney: 2000,
    initialStats: {
      intelligence: 6,
      stamina: 4,
      charisma: 7,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親已故，母親是夜市攤販（跟建志父批貨）。討厭陳建志，因他爸老是批貨給他媽比較爛又貴的菜，窮人相輕。常去吳欣怡家，看到他媽媽很強，因此想當工程師。',
    familyExpectation: '當公務員，擁有穩定的生活',
    personalDream: '當工程師',
  },
  {
    id: 'yao-xin-bei',
    name: '姚欣蓓',
    gender: 'female',
    initialMoney: 2000,
    initialStats: {
      intelligence: 7,
      stamina: 7,
      charisma: 5,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親終日酗酒待業在家，對其母極差。母親是超商店員。因為爸爸是無業遊民所以被瞧不起，因此立誓賺大錢讓大家心服口服！自尊心強，愛面子。',
    familyExpectation: '嫁給擁有 $50,000 的有錢人',
    personalDream: '賺到 $100,000',
  },

  // === 有錢人 ===
  {
    id: 'chen-dong-ming',
    name: '陳東明',
    gender: 'male',
    initialMoney: 8000,
    initialStats: {
      intelligence: 5,
      stamina: 7,
      charisma: 3,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是公務員，母親是醫生。跟趙柏謙、趙柏軒兩兄弟不合。',
    familyExpectation: '平安長大',
    personalDream: '勝過趙柏謙、趙柏軒',
  },
  {
    id: 'ke-ruo-ya',
    name: '柯若亞',
    gender: 'female',
    initialMoney: 10000,
    initialStats: {
      intelligence: 8,
      stamina: 4,
      charisma: 6,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是董事長，母親是家庭主婦。小時候死過一隻狗狗，加上爸爸非常討厭動物。回家途中偶然看見陳建志善良對待路邊的小狗，因此產生好感。兒童節出生，天真，但有點不切實際。',
    familyExpectation: '接管家族企業，當企業家',
    personalDream: '養哈士奇',
  },
  {
    id: 'lu-bing-yan',
    name: '盧秉諺',
    gender: 'male',
    initialMoney: 10000,
    initialStats: {
      intelligence: 4,
      stamina: 7,
      charisma: 4,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是黑道，母親是家庭主婦。喜歡梁思妤，但是因為父母職業的關係，所以跟梁思妤不講話。媽媽跟柯若亞的媽媽都是三姑六婆，所以是好朋友。外表酷酷，實際上怪怪的，會對某種事情特別堅持。很善良，不想繼承家業。',
    familyExpectation: '跟柯若亞結婚',
    personalDream: '跟梁思妤結婚',
  },

  // === 一般人 ===
  {
    id: 'xu-rui-he',
    name: '許睿和',
    gender: 'male',
    initialMoney: 7000,
    initialStats: {
      intelligence: 8,
      stamina: 5,
      charisma: 4,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父母都是老師。跟王漢堯是朋友，因為媽媽都是老師。看不慣馬飛颺太花心。從小不受歡迎，想成為魔術師大受歡迎。',
    familyExpectation: '五育均衡',
    personalDream: '當知名魔術師',
  },
  {
    id: 'liang-si-yu',
    name: '梁思妤',
    gender: 'female',
    initialMoney: 5000,
    initialStats: {
      intelligence: 7,
      stamina: 5,
      charisma: 7,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是警察，母親已故。討厭盧秉諺，覺得爸爸是黑道很糟糕。因為體弱多病從小常進醫院，覺得醫生都很溫柔，所以也想成為那樣的人。',
    familyExpectation: '成為最後一個存活者',
    personalDream: '當醫生',
  },
  {
    id: 'ma-fei-yang',
    name: '馬飛颺',
    gender: 'male',
    initialMoney: 8000,
    initialStats: {
      intelligence: 4,
      stamina: 4,
      charisma: 8,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是作曲家，母親是歌手。爸爸媽媽都很做自己，所以他也很做自己。個性浪漫，愛搭訕女孩子。跟姚欣蓓是青梅竹馬。爸媽發現他也很有音樂天分，希望他可以也成為歌手。',
    familyExpectation: '知名歌手',
    personalDream: '結婚 2 次',
  },
  {
    id: 'wu-xin-yi',
    name: '吳欣怡',
    gender: 'female',
    initialMoney: 7000,
    initialStats: {
      intelligence: 2,
      stamina: 7,
      charisma: 4,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是工頭，母親是工程師。爸爸本來也是工程師，結果被裁員，因此媽媽瞧不起爸爸。因此希望女兒也跟她一樣成為成功的工程師，殊不知女兒極笨，所以不太理女兒，埋頭做自己的工作。從小因為笨而自卑，想變聰明。',
    familyExpectation: '成功的工程師',
    personalDream: '智力 > 30',
  },
  {
    id: 'zhao-bo-qian',
    name: '趙柏謙',
    gender: 'male',
    initialMoney: 5000,
    initialStats: {
      intelligence: 6,
      stamina: 3,
      charisma: 7,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是魔術師，母親是舞者。跟弟弟一起喜歡莊語澄。跟弟弟都是愛霸凌人的壞孩子。調皮、自大。',
    familyExpectation: '繼承當偉大的魔術師',
    personalDream: '跟莊語澄結婚',
  },
  {
    id: 'su-xun-jie',
    name: '蘇薰潔',
    gender: 'female',
    initialMoney: 6000,
    initialStats: {
      intelligence: 4,
      stamina: 6,
      charisma: 7,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是廟公，母親是律師。不准打東東。覺得東東太可憐了，希望完成東東的夢想。有正義感，但比較固執。',
    familyExpectation: '跟平凡人結婚',
    personalDream: '完成陳東明的夢想',
  },
  {
    id: 'wang-han-yao',
    name: '王漢堯',
    gender: 'male',
    initialMoney: 5500,
    initialStats: {
      intelligence: 6,
      stamina: 6,
      charisma: 6,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是漁夫，母親是老師。從小就是衰人，常常跌倒。被梁思妤喜歡，被盧秉諺討厭，常常覺得會被打。討厭梁思妤，因為是情敵。看似 S 其實是 M。',
    familyExpectation: '成為警察，制衡盧秉諺',
    personalDream: '跟盧秉諺在一起',
  },
  {
    id: 'zhuang-yu-cheng',
    name: '莊語澄',
    gender: 'female',
    initialMoney: 5500,
    initialStats: {
      intelligence: 7,
      stamina: 2,
      charisma: 6,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是超商店長，母親是公務員。班長兼模範生。跟姚欣蓓是朋友，莊語澄喜歡把姚欣蓓當小妹使喚，姚欣蓓甘之如飴。常常唱歌給姚欣蓓聽。喜歡趙柏軒，男人不壞女人不愛。',
    familyExpectation: '成為醫生，照顧好自己',
    personalDream: '歌手',
  },
  {
    id: 'zhao-bo-xuan',
    name: '趙柏軒',
    gender: 'male',
    initialMoney: 5000,
    initialStats: {
      intelligence: 4,
      stamina: 4,
      charisma: 7,
    },
    marriageRequirement: {
      intelligence: 15,
      stamina: 15,
      charisma: 15,
    },
    description: '父親是魔術師，母親是舞者。跟哥哥一起喜歡莊語澄。覺得爸爸媽媽比較喜歡哥哥。',
    familyExpectation: '幫助哥哥完成夢想',
    personalDream: '跟莊語澄結婚',
  },
]

export const getCharacterById = (id: string): Character | undefined => {
  return characters.find((c) => c.id === id)
}
