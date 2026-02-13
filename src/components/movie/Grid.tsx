import { ReactNode } from "react";

type MovieGridProps = {
  children: ReactNode;
};

export default function MovieGrid({ children }: MovieGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "16px", 
        marginTop: "16px",
      }}
    >
      {children}
    </div>
  );
}