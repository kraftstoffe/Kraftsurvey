"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type SurveyQrCodeProps = {
  url: string;
  label?: string;
  filename?: string;
};

export function SurveyQrCode({
  url,
  label = "QR-Code",
  filename = "survey-qr.png",
}: SurveyQrCodeProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setDataUrl("");
    QRCode.toDataURL(url, {
      margin: 2,
      width: 200,
      color: { dark: "#8b5cf6", light: "#00000000" },
    })
      .then(setDataUrl)
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return <p className="text-sm text-[var(--text-muted)]">QR-Code konnte nicht erzeugt werden.</p>;
  }

  if (!dataUrl) {
    return <p className="text-sm text-[var(--text-muted)]">QR-Code wird erzeugt…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={dataUrl}
        alt={label}
        className="rounded-[var(--r-md)] border border-[var(--border-subtle)] bg-white p-2"
        width={200}
        height={200}
      />
      <a href={dataUrl} download={filename} className="btn-ghost text-xs">
        QR herunterladen
      </a>
    </div>
  );
}
