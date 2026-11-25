import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

const colors = {
  background: '#0F172A',
  blue: '#38BDF8',
  white: '#F8FAFC',
};
const font = 'Avenir Next, Helvetica Neue, Arial, sans-serif';

export const Disclosure = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  return (
    <AbsoluteFill style={{backgroundColor: colors.background}}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <defs>
          <radialGradient id="disclosure-ambient">
            <stop offset="0%" stopColor="#132943" />
            <stop offset="100%" stopColor={colors.background} />
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#disclosure-ambient)" />
        {Array.from({length: 24}, (_, index) => {
          const x = (index * 193 + 77) % 1920;
          const y = (index * 131 + 45) % 1080;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={index % 3 === 0 ? 2 : 1.3}
              fill={colors.blue}
              opacity={0.08 + 0.09 * Math.sin(frame / 70 + index)}
            />
          );
        })}
        <rect x="64" y="46" width="56" height="6" rx="3" fill={colors.blue} />
        <path d="M0 1060 H1920" stroke="#334155" strokeWidth="1" />
        <g opacity={opacity} style={{fontFamily: font}}>
          <text
            x="960"
            y="503"
            textAnchor="middle"
            fontSize="50"
            fontWeight="600"
            fill={colors.white}
          >
            All external resources and AI tools used have been
          </text>
          <text
            x="960"
            y="582"
            textAnchor="middle"
            fontSize="50"
            fontWeight="700"
            fill={colors.blue}
          >
            appropriately disclosed.
          </text>
          <line
            x1="770"
            y1="628"
            x2="1150"
            y2="628"
            stroke={colors.blue}
            strokeWidth="2"
            opacity="0.58"
          />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
