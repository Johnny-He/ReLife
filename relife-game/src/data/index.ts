// ReLife 資料層 - 統一匯出
export { characters, getCharacterById } from './characters'
export { jobs, getJobById, canApplyForJob } from './jobs'
export { cards, createDeck, shuffleDeck, getTotalCardCount } from './cards'
export { fixedEvents, randomEvents, getEventForTurn } from './events'
export { exploreLocations, resolveExplore, getRandomLocation } from './locations'
