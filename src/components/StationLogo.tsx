import React from 'react';
import { MetroLine } from '../constants';

interface StationLogoProps {
  line: MetroLine;
  stationNumber: string;
  size?: string;
  fontSize?: string;
  numberFontSize?: string;
}

const StationLogo: React.FC<StationLogoProps> = ({
  line,
  stationNumber,
  size = 'w-14 h-14',
}) => {
  // SVGで描画することで、サイズに関わらず正確な比率を維持する
  // 公式デザイン準拠:
  //   - 外枠リング: 路線色、stroke幅は直径の約12%
  //   - 路線記号: 路線色、上半分に配置、Helvetica Neue Bold
  //   - 仕切り線: 路線色、左右マージンあり
  //   - 駅番号: 黒、下半分に配置、Helvetica Neue Bold

  return (
    <div className={`${size} flex-shrink-0`}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        {/* 白背景の円 */}
        <circle cx="50" cy="50" r="46" fill="white" />

        {/* 外枠リング（路線色） */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={line.color}
          strokeWidth="8"
        />

        {/* 路線記号（例: G, M, Y）— 路線色、上寄り */}
        <text
          x="50"
          y="46"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={line.color}
          fontSize="32"
          fontWeight="900"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          letterSpacing="-1"
        >
          {line.id.toUpperCase()}
        </text>

        {/* 仕切り線（路線色、左右に余白） */}
        <line
          x1="22"
          y1="56"
          x2="78"
          y2="56"
          stroke={line.color}
          strokeWidth="2"
        />

        {/* 駅番号（黒、下寄り） */}
        <text
          x="50"
          y="74"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#111111"
          fontSize="26"
          fontWeight="900"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          letterSpacing="1"
        >
          {stationNumber}
        </text>
      </svg>
    </div>
  );
};

export default StationLogo;
