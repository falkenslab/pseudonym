/**
 * The theme's Mermaid component, with one change: the SVG is written into
 * the container on every render result instead of through
 * dangerouslySetInnerHTML. When a diagram is rendered again (the color mode
 * settles after hydration), mermaid.render() removes the old SVG because it
 * has the same id; if the new SVG is identical, React doesn't write it again
 * and the diagram is left empty.
 */
import React, { useLayoutEffect, useRef, type ReactNode } from "react";
import ErrorBoundary from "@docusaurus/ErrorBoundary";
import { ErrorBoundaryErrorMessageFallback } from "@docusaurus/theme-common";
import {
  MermaidContainerClassName,
  useMermaidRenderResult,
} from "@docusaurus/theme-mermaid/client";
import type { RenderResult } from "mermaid";
import styles from "./styles.module.css";

function MermaidRenderResult({ renderResult }: { renderResult: RenderResult }): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const div = ref.current;
    if (!div) return;
    div.innerHTML = renderResult.svg;
    renderResult.bindFunctions?.(div);
  }, [renderResult]);
  return <div ref={ref} className={`${MermaidContainerClassName} ${styles.container}`} />;
}

function MermaidRenderer({ value }: { value: string }): ReactNode {
  const renderResult = useMermaidRenderResult({ text: value });
  if (renderResult === null) return null;
  return <MermaidRenderResult renderResult={renderResult} />;
}

export default function Mermaid(props: { value: string }): ReactNode {
  return (
    <ErrorBoundary fallback={(params) => <ErrorBoundaryErrorMessageFallback {...params} />}>
      <MermaidRenderer {...props} />
    </ErrorBoundary>
  );
}
