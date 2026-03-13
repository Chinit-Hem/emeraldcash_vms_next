"use client";

import { useState } from "react";

import { GlassButton } from "@/app/components/ui/GlassButton";
import { GlassInput } from "@/app/components/ui/GlassInput";
import { cn, ui } from "@/lib/ui";

export function ThemeExamples() {
  const [value, setValue] = useState("");

  return (
    <section className="space-y-5">
      <article className={cn(ui.surface.card, "space-y-4 p-5")}> 
        <div>
          <h3 className={cn(ui.text.title, "text-base")}>Example Card</h3>
          <p className={cn(ui.text.subtitle, "mt-1 text-sm")}>Semantic-token driven surface and typography.</p>
        </div>

        <GlassInput
          label="Example Input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type to preview tokenized input"
        />

        <div className="flex flex-wrap gap-2">
          <GlassButton variant="primary">Primary Action</GlassButton>
          <GlassButton variant="danger">Danger Action</GlassButton>
          <GlassButton variant="secondary">Secondary Action</GlassButton>
        </div>
      </article>
    </section>
  );
}

export default ThemeExamples;
