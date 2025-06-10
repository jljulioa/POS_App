
"use client";

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface ProductBarcodeProps {
  value: string;
  className?: string;
  options?: JsBarcode.Options;
}

const defaultOptions: JsBarcode.Options = {
  format: "CODE128", // A common and versatile format
  displayValue: false, // We'll display the value separately if needed
  width: 1.5,
  height: 40,
  margin: 0,
  background: "transparent",
};

const ProductBarcode: React.FC<ProductBarcodeProps> = ({ value, className, options: userOptions }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const finalOptions = { ...defaultOptions, ...userOptions };

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, finalOptions);
      } catch (e) {
        console.error("JsBarcode error:", e);
        // Optionally, clear the SVG or display an error message in the SVG itself
        if (svgRef.current) {
          svgRef.current.innerHTML = ''; // Clear previous barcode on error
        }
      }
    } else if (svgRef.current) {
        svgRef.current.innerHTML = ''; // Clear if no value
    }
  }, [value, finalOptions]); // Rerun effect if value or options change

  if (!value) {
    return <div className={cn("text-xs text-muted-foreground h-[40px] flex items-center justify-center", className)}>No Barcode Value</div>;
  }

  return <svg ref={svgRef} className={className} />;
};

export default ProductBarcode;

// Helper function for cn if not globally available in this component context
// (Though it should be if "@/lib/utils" is correctly set up in tsconfig.json)
const cn = (...inputs: Array<string | undefined | null | Record<string, boolean>>): string => {
  return inputs
    .flat()
    .filter(x => x !== null && x !== undefined && typeof x !== 'boolean')
    .map(x => (typeof x === 'string' ? x : Object.entries(x as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k)))
    .flat()
    .join(' ');
};
