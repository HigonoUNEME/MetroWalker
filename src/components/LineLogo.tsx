import React from 'react';
import { MetroLine } from '../constants';

interface LineLogoProps {
  line: MetroLine;
  size?: string;
}

const LineLogo: React.FC<LineLogoProps> = ({ line, size = "w-8 h-8" }) => {
  return (
    <div 
      className={`${size} rounded-full flex items-center justify-center shadow-sm`}
      style={{ backgroundColor: line.color }}
    >
      <span 
        className="text-white font-black leading-none text-[60%]"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {line.id}
      </span>
    </div>
  );
};

export default LineLogo;
