import { barRuns, ean13Modules } from "@/helpers/ean13";

interface Props {
  /** A checked EAN-13 (validGtin). */
  code: string;
  /** Which variant the code belongs to, shown under the number. */
  caption?: string | null;
}

// Quiet zones the standard asks for, in modules: the first digit sits in the left one.
const LEFT = 11;
const RIGHT = 7;
const WIDTH = LEFT + 95 + RIGHT;
const BAR = 50;
const GUARD = 55;
const GUARDS = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);

/**
 * A scannable EAN-13, drawn like the one on the packaging: longer guard bars, the
 * first digit outside the bars and the other twelve in two groups below them.
 */
const EanBarcode = ({ code, caption }: Props) => {
  const modules = ean13Modules(code);
  const digit = (i: number) => code[i];
  const leftX = (i: number) => LEFT + 3 + i * 7 + 3.5;
  const rightX = (i: number) => LEFT + 50 + i * 7 + 3.5;

  return (
    <figure className="ean_barcode">
      <svg
        viewBox={`0 0 ${WIDTH} ${GUARD + 10}`}
        role="img"
        aria-label={`EAN ${code}`}
        shapeRendering="crispEdges"
      >
        <rect width={WIDTH} height={GUARD + 10} fill="#fff" />
        {barRuns(modules).map(([start, width]) => (
          <rect
            key={start}
            x={LEFT + start}
            y={0}
            width={width}
            height={GUARDS.has(start) ? GUARD : BAR}
            fill="#000"
          />
        ))}
        <g className="ean_digits" fill="#000" textAnchor="middle" fontSize="9">
          <text x={LEFT - 5} y={GUARD + 8}>
            {digit(0)}
          </text>
          {[...Array(6)].map((_, i) => (
            <text key={`l${i}`} x={leftX(i)} y={GUARD + 8}>
              {digit(1 + i)}
            </text>
          ))}
          {[...Array(6)].map((_, i) => (
            <text key={`r${i}`} x={rightX(i)} y={GUARD + 8}>
              {digit(7 + i)}
            </text>
          ))}
        </g>
      </svg>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
};

export default EanBarcode;
