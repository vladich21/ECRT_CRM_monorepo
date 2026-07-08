/** Разбивает длинную подпись радара на 2 строки для печати. */
export function wrapRadarLabel(text: string, maxCharsPerLine = 20): string[] {
  const normalized = text.trim();
  if (normalized.length <= maxCharsPerLine) return [normalized];

  const spaceIdx = normalized.lastIndexOf(' ', maxCharsPerLine);
  if (spaceIdx > 10) {
    return [normalized.slice(0, spaceIdx), normalized.slice(spaceIdx + 1)];
  }

  return [normalized.slice(0, maxCharsPerLine), normalized.slice(maxCharsPerLine)];
}

type RadarTickProps = {
  payload?: { value?: string };
  x?: number;
  y?: number;
  textAnchor?: 'inherit' | 'end' | 'start' | 'middle';
  fontSize?: number;
};

export function PartnerEvaluationReportRadarTick({
  payload,
  x = 0,
  y = 0,
  textAnchor = 'middle',
  fontSize = 9,
}: RadarTickProps) {
  const lines = wrapRadarLabel(String(payload?.value ?? ''), fontSize >= 10 ? 22 : 20);

  return (
    <text x={x} y={y} textAnchor={textAnchor} fill='#64748b' fontSize={fontSize}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : 11}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
