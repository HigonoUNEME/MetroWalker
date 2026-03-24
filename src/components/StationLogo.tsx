import React from 'react';
import { MetroLine } from '../constants';

interface StationLogoProps {
  line: MetroLine;
  stationNumber: string;
  size?: string; // 例: "w-16 h-16"
}

const StationLogo: React.FC<StationLogoProps> = ({ 
  line, 
  stationNumber, 
  size = "w-14 h-14" 
}) => {
  return (
    <div className="flex items-center justify-center">
      {/* 東京メトロ公式駅ナンバリングのデザインを再現:
        - 外枠: 路線の色の太いリング
        - 内側: 白背景
        - 上部: 路線記号 (黒/Bold)
        - 下部: 駅番号 (黒/Bold)
        - 中央: 区分け用の細い水平線
      */}
      <div 
        className={`${size} rounded-full border-[5px] bg-white flex flex-col items-center justify-center shadow-sm relative`}
        style={{ borderColor: line.color }}
      >
        {/* 路線記号 (M, G, Y など) */}
        <div 
          className="text-[140%] font-black leading-none text-black -mb-[2%]"
          style={{ fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif" }}
        >
          {line.id}
        </div>

        {/* 中央の仕切り線 */}
        <div className="w-[75%] h-[1.5px] bg-black my-[3%]" />

        {/* 駅番号 (01, 15 など) */}
        <div 
          className="text-[120%] font-black leading-none text-black"
          style={{ fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif" }}
        >
          {stationNumber}
        </div>
      </div>
    </div>
  );
};

export default StationLogo;
