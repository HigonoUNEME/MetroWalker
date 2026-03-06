/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MISSION_BANK } from '../data/missionBank';
import { getStationSpecialty } from '../data/stationData';

export interface SanpoQuest {
  theme: string;
  mission: string;
  hint: string;
  isFoodMission?: boolean;
}

export async function generateQuest(
  currentStation: string,
  nextStation: string,
  lineName: string,
  difficulty: string,
  isFoodChallenge: boolean = false
): Promise<SanpoQuest> {
  // Simulate network delay for a better feel
  await new Promise(resolve => setTimeout(resolve, 500));

  if (isFoodChallenge) {
    const specialty = getStationSpecialty(currentStation);
    const randomFood = specialty.foods[Math.floor(Math.random() * specialty.foods.length)];
    return {
      theme: "🍴 食のミッション",
      mission: `${currentStation}の名物「${randomFood}」を探して食べてください！`,
      hint: `${currentStation}周辺には美味しい${randomFood}のお店がたくさんあります。3人でシェアするのもいいですね。`,
      isFoodMission: true
    };
  }

  // Filter by difficulty or just pick random
  const filteredMissions = MISSION_BANK.filter(m => m.difficulty === difficulty);
  const pool = filteredMissions.length > 0 ? filteredMissions : MISSION_BANK;
  const randomMission = pool[Math.floor(Math.random() * pool.length)];
  
  const specialty = getStationSpecialty(currentStation);
  const famousThing = specialty.famous[Math.floor(Math.random() * specialty.famous.length)];

  // Replace placeholders
  let missionText = randomMission.mission.replace('${famous}', famousThing);
  
  return {
    theme: randomMission.theme,
    mission: missionText,
    hint: randomMission.hint,
  };
}
