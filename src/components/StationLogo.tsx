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
  size = "w-[60px] h-[60px]", 
  fontSize = "text-[28px]",
  numberFontSize = "text-[18px]"
}) => {
  return (
    <div className="flex flex-col items-center" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Round Logo */}
      <div 
        className={`${size} rounded-full flex items-center justify-center relative`}
        style={{ backgroundColor: line.color }}
      >
        {/* Inner White Circle */}
        <div className="w-1/2 h-1/2 bg-white rounded-full flex items-center justify-center">
          <span className={`${fontSize} font-bold leading-none text-black`}>
            {line.id}
          </span>
        </div>
      </div>
      
      {/* Station Number */}
      <div 
        className={`mt-[6px] font-bold ${numberFontSize}`}
        style={{ color: line.color }}
      >
        {stationNumber}
      </div>
    </div>
  );
};

export default StationLogo;
