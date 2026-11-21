import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import captions from '../public/captions.json';
import content from './content.json';
import {AudioTrack} from './Root';

const C = {
  bg: '#0F172A',
  blue: '#38BDF8',
  yellow: '#FACC15',
  purple: '#C084FC',
  pink: '#F472B6',
  green: '#4ADE80',
  white: '#F8FAFC',
  muted: '#94A3B8',
  grid: '#25354B',
};
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const sec = (seconds: number) => seconds * 60;
const font = 'Avenir Next, Helvetica Neue, Arial, sans-serif';
const totalFrames = content.scenes.reduce((total, scene) => total + scene.duration, 0);

const Text = ({
  children,
  x,
  y,
  size = 25,
  color = C.white,
  anchor = 'start',
  weight = 500,
}: {
  children: React.ReactNode;
  x: number;
  y: number;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
}) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    fontSize={size}
    fontWeight={weight}
    fill={color}
    style={{fontFamily: font}}
  >
    {children}
  </text>
);

const Heading = ({
  children,
  y = 145,
  size = 49,
  color = C.white,
}: {
  children: React.ReactNode;
  y?: number;
  size?: number;
  color?: string;
}) => <Text x={960} y={y} size={size} color={color} anchor="middle" weight={700}>{children}</Text>;

const Backdrop = ({frame}: {frame: number}) => (
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: 'absolute', zIndex: 0}}>
    <defs>
      <radialGradient id="ambient">
        <stop offset="0%" stopColor="#132943" />
        <stop offset="100%" stopColor={C.bg} />
      </radialGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#ambient)" />
    {Array.from({length: 24}, (_, index) => {
      const x = (index * 193 + 77) % 1920;
      const y = (index * 131 + 45) % 1080;
      const opacity = 0.08 + 0.09 * Math.sin(frame / 70 + index);
      return <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 2 : 1.3} fill={C.blue} opacity={opacity} />;
    })}
    <path d="M0 1060 H1920" stroke="#334155" strokeWidth="1" />
  </svg>
);

const HUD = ({frame, sceneIndex}: {frame: number; sceneIndex: number}) => {
  const scene = content.scenes[sceneIndex]!;
  const progress = interpolate(frame, [0, totalFrames], [0, 1], clamp);
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: 'absolute'}}>
      <rect x="64" y="46" width="56" height="6" rx="3" fill={C.blue} />
      <Text x={135} y={57} size={20} color={C.muted} weight={700}>M3 CALCULUS  /  RATE OF CHANGE</Text>
      <Text x={1854} y={57} size={19} color={C.muted} anchor="end">
        {String(sceneIndex + 1).padStart(2, '0')}  /  07
      </Text>
      <rect x="64" y="1051" width="1792" height="3" rx="1.5" fill="#334155" />
      <rect x="64" y="1051" width={1792 * progress} height="3" rx="1.5" fill={C.blue} opacity=".82" />
      <Text x={64} y={1028} size={16} color={C.muted}>{scene.title}</Text>
      <Text x={1856} y={1028} size={16} color={C.muted} anchor="end">VANSHIKA  ·  E25B071289</Text>
    </svg>
  );
};

const Chart = ({
  x,
  y,
  sx,
  sy,
  width,
  height,
  h = 2,
  reveal = 1,
  showGuides = false,
  showBrackets = false,
  showTriangle = false,
  tangentProgress = 0,
  small = false,
  showFunctionLabel = true,
  yTicks = [0, 1, 4, 9],
}: {
  x: number;
  y: number;
  sx: number;
  sy: number;
  width: number;
  height: number;
  h?: number;
  reveal?: number;
  showGuides?: boolean;
  showBrackets?: boolean;
  showTriangle?: boolean;
  tangentProgress?: number;
  small?: boolean;
  showFunctionLabel?: boolean;
  yTicks?: number[];
}) => {
  const mapX = (value: number) => x + (value - 1) * sx;
  const mapY = (value: number) => y - (value - 1) * sy;
  const values = Array.from({length: 180}, (_, i) => -0.5 + (i / 179) * 3.75);
  const curve = values.map((value, i) => `${i === 0 ? 'M' : 'L'}${mapX(value)},${mapY(value * value)}`).join(' ');
  const a = {x: mapX(1), y: mapY(1)};
  const bX = 1 + h;
  const bY = bX * bX;
  const b = {x: mapX(bX), y: mapY(bY)};
  const secantStart = a;
  const secantEnd = b;
  const tangent = tangentProgress > 0.98;
  const tangentStart = {
    x: mapX(interpolate(tangentProgress, [0, 1], [1, 0.75], clamp)),
    y: mapY(interpolate(tangentProgress, [0, 1], [1, 0.5], clamp)),
  };
  const tangentEnd = {
    x: mapX(interpolate(tangentProgress, [0, 1], [bX, 3], clamp)),
    y: mapY(interpolate(tangentProgress, [0, 1], [bY, 5], clamp)),
  };
  const dashOffset = interpolate(reveal, [0, 1], [1, 0], clamp);
  const opacity = interpolate(reveal, [0, 0.1], [0, 1], clamp);
  const bracketY = y + 34;
  const riseBracketX = b.x + 30;

  return (
    <g opacity={opacity} style={{fontFamily: font}}>
      <defs>
        <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="chart-clip">
          <rect x={x - 190} y={y - height + 5} width={width} height={height + 40} />
        </clipPath>
      </defs>
      <rect x={x - 190} y={y - height + 5} width={width} height={height} rx="26" fill="#111E31" stroke="#26364B" strokeWidth="1.5" opacity=".88" />
      {Array.from({length: 9}, (_, index) => {
        const gridY = y - 5 * sy + index * sy;
        return <line key={`gy${index}`} x1={x - 145} y1={gridY} x2={x + 3.7 * sx} y2={gridY} stroke={C.grid} strokeWidth="1" opacity=".48" />;
      })}
      {Array.from({length: 9}, (_, index) => {
        const gridX = x - 1.7 * sx + index * sx * 0.5;
        return <line key={`gx${index}`} x1={gridX} y1={y - 5 * sy} x2={gridX} y2={y + 40} stroke={C.grid} strokeWidth="1" opacity=".48" />;
      })}
      <line x1={x - 155} y1={y} x2={x + 3.65 * sx} y2={y} stroke={C.white} strokeWidth="2" opacity=".72" />
      <line x1={mapX(0)} y1={y + 42} x2={mapX(0)} y2={y - 5 * sy} stroke={C.white} strokeWidth="2" opacity=".72" />
      <path d={`M${x + 3.65 * sx},${y} l-13,-7 v14z`} fill={C.white} opacity=".78" />
      <path d={`M${mapX(0)},${y - 5 * sy} l-7,13 h14z`} fill={C.white} opacity=".78" />
      {[0, 1, 2, 3].map((value) => (
        <g key={`xt${value}`}>
          <line x1={mapX(value)} y1={y - 5} x2={mapX(value)} y2={y + 5} stroke={C.white} opacity=".6" />
          <Text x={mapX(value)} y={y + 29} size={small ? 17 : 19} color={C.muted} anchor="middle">{value}</Text>
        </g>
      ))}
      {yTicks.map((value) => (
        <g key={`yt${value}`}>
          <line x1={mapX(0) - 5} y1={mapY(value)} x2={mapX(0) + 5} y2={mapY(value)} stroke={C.white} opacity=".6" />
          <Text x={mapX(0) - 18} y={mapY(value) + 7} size={small ? 16 : 18} color={C.muted} anchor="end">{value}</Text>
        </g>
      ))}
      <Text x={x + 3.42 * sx} y={y - 19} size={21} color={C.white} anchor="end">x</Text>
      <Text x={mapX(0) + 18} y={y - 5 * sy + 16} size={21} color={C.white}>y</Text>
      <path
        d={curve}
        fill="none"
        stroke={C.blue}
        strokeWidth={small ? 6 : 7}
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={dashOffset}
        filter="url(#softGlow)"
        clipPath="url(#chart-clip)"
      />
      {showFunctionLabel && <Text x={mapX(1.8)} y={mapY(5)} size={small ? 20 : 23} color={C.blue}>f(x) = x²</Text>}
      <line x1={secantStart.x} y1={secantStart.y} x2={secantEnd.x} y2={secantEnd.y} stroke={C.pink} strokeWidth="5" strokeLinecap="round" opacity={0.96 * (1 - tangentProgress)} clipPath="url(#chart-clip)" />
      <line x1={tangentStart.x} y1={tangentStart.y} x2={tangentEnd.x} y2={tangentEnd.y} stroke={C.green} strokeWidth="6" strokeLinecap="round" opacity={0.96 * tangentProgress} filter="url(#softGlow)" clipPath="url(#chart-clip)" />
      {showGuides && (
        <g stroke={C.yellow} strokeDasharray="7 8" strokeWidth="2" opacity=".8">
          <line x1={a.x} y1={a.y} x2={a.x} y2={y} />
          <line x1={mapX(0)} y1={a.y} x2={a.x} y2={a.y} />
        </g>
      )}
      {showBrackets && !tangent && (
        <g>
          <line x1={a.x} y1={bracketY} x2={b.x} y2={bracketY} stroke={C.white} strokeWidth="2" />
          <line x1={a.x} y1={bracketY - 9} x2={a.x} y2={bracketY + 9} stroke={C.white} strokeWidth="2" />
          <line x1={b.x} y1={bracketY - 9} x2={b.x} y2={bracketY + 9} stroke={C.white} strokeWidth="2" />
          <Text x={(a.x + b.x) / 2} y={bracketY + 32} size={22} color={C.white} anchor="middle">h</Text>
          <line x1={riseBracketX} y1={a.y} x2={riseBracketX} y2={b.y} stroke={C.purple} strokeWidth="2" />
          <line x1={riseBracketX - 8} y1={a.y} x2={riseBracketX + 8} y2={a.y} stroke={C.purple} strokeWidth="2" />
          <line x1={riseBracketX - 8} y1={b.y} x2={riseBracketX + 8} y2={b.y} stroke={C.purple} strokeWidth="2" />
          {h > 0.2 && <Text x={riseBracketX + 16} y={(a.y + b.y) / 2} size={18} color={C.purple}>rise</Text>}
        </g>
      )}
      {showTriangle && (
        <g>
          <path
            d={`M${a.x},${a.y} L${mapX(2)},${a.y} L${mapX(2)},${mapY(3)} Z`}
            fill={C.green}
            fillOpacity=".08"
            stroke={C.green}
            strokeWidth="3"
            strokeDasharray="10 8"
          />
          <Text x={(a.x + mapX(2)) / 2} y={a.y + 35} size={21} color={C.green} anchor="middle">run = 1</Text>
          <Text x={mapX(2) + 17} y={(a.y + mapY(3)) / 2} size={20} color={C.green}>rise = 2</Text>
        </g>
      )}
      <circle cx={a.x} cy={a.y} r="23" fill={C.yellow} opacity=".15" filter="url(#softGlow)" />
      <circle cx={a.x} cy={a.y} r="10" fill={C.yellow} stroke="#FFF7C2" strokeWidth="3" />
      <Text x={a.x - 26} y={a.y - 24} size={23} color={C.yellow} anchor="end">A (1, 1)</Text>
      {!tangent && h > 0.035 && (
        <>
          <circle cx={b.x} cy={b.y} r="20" fill={C.purple} opacity=".17" />
          <circle cx={b.x} cy={b.y} r="9" fill={C.purple} stroke="#F0DBFF" strokeWidth="3" />
          <Text x={b.x + 18} y={b.y - 18} size={22} color={C.purple}>B</Text>
        </>
      )}
      {tangent && <Text x={mapX(2.83)} y={mapY(4.65) - 28} size={22} color={C.green}>y = 2x − 1</Text>}
    </g>
  );
};

const Opening = ({frame}: {frame: number}) => {
  const enter = interpolate(frame, [0, 48], [0, 1], {...clamp, easing: ease});
  const orbit = frame / 36;
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080">
      <circle cx="960" cy="480" r={300 + 9 * Math.sin(frame / 25)} fill="none" stroke={C.blue} opacity=".05" strokeWidth="2" />
      <circle cx="960" cy="480" r="220" fill="none" stroke={C.blue} opacity=".08" strokeWidth="2" strokeDasharray="7 12" />
      <path d="M450 725 Q720 690 960 470 Q1210 240 1470 300" fill="none" stroke={C.blue} strokeWidth="5" opacity=".45" strokeDasharray="2 16" />
      <circle cx={960 + 220 * Math.cos(orbit)} cy={480 + 220 * Math.sin(orbit)} r="9" fill={C.purple} opacity=".88" />
      <circle cx={960 + 300 * Math.cos(-orbit * 0.7)} cy={480 + 300 * Math.sin(-orbit * 0.7)} r="7" fill={C.yellow} opacity=".82" />
      <g opacity={enter} transform={`translate(0 ${30 * (1 - enter)})`}>
        <Heading y={260} size={68}>How Does a Secant Line</Heading>
        <Heading y={345} size={68} color={C.blue}>Become a Tangent Line?</Heading>
        <Text x={960} y={425} size={28} color={C.muted} anchor="middle">DERIVATIVES  ·  RATE OF CHANGE  ·  LINEAR ALGEBRA &amp; CALCULUS — M3</Text>
        <rect x="725" y="520" width="470" height="2" fill={C.blue} opacity=".65" />
        <Text x={960} y={590} size={31} anchor="middle" weight={700}>Vanshika</Text>
        <Text x={960} y={636} size={25} color={C.muted} anchor="middle">Student ID  ·  E25B071289</Text>
        <Text x={960} y={785} size={21} color={C.muted} anchor="middle">A visual journey from average change to the instantaneous.</Text>
      </g>
    </svg>
  );
};

const Car = ({x, y, scale = 1}: {x: number; y: number; scale?: number}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-65 0 L-53 -27 Q-48 -37 -34 -37 H28 Q41 -37 49 -20 L63 -4 L70 0 V22 H-70 V8 Q-70 2 -65 0Z" fill={C.blue} stroke="#B6EEFF" strokeWidth="3" />
    <path d="M-38 -32 H-8 V-8 H-54 L-43 -27Z M0 -32 H26 Q35 -31 41 -18 L47 -8 H0Z" fill="#0F172A" stroke="#A5E8FF" strokeWidth="2" />
    <circle cx="-42" cy="23" r="14" fill="#0B1220" stroke={C.white} strokeWidth="4" />
    <circle cx="43" cy="23" r="14" fill="#0B1220" stroke={C.white} strokeWidth="4" />
    <circle cx="-42" cy="23" r="5" fill={C.muted} />
    <circle cx="43" cy="23" r="5" fill={C.muted} />
    <path d="M56 -3 H67 V8 H58" fill={C.yellow} />
  </g>
);

const Hook = ({frame}: {frame: number}) => {
  const t = frame / 60;
  const carX = interpolate(frame, [0, 1450], [300, 1270], clamp);
  const needleAngle = interpolate(frame % 600, [0, 600], [-128, 48]);
  const morph = interpolate(frame, [850, 1350], [0, 1], {...clamp, easing: ease});
  const curvePoints = Array.from({length: 64}, (_, i) => {
    const u = i / 63;
    return `${i === 0 ? 'M' : 'L'}${250 + u * 1420},${702 - (u * u) * 400}`;
  }).join(' ');
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080">
      <Heading y={156}>One instant. One exact speed.</Heading>
      <Text x={960} y={210} size={25} color={C.muted} anchor="middle">AVERAGE SPEED IS EASY. WHAT ABOUT THIS MOMENT?</Text>
      <path d="M130 760 C410 730 540 760 760 744 S1150 762 1760 744" fill="none" stroke="#596579" strokeWidth="7" />
      <path d="M130 777 C410 747 540 777 760 761 S1150 779 1760 761" fill="none" stroke="#344256" strokeWidth="3" strokeDasharray="19 26" />
      {[0, 1, 2, 3, 4].map((item) => {
        const x = 260 + item * 320;
        return (
          <g key={item} opacity={1 - morph * 0.45}>
            <line x1={x} y1="700" x2={x} y2="725" stroke={C.yellow} strokeWidth="3" />
            <circle cx={x} cy="692" r="5" fill={C.yellow} opacity=".85" />
            <Text x={x} y={680} size={17} color={C.muted} anchor="middle">{`${item * 2}s`}</Text>
          </g>
        );
      })}
      <g opacity={1 - morph} transform={`translate(${carX} ${730 + 4 * Math.sin(t * 3)})`}>
        <Car x={0} y={0} scale={1.22} />
      </g>
      <g transform="translate(1460 450)">
        <circle r="116" fill="#101D30" stroke="#334155" strokeWidth="4" />
        <path d="M-81 70 A106 106 0 1 1 81 70" fill="none" stroke="#334155" strokeWidth="16" strokeLinecap="round" />
        <path d="M-81 70 A106 106 0 0 1 66 -83" fill="none" stroke={C.green} strokeWidth="16" strokeLinecap="round" opacity=".78" />
        {[-135, -90, -45, 0, 45].map((deg) => {
          const angle = deg * Math.PI / 180;
          return <line key={deg} x1={82 * Math.sin(angle)} y1={82 * Math.cos(angle)} x2={101 * Math.sin(angle)} y2={101 * Math.cos(angle)} stroke={C.white} strokeWidth="3" opacity=".75" />;
        })}
        <line x1="0" y1="7" x2={86 * Math.sin(needleAngle * Math.PI / 180)} y2={-86 * Math.cos(needleAngle * Math.PI / 180)} stroke={C.pink} strokeWidth="6" strokeLinecap="round" />
        <circle r="11" fill={C.yellow} />
        <Text x={0} y={150} size={21} color={C.muted} anchor="middle">SPEEDOMETER</Text>
      </g>
      <path d={curvePoints} fill="none" stroke={C.blue} strokeWidth="6" opacity={morph} />
      <circle cx={480 + morph * 740} cy={710 - morph * 112} r="10" fill={C.yellow} opacity={morph} />
      <g opacity={interpolate(frame, [1180, 1480], [0, 1], clamp)}>
        <rect x="435" y="352" width="1050" height="120" rx="28" fill="#13243A" stroke="#2B4965" />
        <Heading y={433} size={67} color={C.blue}>DERIVATIVE</Heading>
        <Text x={960} y={505} size={25} anchor="middle">instantaneous rate of change</Text>
      </g>
      <g opacity={interpolate(frame, [0, 24], [0, 1], clamp)}>
        <rect x="390" y="875" width="1140" height="72" rx="19" fill="#17243A" stroke="#2A3B50" />
        <Text x={960} y={921} size={28} anchor="middle">How fast is the car moving at one single instant?</Text>
      </g>
    </svg>
  );
};

const Parabola = ({frame}: {frame: number}) => {
  const reveal = interpolate(frame, [20, 230], [0, 1], {...clamp, easing: ease});
  const points = interpolate(frame, [260, 390], [0, 1], clamp);
  const secant = interpolate(frame, [430, 560], [0, 1], clamp);
  return (
    <>
      <Heading y={155}>Two points define a secant</Heading>
      <Text x={960} y={205} size={24} color={C.muted} anchor="middle">A FIXED POINT A. A MOVABLE POINT B.</Text>
      <Chart x={450} y={810} sx={180} sy={70} width={880} height={580} reveal={reveal} h={2} showGuides={frame > 590} />
      <g opacity={points}>
        <rect x="1180" y="330" width="570" height="330" rx="24" fill="#15243A" stroke="#293D55" />
        <Text x={1230} y={392} size={23} color={C.blue}>OUR FUNCTION</Text>
        <Text x={1230} y={457} size={47} weight={700}>f(x) = x²</Text>
        <line x1="1230" y1="490" x2="1700" y2="490" stroke="#34445A" />
        <circle cx="1250" cy="545" r="8" fill={C.yellow} />
        <Text x={1275} y={554} size={25} color={C.yellow}>A = (1, 1)</Text>
        <circle cx="1250" cy="607" r="8" fill={C.purple} />
        <Text x={1275} y={616} size={25} color={C.purple}>B = (3, 9)</Text>
      </g>
      <g opacity={secant}>
        <rect x="1210" y="735" width="520" height="120" rx="20" fill="#261D35" stroke={C.pink} strokeOpacity=".5" />
        <Text x={1470} y={783} size={20} color={C.pink} anchor="middle">SECANT SLOPE = AVERAGE RATE</Text>
        <Text x={1470} y={824} size={24} anchor="middle">change in y  /  change in x</Text>
      </g>
    </>
  );
};

const Approach = ({frame}: {frame: number}) => {
  const h = interpolate(
    frame,
      [0, sec(15.35), sec(22.7), sec(25), sec(25.62), sec(27.93), sec(28.53), sec(29.83), sec(30.43), sec(32.4), sec(50), sec(58)],
      [2, 2, 1, 1, 0.5, 0.5, 0.1, 0.1, 0.01, 0.01, 0.001, 0.0001],
    {...clamp, easing: ease},
  );
  const rows = [
      {h: '2', slope: '4', t: 0, highlightAt: 11.6},
      {h: '1', slope: '3', t: 22.2, highlightAt: 22.7},
      {h: '0.5', slope: '2.5', t: 25.12, highlightAt: 25.62},
      {h: '0.1', slope: '2.1', t: 28.03, highlightAt: 28.53},
      {h: '0.01', slope: '2.01', t: 29.93, highlightAt: 30.43},
  ];
  const active = rows.reduce((count, row) => count + (frame >= sec(row.highlightAt) ? 1 : 0), 0);
  const showB = interpolate(frame, [0, 22], [0, 1], clamp);
  return (
    <>
      <Heading y={150}>Move B. Watch the slope.</Heading>
      <Text x={960} y={200} size={24} color={C.muted} anchor="middle">h SHRINKS  ·  THE SECANT PIVOTS  ·  THE SLOPE APPROACHES 2</Text>
      <Chart x={280} y={740} sx={174} sy={62} width={820} height={520} h={h} showGuides showBrackets />
      <g opacity={showB}>
        <rect x="1180" y="292" width="555" height="88" rx="18" fill="#192943" stroke="#344966" />
        <Text x={1458} y={329} size={18} color={C.muted} anchor="middle">MOVING POINT</Text>
        <Text x={1458} y={361} size={26} color={C.purple} anchor="middle">B = (1 + h, (1 + h)²)</Text>
      </g>
      <rect x="1180" y="415" width="555" height="385" rx="24" fill="#15243A" stroke="#2C405A" />
      <Text x={1230} y={468} size={20} color={C.muted} weight={700}>HORIZONTAL DISTANCE  h</Text>
      <Text x={1510} y={468} size={20} color={C.muted} weight={700}>SECANT SLOPE  m</Text>
      {rows.map((row, index) => {
        const y = 520 + index * 52;
        const selected = index === active - 1;
        const visible = interpolate(frame, [sec(row.t), sec(row.t) + 25], [0, 1], clamp);
        return (
          <g key={row.h} opacity={visible}>
            {selected && <rect x="1208" y={y - 31} width="495" height="43" rx="12" fill="#25364E" />}
            <Text x={1270} y={y} size={25} color={selected ? C.purple : C.white} anchor="middle">{row.h}</Text>
            <Text x={1510} y={y} size={25} color={selected ? C.pink : C.white} anchor="middle">{row.slope}</Text>
            {selected && <circle cx="1677" cy={y - 8} r="6" fill={C.green} />}
          </g>
        );
      })}
      <rect x="1215" y="826" width="490" height="72" rx="18" fill="#132C35" stroke={C.green} strokeOpacity={0.55 + 0.2 * Math.sin(frame / 24)} />
      <Text x={1460} y={874} size={25} color={C.green} anchor="middle">m = 2 + h  →  2</Text>
      <Text x={960} y={947} size={23} color={C.muted} anchor="middle">For every nonzero h, the pink line is a secant. Its limit is the tangent.</Text>
    </>
  );
};

const Algebra = ({frame}: {frame: number}) => {
  const rowAt = (seconds: number) => interpolate(frame, [sec(seconds), sec(seconds) + 28], [0, 1], clamp);
  const revealGraph = interpolate(frame, [0, 60], [0, 1], clamp);
  const rows = [
    {t: 1, text: 'm = [ f(1 + h) − f(1) ] / h', color: C.white},
    {t: 8, text: 'm = [ (1 + h)² − 1 ] / h', color: C.blue},
    {t: 16, text: 'm = [ 1 + 2h + h² − 1 ] / h', color: C.white},
    {t: 25, text: 'm = [ 2h + h² ] / h', color: C.yellow},
    {t: 33, text: 'm = h(2 + h) / h', color: C.white},
    {t: 41, text: 'h ≠ 0  →  m = 2 + h', color: C.green},
  ];
  const slider = interpolate(frame, [sec(38), sec(54)], [1, 0.01], {...clamp, easing: ease});
  return (
    <>
      <Heading y={145}>The limit, step by step</Heading>
      <Text x={960} y={195} size={23} color={C.muted} anchor="middle">SIMPLIFY FOR h ≠ 0. THEN LET h APPROACH 0.</Text>
      <Chart x={285} y={760} sx={134} sy={46} width={740} height={540} h={slider} reveal={revealGraph} showGuides />
      <rect x="1015" y="260" width="770" height="544" rx="28" fill="#142237" stroke="#2B405A" />
      <Text x={1065} y={309} size={20} color={C.muted} weight={700}>SECANT SLOPE  ·  SUBSTITUTION  ·  SIMPLIFICATION</Text>
      {rows.map((row, index) => {
        const opacity = rowAt(row.t);
        const y = 375 + index * 67;
        return (
          <g key={row.text} opacity={opacity} transform={`translate(${(1 - opacity) * 24} 0)`}>
            <rect x="1055" y={y - 40} width="690" height="56" rx="13" fill={index === 5 ? '#12323A' : '#1A2A40'} opacity=".95" />
            <Text x={1090} y={y} size={27} color={row.color} weight={index === 5 ? 700 : 500}>{row.text}</Text>
          </g>
        );
      })}
      {frame > sec(16) && frame < sec(24) && (
        <g opacity={interpolate(frame, [sec(16), sec(18)], [0, 1], clamp)}>
          <line x1="1175" y1="502" x2="1200" y2="480" stroke={C.pink} strokeWidth="4" />
          <line x1="1365" y1="502" x2="1390" y2="480" stroke={C.pink} strokeWidth="4" />
        </g>
      )}
      <g opacity={rowAt(47)}>
        <rect x="1055" y="833" width="690" height="105" rx="22" fill="#173329" stroke={C.green} strokeWidth="2" />
        <Text x={1400} y={877} size={21} color={C.green} anchor="middle">TAKE THE LIMIT AS h → 0</Text>
        <Text x={1400} y={922} size={34} weight={700} anchor="middle">lim (2 + h) = 2   ⇒   f′(1) = 2</Text>
      </g>
      <g opacity={rowAt(38)}>
        <line x1="1055" y1="756" x2="1745" y2="756" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        <line x1="1055" y1="756" x2={1055 + 690 * (1 - slider) / 0.99} y2="756" stroke={C.purple} strokeWidth="5" strokeLinecap="round" />
        <circle cx={1055 + 690 * (1 - slider) / 0.99} cy="756" r="11" fill={C.purple} />
        <Text x={1055} y={790} size={18} color={C.muted}>h = 1</Text>
        <Text x={1745} y={790} size={18} color={C.muted} anchor="end">h → 0</Text>
      </g>
    </>
  );
};

const Tangent = ({frame}: {frame: number}) => {
  const approach = interpolate(frame, [0, sec(7)], [2, 0.001], {...clamp, easing: ease});
  const tangent = frame >= sec(11);
  const formula = interpolate(frame, [sec(17), sec(20)], [0, 1], clamp);
  const badge = interpolate(frame, [sec(34), sec(38)], [0, 1], clamp);
  return (
    <>
      <Heading y={150}>One point. The tangent.</Heading>
      <Text x={960} y={200} size={24} color={C.muted} anchor="middle">THE PINK SECANT SETTLES INTO THE GREEN LIMIT LINE</Text>
      <Chart x={360} y={800} sx={120} sy={120} width={1010} height={550} h={approach} tangentProgress={interpolate(frame, [sec(6), sec(11)], [0, 1], {...clamp, easing: ease})} showGuides showTriangle={frame > sec(11)} showFunctionLabel={false} yTicks={[0, 1, 4]} />
      <g opacity={formula}>
        <rect x="1270" y="310" width="475" height="290" rx="25" fill="#15243A" stroke="#3B654E" />
        <Text x={1507} y={358} size={19} color={C.green} anchor="middle">POINT–SLOPE FORM</Text>
        <Text x={1507} y={421} size={31} anchor="middle" weight={700}>y − 1 = 2(x − 1)</Text>
        <path d="M1370 454 H1645" stroke="#405547" strokeWidth="2" />
        <Text x={1507} y={522} size={37} color={C.green} anchor="middle" weight={700}>y = 2x − 1</Text>
        <Text x={1507} y={564} size={18} color={C.muted} anchor="middle">the tangent at A(1, 1)</Text>
      </g>
      <g opacity={badge}>
        <rect x="1180" y="672" width="610" height="157" rx="22" fill="#17243A" stroke="#34445A" />
        <rect x="1204" y="696" width="266" height="108" rx="15" fill="#291D34" />
        <rect x="1490" y="696" width="266" height="108" rx="15" fill="#173329" />
        <Text x={1337} y={730} size={20} color={C.pink} anchor="middle" weight={700}>SECANT</Text>
        <Text x={1337} y={770} size={19} anchor="middle">average · 2 points</Text>
        <Text x={1623} y={730} size={20} color={C.green} anchor="middle" weight={700}>TANGENT</Text>
        <Text x={1623} y={770} size={19} anchor="middle">instantaneous · 1 point</Text>
      </g>
    </>
  );
};

const TakeawayCard = ({
  x,
  y,
  number,
  title,
  detail,
  color,
  progress,
}: {
  x: number;
  y: number;
  number: string;
  title: string;
  detail: string;
  color: string;
  progress: number;
}) => (
  <g opacity={progress} transform={`translate(0 ${(1 - progress) * 36})`}>
    <rect x={x} y={y} width="520" height="230" rx="25" fill="#15243A" stroke={color} strokeOpacity=".58" strokeWidth="2" />
    <circle cx={x + 53} cy={y + 53} r="25" fill={color} opacity=".17" />
    <Text x={x + 53} y={y + 61} size={22} color={color} anchor="middle" weight={700}>{number}</Text>
    <Text x={x + 96} y={y + 62} size={30} color={color} weight={700}>{title}</Text>
    <Text x={x + 34} y={y + 124} size={22}>{detail}</Text>
    <rect x={x + 34} y={y + 168} width={432 * progress} height="4" rx="2" fill={color} opacity=".68" />
  </g>
);

const Summary = ({frame}: {frame: number}) => {
  const carProgress = interpolate(frame, [0, 650], [0, 1], {...clamp, easing: ease});
  const cardProgress = (index: number) =>
    interpolate(frame, [sec(1 + index), sec(2 + index)], [0, 1], {...clamp, easing: ease});
  const carX = interpolate(carProgress, [0, 1], [1260, 1500]);
  const carY = 350 - carProgress * 120;
  const takeawayOpacity = interpolate(frame, [sec(19), sec(22)], [1, 0], clamp);
  const closingProgress = interpolate(frame, [sec(20), sec(23)], [0, 1], {...clamp, easing: ease});
  const authorCardProgress = interpolate(frame, [sec(35), sec(36.5)], [0, 1], {...clamp, easing: ease});
  const orbit = frame / 45;
  return (
    <>
      <g opacity={takeawayOpacity}>
        <Heading y={142} size={46}>From a shrinking interval to a derivative</Heading>
        <Text x={960} y={191} size={22} color={C.muted} anchor="middle">THREE IDEAS TO TAKE WITH YOU</Text>
        <path d="M460 366 Q770 390 1020 318 T1480 230" fill="none" stroke={C.blue} strokeWidth="4" strokeDasharray="12 10" />
        <circle cx={1280 + carProgress * 190} cy={350 - carProgress * 115} r="8" fill={C.yellow} />
        <Car x={carX} y={carY} scale={0.54} />
        <rect x="420" y="250" width="380" height="110" rx="20" fill="#15243A" stroke="#34445A" />
        <Text x={610} y={291} size={18} color={C.muted} anchor="middle">POSITION–TIME GRAPH</Text>
        <Text x={610} y={334} size={25} color={C.green} anchor="middle">tangent slope = velocity</Text>
        <TakeawayCard x={75} y={460} number="01" title="SECANT" detail="Two points · average change" color={C.pink} progress={cardProgress(0)} />
        <TakeawayCard x={700} y={460} number="02" title="LIMIT" detail="h → 0 · shrink to an instant" color={C.purple} progress={cardProgress(1)} />
        <TakeawayCard x={1325} y={460} number="03" title="DERIVATIVE" detail="Tangent slope · exact rate" color={C.green} progress={cardProgress(2)} />
        <g opacity={interpolate(frame, [sec(10), sec(12)], [0, 1], clamp)}>
          <rect x="280" y="760" width="1360" height="130" rx="28" fill="#132C35" stroke={C.green} strokeOpacity=".56" />
          <Text x={960} y={814} size={31} color={C.muted} anchor="middle" weight={700}>A derivative is the slope of the tangent line.</Text>
          <Text x={960} y={858} size={34} color={C.green} anchor="middle" weight={700}>f(x) = x²   ·   f′(1) = 2   ·   y = 2x − 1</Text>
        </g>
      </g>
      <g opacity={closingProgress * (1 - authorCardProgress)}>
        <rect width="1920" height="1080" fill={C.bg} />
        <circle cx="1530" cy="500" r="290" fill="none" stroke={C.blue} strokeWidth="2" opacity=".09" />
        <circle cx="1530" cy="500" r="218" fill="none" stroke={C.blue} strokeWidth="2" strokeDasharray="8 14" opacity=".18" />
        <path d="M1320 795 Q1430 745 1510 585 T1780 300" fill="none" stroke={C.blue} strokeWidth="5" opacity=".38" />
        <path d="M1425 765 L1740 415" fill="none" stroke={C.green} strokeWidth="5" opacity=".64" />
        <circle cx={1530 + 218 * Math.cos(orbit)} cy={500 + 218 * Math.sin(orbit)} r="9" fill={C.yellow} />
        <circle cx="1530" cy="500" r="10" fill={C.yellow} />
        <Text x={960} y={340} size={55} color={C.blue} anchor="middle" weight={700}>A Derivative is the Slope</Text>
        <Text x={960} y={414} size={55} anchor="middle" weight={700}>of the Tangent Line</Text>
        <rect x="625" y="480" width="670" height="2" fill={C.blue} opacity=".58" />
        <Text x={960} y={567} size={34} anchor="middle" weight={700}>{content.student}  ·  {content.studentId}</Text>
        <Text x={960} y={620} size={27} color={C.muted} anchor="middle">{content.course}</Text>
        <Text x={960} y={753} size={20} color={C.muted} anchor="middle">{content.musicCredit}</Text>
      </g>
      <g opacity={authorCardProgress}>
        <rect width="1920" height="1080" fill={C.bg} />
        <circle cx="1530" cy="500" r="290" fill="none" stroke={C.blue} strokeWidth="2" opacity=".09" />
        <circle cx="1530" cy="500" r="218" fill="none" stroke={C.blue} strokeWidth="2" strokeDasharray="8 14" opacity=".18" />
        <path d="M1320 795 Q1430 745 1510 585 T1780 300" fill="none" stroke={C.blue} strokeWidth="5" opacity=".38" />
        <path d="M1425 765 L1740 415" fill="none" stroke={C.green} strokeWidth="5" opacity=".64" />
        <circle cx={1530 + 218 * Math.cos(orbit)} cy={500 + 218 * Math.sin(orbit)} r="9" fill={C.yellow} />
        <circle cx="1530" cy="500" r="10" fill={C.yellow} />
        <Text x={960} y={465} size={42} color={C.muted} anchor="middle" weight={600}>Project made by</Text>
        <Text x={960} y={550} size={64} color={C.blue} anchor="middle" weight={700}>{content.studentFullName}</Text>
        <rect x="625" y="590" width="670" height="2" fill={C.blue} opacity=".58" />
        <Text x={960} y={644} size={29} anchor="middle" weight={700}>{content.student}  ·  {content.studentId}</Text>
        <Text x={960} y={691} size={24} color={C.muted} anchor="middle">{content.course}</Text>
        <Text x={960} y={753} size={20} color={C.muted} anchor="middle">{content.musicCredit}</Text>
      </g>
    </>
  );
};

const Captions = ({frame}: {frame: number}) => {
  const active = captions.find((caption) => frame >= caption.start && frame < caption.end);
  if (!active) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 67,
        zIndex: 4,
        left: 250,
        width: 1420,
        minHeight: 52,
        padding: '12px 24px',
        boxSizing: 'border-box',
        borderRadius: 14,
        border: '1px solid rgba(148,163,184,.3)',
        background: 'rgba(7,15,28,.93)',
        color: C.white,
        fontFamily: font,
        fontSize: 26,
        lineHeight: 1.2,
        fontWeight: 600,
        textAlign: 'center',
        textShadow: '0 2px 6px rgba(0,0,0,.7)',
      }}
    >
      {active.text}
    </div>
  );
};

const scenes = [Opening, Hook, Parabola, Approach, Algebra, Tangent, Summary] as const;

export const Video = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const sceneIndex = Math.max(
    0,
    content.scenes.findIndex(
      (scene) => frame >= scene.start && frame < scene.start + scene.duration,
    ),
  );
  const Scene = scenes[sceneIndex] ?? Opening;
  const localFrame = frame - content.scenes[sceneIndex]!.start;
  const opacity = interpolate(
    frame,
    [0, 25, durationInFrames - 24, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  const transitionOpacity = content.scenes.slice(1).reduce((highest, scene) => {
    const opacity = interpolate(
      frame,
      [scene.start - 18, scene.start, scene.start + 18],
      [0, 0.88, 0],
      clamp,
    );
    return Math.max(highest, opacity);
  }, 0);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, opacity}}>
      <Backdrop frame={frame} />
      <div style={{position: 'absolute', inset: 0, zIndex: 1}}>
        <svg width="1920" height="1080" viewBox="0 0 1920 1080">
          <Scene frame={localFrame} />
        </svg>
      </div>
      {!(sceneIndex === 6 && localFrame >= sec(20)) && (
        <div style={{position: 'absolute', inset: 0, zIndex: 2}}>
          <HUD frame={frame} sceneIndex={sceneIndex} />
        </div>
      )}
      <AbsoluteFill style={{zIndex: 3, backgroundColor: C.bg, opacity: transitionOpacity, pointerEvents: 'none'}} />
      <Captions frame={frame} />
      <AudioTrack />
    </AbsoluteFill>
  );
};
