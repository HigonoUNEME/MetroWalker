import { MISSION_BANK, FOOD_MISSIONS, SanpoQuest } from './missionBank';

export interface StationSpecialty {
  famous: string[];
  foods: string[];
}

export const STATION_DATA: Record<string, StationSpecialty> = {
  "浅草": {
    famous: ["雷門", "仲見世通り", "浅草寺"],
    foods: ["揚げまんじゅう", "人形焼", "天ぷら"]
  },
  "田原町": {
    famous: ["かっぱ橋道具街", "東本願寺"],
    foods: ["老舗のパン", "和菓子"]
  },
  "稲荷町": {
    famous: ["下谷神社", "仏壇通り"],
    foods: ["下町のラーメン", "老舗の定食"]
  },
  "上野": {
    famous: ["上野動物園", "アメ横", "国立科学博物館"],
    foods: ["パンダパン", "あんみつ", "コロッケ"]
  },
  "上野広小路": {
    famous: ["鈴本演芸場", "松坂屋上野店"],
    foods: ["老舗の洋食", "和菓子"]
  },
  "末広町": {
    famous: ["秋葉原電気街の端", "神田明神"],
    foods: ["カレー", "ジャンクフード"]
  },
  "神田": {
    famous: ["神田古書店街", "万世橋"],
    foods: ["蕎麦", "カレー", "老舗の居酒屋"]
  },
  "三越前": {
    famous: ["日本橋三越本店", "コレド室町"],
    foods: ["江戸前寿司", "天丼"]
  },
  "日本橋": {
    famous: ["日本橋の麒麟像", "高島屋日本橋店"],
    foods: ["鰹節だし", "老舗の洋食"]
  },
  "京橋": {
    famous: ["明治屋", "東京スクエアガーデン"],
    foods: ["高級ランチ", "老舗のバー"]
  },
  "銀座": {
    famous: ["和光の時計塔", "歌舞伎座", "高級ブティック"],
    foods: ["あんぱん", "フルーツサンド", "オムライス"]
  },
  "新橋": {
    famous: ["SL広場", "汐留シオサイト"],
    foods: ["立ち飲み屋のつまみ", "ナポリタン"]
  },
  "虎ノ門": {
    famous: ["虎ノ門ヒルズ", "金刀比羅宮"],
    foods: ["ビジネス街ランチ", "おしゃれなカフェ"]
  },
  "溜池山王": {
    famous: ["首相官邸付近", "日枝神社"],
    foods: ["高級ホテルランチ", "多国籍料理"]
  },
  "赤坂見附": {
    famous: ["赤坂サカス", "豊川稲荷"],
    foods: ["韓国料理", "老舗の和菓子"]
  },
  "青山一丁目": {
    famous: ["明治神宮外苑", "ホンダ本社"],
    foods: ["おしゃれなカフェ", "イタリアン"]
  },
  "外苑前": {
    famous: ["秩父宮ラグビー場", "神宮球場"],
    foods: ["スポーツ観戦フード", "カフェ"]
  },
  "表参道": {
    famous: ["表参道ヒルズ", "ケヤキ並木"],
    foods: ["パンケーキ", "高級チョコレート"]
  },
  "渋谷": {
    famous: ["ハチ公像", "スクランブル交差点"],
    foods: ["最新スイーツ", "多国籍料理"]
  },
  "池袋": {
    famous: ["サンシャイン60", "いけふくろう"],
    foods: ["ラーメン", "餃子"]
  },
  "新大塚": {
    famous: ["大塚公園", "静かな住宅街"],
    foods: ["地元のパン屋", "定食"]
  },
  "茗荷谷": {
    famous: ["教育の森公園", "播磨坂"],
    foods: ["学生向けランチ", "カフェ"]
  },
  "後楽園": {
    famous: ["東京ドーム", "小石川後楽園"],
    foods: ["スタジアムフード", "ファミレス"]
  },
  "本郷三丁目": {
    famous: ["東京大学 赤門", "湯島天神"],
    foods: ["学生街のカレー", "老舗の和菓子"]
  },
  "御茶ノ水": {
    famous: ["ニコライ堂", "楽器店街"],
    foods: ["カレー", "学生向けランチ"]
  },
  "淡路町": {
    famous: ["ワテラス", "近江屋洋菓子店"],
    foods: ["老舗の蕎麦", "洋菓子"]
  },
  "大手町": {
    famous: ["皇居東御苑", "高層ビル群"],
    foods: ["ビジネスランチ", "高級レストラン"]
  },
  "東京": {
    famous: ["丸の内駅舎", "皇居"],
    foods: ["駅弁", "全国の名産品"]
  },
  "霞ケ関": {
    famous: ["官公庁街", "日比谷公園"],
    foods: ["食堂ランチ", "カフェ"]
  },
  "国会議事堂前": {
    famous: ["国会議事堂", "首相官邸"],
    foods: ["議員会館のカレー", "老舗の喫茶店"]
  },
  "四ツ谷": {
    famous: ["上智大学", "迎賓館"],
    foods: ["たい焼き", "学生向けランチ"]
  },
  "四谷三丁目": {
    famous: ["消防博物館", "荒木町"],
    foods: ["隠れ家レストラン", "居酒屋"]
  },
  "新宿御苑前": {
    famous: ["新宿御苑", "静かなカフェ街"],
    foods: ["ハンバーグ", "カフェ飯"]
  },
  "新宿三丁目": {
    famous: ["伊勢丹新宿店", "新宿末廣亭"],
    foods: ["デパ地下グルメ", "寄席スイーツ"]
  },
  "新宿": {
    famous: ["東京都庁", "歌舞伎町"],
    foods: ["高層ビルランチ", "焼き鳥"]
  },
  "西新宿": {
    famous: ["高層ビル街", "新宿中央公園"],
    foods: ["ビジネスランチ", "ホテルビュッフェ"]
  },
  "中野坂上": {
    famous: ["宝仙寺", "オフィスビル"],
    foods: ["ラーメン", "定食"]
  },
  "荻窪": {
    famous: ["大田黒公園", "ラーメン激戦区"],
    foods: ["荻窪ラーメン", "カレー"]
  },
  "北千住": {
    famous: ["宿場町通り", "荒川河川敷"],
    foods: ["串カツ", "銭湯帰りの一杯"]
  },
  "秋葉原": {
    famous: ["電気街", "神田明神"],
    foods: ["カレー", "牛かつ"]
  },
  "人形町": {
    famous: ["水天宮", "甘酒横丁"],
    foods: ["鯛焼き", "親子丼"]
  },
  "築地": {
    famous: ["築地本願寺", "築地場外市場"],
    foods: ["海鮮丼", "卵焼き"]
  },
  "六本木": {
    famous: ["六本木ヒルズ", "東京ミッドタウン"],
    foods: ["高級ステーキ", "インターナショナル料理"]
  },
  "中目黒": {
    famous: ["目黒川の桜", "おしゃれなカフェ"],
    foods: ["ピザ", "レモンサワー"]
  },
  "飯田橋": {
    famous: ["神楽坂", "東京大神宮"],
    foods: ["フレンチ", "和食"]
  },
  "九段下": {
    famous: ["日本武道館", "靖国神社"],
    foods: ["カレー", "蕎麦"]
  },
  "門前仲町": {
    famous: ["富岡八幡宮", "深川不動堂"],
    foods: ["深川めし", "甘味"]
  },
  "豊洲": {
    famous: ["豊洲市場", "ららぽーと豊洲"],
    foods: ["新鮮な魚介", "BBQ"]
  },
  "押上": {
    famous: ["東京スカイツリー", "ソラマチ"],
    foods: ["タワー丼", "もんじゃ焼き"]
  },
  "目黒": {
    famous: ["目黒寄席", "雅叙園"],
    foods: ["さんま", "とんかつ"]
  },
  "麻布十番": {
    famous: ["麻布十番商店街", "善福寺"],
    foods: ["たい焼き", "かりんとう"]
  },
  "駒込": {
    famous: ["六義園", "旧古河庭園"],
    foods: ["和菓子", "静かなカフェ"]
  },
  "王子": {
    famous: ["飛鳥山公園", "王子稲荷神社"],
    foods: ["玉子焼き", "狐うどん"]
  },
  "赤羽岩淵": {
    famous: ["荒川知水資料館", "赤羽の飲み屋街"],
    foods: ["鰻", "おでん"]
  }
};

export const getStationSpecialty = (stationName: string): StationSpecialty => {
  return STATION_DATA[stationName] || {
    famous: ["地元の商店街", "歴史ある神社", "静かな公園"],
    foods: ["地元のパン屋さんのパン", "昔ながらの定食", "季節の和菓子"]
  };
};


export const generateQuest = async (
  currentStation: string, 
  nextStation: string, 
  lineName: string, 
  difficulty: 'EASY' | 'NORMAL' | 'HARD', 
  isFoodChallenge: boolean
): Promise<SanpoQuest> => {
  
  // 今いる駅のデータを取得
  const stationSpecialty = getStationSpecialty(currentStation);

  let pool: SanpoQuest[];
  let featureWord = "";

  if (isFoodChallenge) {
    // 食ミッションの場合はFOOD_MISSIONSを使い、駅のfoodsからランダムに選ぶ
    pool = FOOD_MISSIONS;
    featureWord = stationSpecialty.foods[Math.floor(Math.random() * stationSpecialty.foods.length)];
  } else {
    // 通常ミッションの場合はMISSION_BANKから難易度で絞り、駅のfamousからランダムに選ぶ
    pool = MISSION_BANK.filter(m => m.difficulty === difficulty);
    if (pool.length === 0) pool = MISSION_BANK; // 安全対策
    featureWord = stationSpecialty.famous[Math.floor(Math.random() * stationSpecialty.famous.length)];
  }

  // リストから1つお題を引く
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex];

  // 選んだお題の中にある ${famous} や ${food} を、その駅の実際のデータに書き換えて返す
  return {
    theme: selected.theme,
    mission: selected.mission
      .replace(/\$\{famous\}/g, featureWord)
      .replace(/\$\{food\}/g, featureWord),
    hint: selected.hint,
    difficulty: selected.difficulty,
    isFoodMission: isFoodChallenge
  };
};
