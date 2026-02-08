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
    description: '父親是農夫，母親是幫傭。跟柯若亞同班，全班都因為他窮而歧視他，只有若亞沒有，所以喜歡若亞。雖然很摳門，但會拿水果請柯若亞吃。',
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
    description: '父親已故，母親是夜市攤販。討厭陳建志，因他爸老是批比較爛又貴的菜給她媽。常去吳欣怡家，看到她媽媽很強，因此夢想當工程師。',
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
    description: '父親終日酗酒待業在家，母親是超商店員。因為爸爸是無業遊民所以被瞧不起，立誓賺大錢讓大家心服口服！自尊心強，愛面子。跟莊語澄是朋友。',
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
    description: '父親是公務員，母親是醫生。跟趙柏謙、趙柏軒兩兄弟不合。體力很好但沒什麼朋友。暗戀蘇薰潔。',
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
    description: '父親是董事長，母親是家庭主婦。小時候死過一隻狗，加上爸爸非常討厭動物。偶然看見陳建志善良對待路邊小狗，因此產生好感。兒童節出生，天真但有點不切實際。夢想是養哈士奇。',
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
    description: '父親是黑道，母親是家庭主婦。喜歡梁思妤，但因為父母職業的關係不敢跟她講話。外表酷酷，實際上怪怪的，會對某種事情特別堅持。很善良，不想繼承家業。',
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
    description: '父親是警察，母親已故。討厭盧秉諺，覺得爸爸是黑道很糟糕。體弱多病從小常進醫院，覺得醫生都很溫柔，所以夢想成為醫生。喜歡王漢堯。',
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
    description: '父親是作曲家，母親是歌手。爸媽都很做自己，所以他也很做自己。個性浪漫，愛搭訕女孩子。跟姚欣蓓是青梅竹馬。也很有音樂天分，爸媽希望他成為歌手。',
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
    description: '父親是工頭，母親是工程師。爸爸本來也是工程師結果被裁員，媽媽因此瞧不起爸爸。從小因為笨而自卑，想變聰明。跟鄭安琪是好朋友。',
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
    description: '父親是魔術師，母親是舞者。跟弟弟趙柏軒一起喜歡莊語澄。跟弟弟都是愛霸凌人的壞孩子。調皮、自大。跟陳東明不合。',
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
    description: '父親是廟公，母親是律師。覺得陳東明太可憐了，不准別人欺負他，希望完成東東的夢想。有正義感但比較固執。跟陳東明是朋友。',
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
    description: '父親是漁夫，母親是老師。從小就是衰人，常常跌倒。跟許睿和、陳建志是朋友。被梁思妤喜歡，被盧秉諺討厭，常常覺得會被打。',
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
    description: '父親是超商店長，母親是公務員。班長兼模範生。跟姚欣蓓是朋友，喜歡把她當小妹使喚。常常唱歌給姚欣蓓聽，夢想當歌手。喜歡趙柏軒，男人不壞女人不愛。',
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
    description: '趙柏謙的弟弟，父親是魔術師，母親是舞者。跟哥哥一起喜歡莊語澄。覺得爸爸媽媽比較喜歡哥哥。跟陳東明不合。',
  },
]

export const getCharacterById = (id: string): Character | undefined => {
  return characters.find((c) => c.id === id)
}
