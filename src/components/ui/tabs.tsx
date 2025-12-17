import * as React from "react";

type TabsProps = {
  defaultValue: string;
  children: React.ReactNode;
};

type TabsContextType = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextType | null>(null);

export function Tabs({ defaultValue, children }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex rounded-md border bg-muted p-1">{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  const active = ctx.value === value;
  return (
    <button
      className={`px-3 py-1.5 text-sm rounded-md ${active ? "bg-white shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}
      onClick={() => ctx.setValue(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = "" }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}