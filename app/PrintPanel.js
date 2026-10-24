"use client";

import { useEffect, useRef, useState } from "react";
import * as model from "../lib/model.js";
import { THEMES } from "../lib/themes.js";

const LAYOUT_CHOICES = [
  { id: "une", label: "Tout sur une page" },
  { id: "chacun", label: "Une page par liste" },
  { id: "les-deux", label: "Les deux" },
];

function Segmented({ label, value, choices, onChange }) {
  return (
    <div className="setting">
      <span className="setting-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={choice.id === value}
            className={choice.id === value ? "on" : ""}
            onClick={() => onChange(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stepper({ label, value, max, onChange, zero }) {
  return (
    <div className="setting">
      <span className="setting-label">{label}</span>
      <div className="stepper">
        <button
          type="button"
          aria-label={`${label} : moins`}
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span aria-live="polite">{value === 0 && zero ? zero : value}</span>
        <button
          type="button"
          aria-label={`${label} : plus`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

// PDF settings, a live preview and the download button.
export default function PrintPanel({ doc, act, notify }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const urlRef = useRef(null);
  const pdf = doc.pdf;
  const setPdf = (patch) => act(model.updateDoc, { pdf: patch });

  // The preview is rebuilt shortly after each change.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { makePdf } = await import("../lib/pdf-browser.js");
        const blob = await makePdf(doc);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setPreview(url);
      } catch (error) {
        if (!cancelled) notify(`Aperçu impossible : ${error.message}`);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc, notify]);

  useEffect(
    () => () => urlRef.current && URL.revokeObjectURL(urlRef.current),
    [],
  );

  const download = async () => {
    setBusy(true);
    try {
      const { downloadPdf } = await import("../lib/pdf-browser.js");
      await downloadPdf(doc);
    } catch (error) {
      notify(`PDF impossible : ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="print-panel" aria-label="Impression">
      <div className="settings">
        <div className="setting">
          <span className="setting-label">Décor</span>
          <div className="themes" role="radiogroup" aria-label="Décor">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === doc.theme}
                className={t.id === doc.theme ? "on" : ""}
                style={{ "--chip": t.bg, "--chip-accent": t.accent }}
                onClick={() => act(model.updateDoc, { theme: t.id })}
              >
                <span className="swatch" aria-hidden="true">
                  {(t.flags || [t.ink, t.accent, t.soft])
                    .slice(0, 3)
                    .map((c) => (
                      <i key={c} style={{ background: c }} />
                    ))}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {doc.lists.length + (pdf.freeLines ? 1 : 0) > 1 && (
          <Segmented
            label="Mise en page"
            value={pdf.layout}
            choices={LAYOUT_CHOICES}
            onChange={(layout) => setPdf({ layout })}
          />
        )}
        <div className="setting-row">
          <Segmented
            label="Orientation"
            value={pdf.orientation}
            choices={[
              { id: "portrait", label: "Portrait" },
              { id: "paysage", label: "Paysage" },
            ]}
            onChange={(orientation) => setPdf({ orientation })}
          />
          <Segmented
            label="Cases"
            value={pdf.boxes}
            choices={[
              { id: "carrees", label: "☐ Carrées" },
              { id: "rondes", label: "◯ Rondes" },
            ]}
            onChange={(boxes) => setPdf({ boxes })}
          />
        </div>
        <div className="setting-row">
          <Stepper
            label={
              doc.lists.length > 1
                ? "Lignes libres pour chacun"
                : "Lignes libres en plus"
            }
            value={pdf.blankLines}
            max={model.MAX_BLANK_LINES}
            onChange={(blankLines) => setPdf({ blankLines })}
          />
          <Stepper
            label="Liste sans nom, à remplir"
            value={pdf.freeLines}
            max={model.MAX_FREE_LINES}
            zero="Non"
            onChange={(freeLines) => setPdf({ freeLines })}
          />
        </div>
      </div>

      <div className={`preview ${pdf.orientation}`}>
        {preview ? (
          <iframe
            src={`${preview}#toolbar=0&navpanes=0&view=Fit`}
            title="Aperçu du PDF"
          />
        ) : (
          <div className="preview-wait">Préparation de l’aperçu…</div>
        )}
      </div>

      <div className="print-actions">
        <button
          type="button"
          className="primary big"
          onClick={download}
          disabled={busy}
        >
          {busy ? "Préparation…" : "⬇ Télécharger le PDF"}
        </button>
        {preview && (
          <a className="button" href={preview} target="_blank" rel="noreferrer">
            Ouvrir pour imprimer
          </a>
        )}
      </div>
    </aside>
  );
}
