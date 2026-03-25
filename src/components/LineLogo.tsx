import React from 'react';
import { MetroLine } from '../constants';

interface LineLogoProps {
  line: MetroLine;
  size?: string;
}

/**
 * 東京メトロ公式路線記号画像を使用したロゴコンポーネント。
 * 画像は public/logos/line/{line.id}.jpg に配置。
 * （例: public/logos/line/G.jpg, M.jpg, H.jpg ...）
 */
const LineLogo: React.FC<LineLogoProps> = ({
  line,
  size = 'w-10 h-10',
}) => {
  return (
    <div className={`${size} flex-shrink-0`}>
      <img
        src={`/logos/line/${line.id.toUpperCase()}.jpg`}
        alt={line.name}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default LineLogo;
