import React from 'react';
import { MetroLine } from '../constants';

interface StationLogoProps {
  line: MetroLine;
  stationNumber: string;
  size?: string; // 例: "w-[60px] h-[60px]"
}

const StationLogo: React.FC<StationLogoProps> = ({ 
  line, 
  stationNumber, 
  size = "w-12 h-12"
}) => {
  return (
    <div className="flex flex-col items-center">
      {/* 東京メトロ公式ガイドライン風の駅ナンバリングマーク
         - 外枠：路線の色
         - 背景：白
         - 文字：路線記号（路線の色）と数字（黒）
      */}
      <div 
        className={`${size} rounded-full border-[3px] bg-white flex flex-col items-center justify-center shadow-sm`}
        style={{ borderColor: line.color }}
      >
        <div 
          className="font-bold leading-none text-[40%] uppercase" 
          style={{ color: line.color, fontFamily: "Arial, sans-serif" }}
        >
          {line.id}
        </div>
        <div 
          className="font-black leading-none text-[45%] text-black"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {stationNumber}
        </div>
      </div>
    </div>
  );
};

export default StationLogo;
