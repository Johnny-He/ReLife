import type { Character } from '../types'

// MVP: 4 個角色（從原版 15+ 角色中選出代表性的）
export const characters: Character[] = [
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
    description: '低收入戶出身，父親是農夫。雖然窮但很善良。',
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
    description: '低收入戶出身，夢想是當工程師。',
  },
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
    description: '有錢人家庭，父親是公務員、母親是醫生。體力很好。',
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
    description: '富家千金，父親是董事長。聰明但有點天真。',
  },
]

export const getCharacterById = (id: string): Character | undefined => {
  return characters.find((c) => c.id === id)
}
