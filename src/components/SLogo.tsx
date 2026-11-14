import Svg, { Path, Rect } from 'react-native-svg';

// Placeholder drawing of the S-Bank "S" mark for the prototype.
// Swap for the official asset (assets/s-logo.png) before showing it anywhere public.
export function SLogo({ size = 32 }: { size?: number }) {
  const lines = [0, 1, 2].map((i) => {
    const yt = 73 + 55 * i;
    const xv = 202 + 55 * i;
    const rt = 140 - 55 * i;
    const yb = 327 + 55 * i;
    const rb = 30 + 55 * i;
    return `M375 ${yt}H342A${rt} ${rt} 0 0 0 ${xv} 213V297A${rb} ${rb} 0 0 1 172 ${yb}H137`;
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Rect width={512} height={512} rx={72} fill="#00A843" />
      {lines.map((d, i) => (
        <Path key={i} d={d} stroke="#fff" strokeWidth={24} fill="none" />
      ))}
    </Svg>
  );
}
