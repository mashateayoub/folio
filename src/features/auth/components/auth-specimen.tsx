"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Code, FileText } from "@phosphor-icons/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function AuthSpecimen() {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 768px)",
        () => {
          gsap.fromTo(
            scope.current,
            { y: 6, scale: 0.995, filter: "blur(1.2px)" },
            {
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.8,
              ease: "expo.out",
              clearProps: "transform,filter",
              scrollTrigger: {
                trigger: scope.current,
                start: "top 95%",
                once: true,
              },
            },
          );
        },
      );

      return () => media.revert();
    },
    { scope },
  );

  return (
    <div
      className="auth-specimen"
      ref={scope}
      aria-label="Example LaTeX source and document preview"
    >
      <div className="specimen-source">
        <div className="specimen-toolbar">
          <Code size={14} />
          <span>main.tex</span>
          <ArrowUpRight size={13} />
        </div>
        <pre>
          <span className="syntax-command">{"\\documentclass"}</span>
          {"{article}\n\n"}
          <span className="syntax-command">{"\\title"}</span>
          {"{A little room\n  for big ideas}\n\n"}
          <span className="syntax-command">{"\\begin"}</span>
          {"{document}\n"}
          <span className="syntax-command">{"\\maketitle"}</span>
          {"\n\nEvery great paper starts\nwith a first sentence.\n\n"}
          <span className="syntax-command">{"\\end"}</span>
          {"{document}"}
        </pre>
        <span className="specimen-file-note">LaTeX source</span>
      </div>
      <div className="specimen-page">
        <div className="specimen-page-top">
          <FileText size={13} />
          <span>Document preview</span>
        </div>
        <div className="specimen-paper">
          <h3>
            A little room
            <br />
            for big ideas
          </h3>
          <p className="specimen-author">Your name</p>
          <h4>Abstract</h4>
          <p>
            Every great paper starts with a first sentence. This is your space
            to think, write, and bring your ideas into focus.
          </p>
          <h4>1 &nbsp; Introduction</h4>
          <p>
            With LaTeX, spend more time on what you want to say and less time on
            how it should look.
          </p>
          <div className="specimen-equation">
            e<sup>iπ</sup> + 1 = 0
          </div>
          <span className="specimen-page-number">1</span>
        </div>
      </div>
    </div>
  );
}
