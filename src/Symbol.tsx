import type * as ms from "milsymbol";
import { useEffect, useRef, type ReactElement } from "react";

export interface SymbolProps {
  symbol: ms.Symbol;
}

export default function Symbol({ symbol }: SymbolProps): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current == null) {
      return;
    }

    while (ref.current.firstChild != null) {
      ref.current.removeChild(ref.current.firstChild);
    }

    ref.current.appendChild(symbol.asDOM());
  }, [ref.current, symbol]);

  return <span className="block" ref={ref} />;
  // return <img className="block" src={`data:image/svg+xml;utf8,${encodeURIComponent(symbol.asSVG())}`} />
}
