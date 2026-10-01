import { paths, viewBox } from "../data/geo";

interface Props {
  names: Record<string, string>;
  selected: string[]; // ordered; [0] = A (blue), [1] = B (orange)
  onToggle: (code: string) => void;
}

export default function CanadaMap({ names, selected, onToggle }: Props) {
  const cls = (code: string) => {
    if (selected[0] === code) return "sel-a";
    if (selected[1] === code) return "sel-b";
    return "";
  };

  return (
    <svg className="canada" viewBox={viewBox} role="group" aria-label="Map of Canada — select a province or territory">
      {Object.entries(paths).map(([code, d]) => {
        const name = names[code] ?? code;
        const state = selected[0] === code ? " (selected A)" : selected[1] === code ? " (selected B)" : "";
        return (
          <path
            key={code}
            d={d}
            className={cls(code)}
            role="button"
            tabIndex={0}
            aria-pressed={selected.includes(code)}
            aria-label={`${name}${state}`}
            onClick={() => onToggle(code)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(code);
              }
            }}
          >
            <title>{name}</title>
          </path>
        );
      })}
    </svg>
  );
}
