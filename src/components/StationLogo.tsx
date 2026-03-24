import React from 'react';
import { MetroLine } from '../constants';

interface StationLogoProps {
  line: MetroLine;
  stationNumber: string;
  size?: string;
  // 既存コードとの後方互換のため受け取るが SVG viewBox で比率管理するため使用しない
  fontSize?: string;
  numberFontSize?: string;
}

/**
 * 東京メトロ公式ガイドライン P8「駅ナンバリング」準拠
 *
 * 公式仕様（viewBox 0 0 100 100 に正規化）:
 *   外枠リング    : 路線色、strokeWidth ≈ 直径の 9%
 *   上ゾーン      : 路線記号アルファベット（路線色・極太）
 *   仕切り線      : 路線色、左右に余白あり
 *   下ゾーン      : 駅番号 2桁（黒・極太）
 *
 * ガイドライン P8 記載の縦比率
 *   上余白 0.249A / 文字ゾーン 1.073A / 下余白 0.764A
 * を viewBox 高さ 100 にスケーリングして配置。
 */
const StationLogo: React.FC<StationLogoProps> = ({
  line,
  stationNumber,
  size = 'w-14 h-14',
}) => {
  const lineId = line.id.toUpperCase();

  return (
    <div className={`${size} flex-shrink-0`}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label={`${lineId}${stationNumber}`}
      >
        {/* 白背景 */}
        <circle cx="50" cy="50" r="45" fill="#ffffff" />

        {/* 外枠リング（路線色） — strokeWidth 9 = 直径100の約9% */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={line.color}
          strokeWidth="9"
        />

        {/* 路線記号（黒）— 公式比率 0.248A */}
        <text
          x="50"
          y="40"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#111111"
          fontSize="31"
          fontWeight="900"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        >
          {lineId}
        </text>

        {/* 駅番号（黒）— 公式比率 0.267A、記号よりほんの少し大きい */}
        <text
          x="50"
          y="68"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#111111"
          fontSize="33"
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
