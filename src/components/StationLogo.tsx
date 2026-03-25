import React from 'react';
import { MetroLine } from '../constants';

interface StationLogoProps {
  line: MetroLine;
  stationNumber: string;
  size?: string;
  fontSize?: string;       // 後方互換のため残すが未使用
  numberFontSize?: string; // 後方互換のため残すが未使用
}

/**
 * 東京メトロ公式駅ナンバリング画像を使用したロゴコンポーネント。
 * 画像は public/logos/station/{line.id}{stationNumber}.jpg に配置。
 * （例: public/logos/station/G01.jpg, M08.jpg, Mb03.jpg ...）
 */
const StationLogo: React.FC<StationLogoProps> = ({
  line,
  stationNumber,
  size = 'w-14 h-14',
}) => {
  const code = `${line.id.toUpperCase()}${stationNumber}`;

  return (
    <div className={`${size} flex-shrink-0`}>
      <img
        src={`/station/${code}.jpg`}
        alt={code}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default StationLogo;
